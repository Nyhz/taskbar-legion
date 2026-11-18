import manifestJson from '@/assets/audio/manifest.json';
import { allowed, limitsOf, MAX_VOICES, pickTake, type SoundEntry } from './soundRules';
import { loadSoundPrefs, saveSoundPrefs, type SoundChannel, type SoundPrefs } from './soundPrefs';

// The game's sound: one Web Audio graph (master → a gain per channel), the synthesised sounds of the pipeline
// (tools/assets/pipeline/audio → src/assets/audio), and the rules of soundRules. A side-effecting browser singleton,
// like platform/audio (the title music): the sim knows nothing of it; the strip and the interface call `playSound`.
//
// The context starts on the first gesture (browsers and the desktop webviews block audio before one); until then
// every call is a no-op. Buffers are fetched and decoded lazily, the first time a sound is asked for — the first
// play of each sound is skipped while it loads rather than played late.

const MANIFEST = manifestJson as unknown as Record<string, SoundEntry>;
/** Every MP3 of the pipeline, by its path under src/assets/audio ("sfx/hit_0.mp3" → its URL). */
const URLS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/audio/**/*.mp3', { eager: true, query: '?url', import: 'default' })).map(([path, url]) => [
    path.replace('../assets/audio/', ''),
    url as string,
  ]),
);

const AMBIENT_FADE_S = 2.5;
const DETUNE_CENTS = 25; // a little pitch spread per play, on top of the takes

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const channels = new Map<SoundChannel, GainNode>();
const buffers = new Map<string, AudioBuffer | 'loading' | 'failed'>();
const lastTake = new Map<string, number>();
const lastAt = new Map<string, number>();
const ringing = new Map<string, number>();
let voices = 0;
let prefs: SoundPrefs = loadSoundPrefs();
let lastUiMs = -1; // when an interface sound last played: a click that already made its own sound gets no plain click
let ambient: { id: string; source: AudioBufferSourceNode | null; element?: HTMLAudioElement; gain: GainNode } | null = null;
let wantedAmbient: string | null = null;
const listeners = new Set<() => void>();

function audioSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

function channelVolume(ch: SoundChannel): number {
  return prefs[ch];
}

function applyVolumes(): void {
  if (ctx === null || master === null) return;
  const now = ctx.currentTime;
  master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.master, now, 0.05);
  for (const [ch, g] of channels) g.gain.setTargetAtTime(channelVolume(ch), now, 0.05);
}

function start(): void {
  if (ctx !== null || !audioSupported()) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.connect(ctx.destination);
  for (const ch of ['sfx', 'ui', 'ambient'] as const) {
    const g = ctx.createGain();
    g.connect(master);
    channels.set(ch, g);
  }
  applyVolumes();
  preloadSounds();
  if (wantedAmbient !== null) setAmbience(wantedAmbient);
}

/** Arms the first-gesture start (call once at boot). Later gestures resume a context the system suspended. */
let started_ = false;

export function armSound(): void {
  if (started_) return; // once (React's strict mode runs boot effects twice)
  started_ = true;
  if (typeof window === 'undefined') return;
  const wake = (): void => {
    start();
    if (ctx !== null && ctx.state === 'suspended') void ctx.resume();
  };
  window.addEventListener('pointerdown', wake, { capture: true });
  window.addEventListener('keydown', wake, { capture: true });
  // Every button of the interface clicks — unless what it did made its own sound (equip, buy, a Cube recipe…).
  window.addEventListener(
    'click',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest('button, [role="button"], [role="tab"]') : null;
      if (el === null || (el instanceof HTMLButtonElement && el.disabled)) return;
      const at = performance.now();
      window.setTimeout(() => {
        if (lastUiMs < at) playSound('ui_click');
      }, 0);
    },
    { capture: true },
  );
}

function load(file: string): AudioBuffer | null {
  const have = buffers.get(file);
  if (have instanceof AudioBuffer) return have;
  if (have !== undefined || ctx === null) return null;
  const url = URLS[file];
  if (url === undefined) {
    buffers.set(file, 'failed');
    return null;
  }
  buffers.set(file, 'loading');
  const c = ctx;
  void fetch(url)
    .then((r) => r.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buf) => {
      buffers.set(file, buf);
      if (wantedAmbient !== null && MANIFEST[wantedAmbient]?.files.includes(file)) setAmbience(wantedAmbient);
    })
    .catch(() => {
      buffers.set(file, 'failed');
      if (wantedAmbient !== null && MANIFEST[wantedAmbient]?.files.includes(file)) setAmbience(wantedAmbient); // the <audio> fallback
    });
  return null;
}

/** Fetches every one-shot of the manifest ahead of need (they are small), so first plays are not skipped. */
export function preloadSounds(): void {
  if (ctx === null) return;
  for (const entry of Object.values(MANIFEST)) if (!entry.loop) for (const f of entry.files) load(f);
}

/** Plays a sound by its manifest id, if the rules allow it now. Unknown ids are ignored (a sound not made yet). */
export function playSound(id: string, opts: { gain?: number } = {}): void {
  if (ctx === null || prefs.muted) return;
  const entry = MANIFEST[id];
  if (entry === undefined || entry.loop || entry.files.length === 0) return;
  if (!allowed(id, entry.group, prefs.combat)) return;
  const limits = limitsOf(entry.group);
  const nowMs = ctx.currentTime * 1000;
  if (nowMs - (lastAt.get(id) ?? -1e9) < limits.gapMs) return;
  if ((ringing.get(id) ?? 0) >= limits.voices || voices >= MAX_VOICES) return;
  const take = pickTake(entry.files.length, lastTake.get(id), Math.random());
  const file = entry.files[take];
  const buf = file === undefined ? null : load(file);
  if (buf === null) return;
  const out = channels.get(entry.channel);
  if (out === undefined) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.detune.value = (Math.random() * 2 - 1) * DETUNE_CENTS;
  const g = ctx.createGain();
  g.gain.value = opts.gain ?? 1;
  src.connect(g).connect(out);
  lastTake.set(id, take);
  lastAt.set(id, nowMs);
  if (entry.channel === 'ui') lastUiMs = performance.now();
  ringing.set(id, (ringing.get(id) ?? 0) + 1);
  voices += 1;
  src.onended = () => {
    ringing.set(id, Math.max(0, (ringing.get(id) ?? 1) - 1));
    voices = Math.max(0, voices - 1);
    g.disconnect();
  };
  src.start();
}

/** The ambient bed to play (cross-faded from the one before); null for silence. Remembered until the context starts. */
export function setAmbience(id: string | null): void {
  wantedAmbient = id;
  if (ctx === null) return;
  if (ambient !== null && ambient.id === id && ambient.source !== null) return;
  if (ambient !== null && ambient.id === id && ambient.element !== undefined) return;
  const entry = id === null ? undefined : MANIFEST[id];
  const file = entry?.files[0];
  const buf = file === undefined ? null : load(file);
  const failed = file !== undefined && buffers.get(file) === 'failed';
  if (id !== null && buf === null && entry !== undefined && !failed) return; // loading: load() calls back here when it lands
  const now = ctx.currentTime;
  if (ambient !== null) {
    const old = ambient;
    old.gain.gain.setTargetAtTime(0, now, AMBIENT_FADE_S / 4);
    window.setTimeout(() => {
      old.source?.stop();
      old.element?.pause();
      old.gain.disconnect();
    }, AMBIENT_FADE_S * 1500);
    ambient = null;
  }
  if (id === null || entry === undefined) return;
  const out = channels.get('ambient');
  if (out === undefined) return;
  if (buf === null) {
    // The file would not fetch or decode (a webview's protocol): play it through an <audio> element instead, the way
    // the title music plays in every build, routed into the same ambient channel.
    const url = file === undefined ? undefined : URLS[file];
    if (url === undefined) return;
    const el = new Audio(url);
    el.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(1, now, AMBIENT_FADE_S / 4);
    ctx.createMediaElementSource(el).connect(g).connect(out);
    void el.play().catch(() => undefined);
    ambient = { id, source: null, element: el, gain: g };
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const points = entry.loopPoints?.[0];
  if (points !== undefined) {
    src.loopStart = points.start;
    src.loopEnd = points.start + points.length;
  }
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(1, now, AMBIENT_FADE_S / 4);
  src.connect(g).connect(out);
  src.start(now, points?.start ?? 0);
  ambient = { id, source: src, gain: g };
}

export function soundPrefs(): SoundPrefs {
  return prefs;
}

export function setSoundPrefs(change: Partial<SoundPrefs>): void {
  prefs = { ...prefs, ...change };
  saveSoundPrefs(prefs);
  applyVolumes();
  for (const fn of listeners) fn();
}

export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** For diagnosis (dev console, capture scripts): is the context running, and how many sounds loaded or failed. */
export function soundStatus(): { state: string; loaded: number; loading: number; failed: number; ambience: string | null } {
  const all = [...buffers.values()];
  return {
    state: ctx?.state ?? 'not started',
    loaded: all.filter((b) => b instanceof AudioBuffer).length,
    loading: all.filter((b) => b === 'loading').length,
    failed: all.filter((b) => b === 'failed').length,
    ambience: ambient?.id ?? null,
  };
}

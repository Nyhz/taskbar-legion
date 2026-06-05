// Title-screen audio. The game shipped with no audio system, so this is a tiny
// self-contained singleton: a looping music track (mute/volume toggle, persisted, started
// on the first user gesture since browsers and the Tauri webview block autoplay-with-sound)
// plus a one-shot UI click for the menu buttons.
//
// Platform layer, not sim/: this is a side-effecting browser singleton (audio + DOM
// listeners + localStorage), so it must stay out of the pure sim/data library.

import musicUrl from '@/assets/sounds/loading-screen.mp3';
import clickUrl from '@/assets/sounds/click.mpeg';

const STORE_KEY = 'taskbar-legion.audio.v1';
const DEFAULT_VOLUME = 0.5;

interface AudioPrefs {
  muted: boolean;
  volume: number;
}

let el: HTMLAudioElement | null = null;
let clickEl: HTMLAudioElement | null = null;
let available = true; // flips false once the source errors
let prefs: AudioPrefs = { muted: false, volume: DEFAULT_VOLUME };
let gestureArmed = false;
const listeners = new Set<() => void>();

// Same defensive feature-detect as settingsShim — some node runtimes expose a partial
// localStorage where the methods aren't functions.
function hasLocalStorage(): boolean {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

function loadPrefs(): AudioPrefs {
  if (!hasLocalStorage()) return { muted: false, volume: DEFAULT_VOLUME };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw === null) return { muted: false, volume: DEFAULT_VOLUME };
    const p = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      muted: p.muted === true,
      volume: typeof p.volume === 'number' ? Math.min(1, Math.max(0, p.volume)) : DEFAULT_VOLUME,
    };
  } catch {
    return { muted: false, volume: DEFAULT_VOLUME };
  }
}

function savePrefs(): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  } catch {
    // private mode / quota — the toggle just won't be remembered
  }
}

function notify(): void {
  for (const fn of listeners) fn();
}

function tryPlay(): void {
  if (el === null || !available || prefs.muted) return;
  el.play().catch(() => {
    // autoplay still blocked, or no source — a gesture (armGestureUnlock) will retry
  });
}

/** Create the audio element (idempotent) and attempt playback. */
export function initTitleMusic(): void {
  if (typeof Audio === 'undefined') return; // node / SSR guard
  prefs = loadPrefs();
  if (el === null) {
    el = new Audio(musicUrl);
    el.loop = true;
    el.preload = 'auto';
    el.addEventListener('error', () => {
      available = false;
      notify();
    });
  }
  el.volume = prefs.volume;
  el.muted = prefs.muted;
  tryPlay();
}

/** One-shot UI click for the menu buttons. Triggered from a real click (a user gesture),
 *  so it's always allowed to play; rewinds so rapid presses retrigger. */
export function playClick(): void {
  if (typeof Audio === 'undefined') return;
  if (clickEl === null) clickEl = new Audio(clickUrl);
  try {
    clickEl.currentTime = 0;
  } catch {
    // not seekable yet — harmless
  }
  clickEl.play().catch(() => {
    // blocked or not ready — ignore
  });
}

/** First pointer/keyboard interaction anywhere unlocks playback (autoplay policy). */
export function armGestureUnlock(): void {
  if (gestureArmed || typeof window === 'undefined') return;
  gestureArmed = true;
  const unlock = (): void => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    gestureArmed = false;
    tryPlay();
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function isMusicMuted(): boolean {
  return prefs.muted;
}

/** True only when a real track is loaded — lets the UI hide the mute control if absent. */
export function isMusicAvailable(): boolean {
  return available;
}

export function setMuted(muted: boolean): void {
  prefs = { ...prefs, muted };
  savePrefs();
  if (el !== null) el.muted = muted;
  if (muted) el?.pause();
  else tryPlay();
  notify();
}

export function toggleMute(): void {
  setMuted(!prefs.muted);
}

export function setVolume(volume: number): void {
  prefs = { ...prefs, volume: Math.min(1, Math.max(0, volume)) };
  savePrefs();
  if (el !== null) el.volume = prefs.volume;
  notify();
}

/** Pause + rewind immediately. */
export function stopMusic(): void {
  if (el === null) return;
  el.pause();
  try {
    el.currentTime = 0;
  } catch {
    // not yet seekable — harmless
  }
  el.volume = prefs.volume; // restore for any later replay
}

let fadeTimer: number | undefined;

/** Ramp the music volume to 0 over `durationMs`, then stop. Used when leaving the title for
 *  the game so the track bows out smoothly instead of cutting off. */
export function fadeOutMusic(durationMs = 700): void {
  if (el === null || typeof window === 'undefined') {
    stopMusic();
    return;
  }
  if (fadeTimer !== undefined) window.clearInterval(fadeTimer);
  const stepMs = 40;
  const from = el.volume;
  if (from <= 0) {
    stopMusic();
    return;
  }
  const dec = (from * stepMs) / durationMs;
  fadeTimer = window.setInterval(() => {
    if (el === null) {
      if (fadeTimer !== undefined) window.clearInterval(fadeTimer);
      return;
    }
    const v = el.volume - dec;
    if (v <= 0) {
      if (fadeTimer !== undefined) window.clearInterval(fadeTimer);
      fadeTimer = undefined;
      stopMusic(); // pause + rewind + restore volume
    } else {
      el.volume = v;
    }
  }, stepMs);
}

/** Subscribe to mute/availability changes (for the toggle button). Returns an unsubscribe. */
export function subscribeAudio(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

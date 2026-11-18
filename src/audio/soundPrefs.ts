// The player's sound settings: a volume per channel, a master mute, and when combat sounds play. Device-local
// (localStorage), like the other interface preferences — a sound setting belongs to the machine, not the save.
//
// Defaults (user, 2026-11-18, «bajo y escaso»): the game plays all day behind other work, so the ambience is very
// low, the big moments always sound, and the sounds of every blow only play while the player is looking — a panel
// open or the pointer over the strip ('attention').

export type CombatSounds = 'attention' | 'always' | 'off';
export type SoundChannel = 'sfx' | 'ui' | 'ambient';

export interface SoundPrefs {
  muted: boolean;
  master: number;
  sfx: number;
  ui: number;
  ambient: number;
  combat: CombatSounds;
}

export const DEFAULT_SOUND_PREFS: SoundPrefs = {
  muted: false,
  master: 0.7,
  sfx: 0.8,
  ui: 0.7,
  ambient: 0.5,
  combat: 'attention',
};

const KEY = 'taskbar-legion.sound.v1';

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && typeof localStorage.setItem === 'function';
}

const unit = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);

/** Reads stored settings, keeping only valid fields (anything missing or broken falls back to its default). */
export function parseSoundPrefs(raw: unknown): SoundPrefs {
  const d = DEFAULT_SOUND_PREFS;
  if (typeof raw !== 'object' || raw === null) return { ...d };
  const p = raw as Partial<Record<keyof SoundPrefs, unknown>>;
  const combat = p.combat === 'always' || p.combat === 'off' || p.combat === 'attention' ? p.combat : d.combat;
  return {
    muted: p.muted === true,
    master: unit(p.master, d.master),
    sfx: unit(p.sfx, d.sfx),
    ui: unit(p.ui, d.ui),
    ambient: unit(p.ambient, d.ambient),
    combat,
  };
}

export function loadSoundPrefs(): SoundPrefs {
  if (!hasLocalStorage()) return { ...DEFAULT_SOUND_PREFS };
  try {
    const raw = localStorage.getItem(KEY);
    return parseSoundPrefs(raw === null ? null : JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SOUND_PREFS };
  }
}

export function saveSoundPrefs(prefs: SoundPrefs): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // private mode / quota: the setting just isn't remembered
  }
}

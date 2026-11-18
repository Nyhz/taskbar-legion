import type { SoundChannel } from './soundPrefs';

// When a sound may play — pure rules, unit-tested. A wave of twenty enemies trades dozens of blows a second: without
// these the strip would be a wall of noise. Each sound has a minimum gap between two plays of itself and a cap on
// how many of it ring at once; the whole mix has a cap too. Combat and ability sounds follow the player's
// "sounds of every blow" switch; the big moments, the interface and the ambience always play.

/** What the manifest says of a sound (src/assets/audio/manifest.json, written by the pipeline). */
export interface SoundEntry {
  channel: SoundChannel;
  group: string;
  files: string[];
  loop: boolean;
  loopPoints?: { start: number; length: number }[];
}

/** Groups whose sounds come with every blow: they follow the combat-sounds setting. */
const BLOW_GROUPS = new Set(['combat', 'ability']);
/** Combat sounds that are moments, not blows: they always play. */
const ALWAYS = new Set(['hero_down', 'elite_arrive']);

export const MAX_VOICES = 12;

export interface Limits {
  gapMs: number;
  voices: number;
}

export function limitsOf(group: string): Limits {
  if (group === 'combat') return { gapMs: 45, voices: 3 };
  if (group === 'ability') return { gapMs: 90, voices: 2 };
  if (group === 'interface' || group === 'cube') return { gapMs: 30, voices: 2 };
  return { gapMs: 120, voices: 2 };
}

/** May a sound of `group` play, given the "sounds of every blow" switch? */
export function allowed(id: string, group: string, combat: boolean): boolean {
  return combat || !BLOW_GROUPS.has(group) || ALWAYS.has(id);
}

/** Which take to play: random, but never the one just played when there are others (no machine-gun repeats). */
export function pickTake(count: number, last: number | undefined, roll: number): number {
  if (count <= 1) return 0;
  if (last === undefined) return Math.min(count - 1, Math.floor(roll * count));
  const k = Math.min(count - 2, Math.floor(roll * (count - 1)));
  return k >= last ? k + 1 : k;
}

/** The ambience of a stage: its world's bed, or that world's Torment version (global stages 401–500). */
export function ambienceOf(stage: number): string {
  const s = Math.max(1, stage);
  const world = Math.floor(((s - 1) % 100) / 10) + 1;
  return s > 400 ? `amb_w${world}_torment` : `amb_w${world}`;
}

import file from '@/assets/strip/fx/fx.json';

// The strip's ability EFFECTS as data (no Pixi here — pure, unit-tested): where each effect's frames are in the
// atlas and how they play, and which whole-figure skins exist. Written by the asset pipeline
// (`sh tools/assets/run.sh export-fx` → src/assets/strip/fx/fx.json). Like the figures, effects are drawn 1 art
// pixel = 1 strip pixel, never scaled.

export interface FxMeta {
  /** Top-left of the effect's first frame in the atlas; frame i is at (x + (i % cols)·w, y + floor(i / cols)·h). */
  x: number;
  y: number;
  /** Cell size, in art pixels. */
  w: number;
  h: number;
  cols: number;
  /** The point of a cell that sits on the effect's attach point (a body's centre on the ground line, mostly). */
  ax: number;
  ay: number;
  n: number;
  /** How long each frame is held, in ms. */
  ms: number[];
  loop: boolean;
}

interface FxFile {
  fx: Record<string, FxMeta>;
  /** Skin name → the heroes that have it (their atlas is `skin_<hero>_<skin>.png`, laid out like the hero's own).
   *  RIMS are listed here too: sheets of the same layout that hold only a line of light round each frame's figure. */
  skins: Record<string, string[]>;
}

const DATA = file as unknown as FxFile;

export function fxMeta(key: string): FxMeta | undefined {
  return DATA.fx[key];
}

export const FX_KEYS: readonly string[] = Object.keys(DATA.fx);

/** True when `hero` has the whole-figure skin `skin`. */
export function hasSkin(hero: string, skin: string): boolean {
  return DATA.skins[skin]?.includes(hero) === true;
}

export const SKIN_NAMES: readonly string[] = Object.keys(DATA.skins);

export function fxTotalMs(meta: FxMeta): number {
  let total = 0;
  for (const ms of meta.ms) total += ms;
  return total;
}

/** The frame an effect shows `elapsedMs` after it started: a loop wraps; a one-shot that has played out is −1. */
export function fxFrameAt(meta: FxMeta, elapsedMs: number): number {
  const total = fxTotalMs(meta);
  if (total <= 0 || meta.n <= 0) return -1;
  let t = Math.max(0, elapsedMs);
  if (meta.loop) t %= total;
  else if (t >= total) return -1;
  for (let i = 0; i < meta.n; i++) {
    t -= meta.ms[i] ?? 0;
    if (t < 0) return i;
  }
  return meta.n - 1;
}

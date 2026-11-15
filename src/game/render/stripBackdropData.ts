import type { DifficultyKey } from '@/data/difficulties';
import file from '@/assets/strip/backdrops.json';

// The battle strip's backdrops as data (no Pixi here — pure, unit-tested): which art a world shows, how its
// parallax layers move and which real-time effects its grade runs. The file is written by the asset pipeline
// (`sh tools/assets/run.sh export-strip` → src/assets/strip/backdrops.json) from the same sources as the lab page,
// whose strip is the reference for how all of this moves.

export type BackdropGrade = 'normal' | 'torment';

export interface BackdropLayer {
  name: string;
  /** How fast the layer scrolls relative to the ground (0 = the sky, 1 = the ground, above 1 = in front). */
  factor: number;
  /** Clouds and mist also move on their own, even while the party stands still. */
  drift: boolean;
}

export interface LightningFx {
  fx: 'lightning';
  every: [number, number];
  flash: string;
  alpha: number;
  bolt?: string;
  x?: [number, number];
  y?: [number, number];
  shake?: number;
}
export interface ParticlesFx {
  fx: 'particles';
  count: number;
  color: string | string[];
  vx: number;
  vy: number;
  len?: number;
  size?: number;
  sway?: number;
  alpha?: number;
  ymax?: number;
  front?: boolean;
}
export interface EyesFx {
  fx: 'eyes';
  every: [number, number];
  hold: number;
  color: string;
  zones: [number, number, number, number][];
  max?: number;
  size?: number;
  gap?: number;
}
export interface PulseFx {
  fx: 'pulse';
  color: string;
  period: number;
  alpha: number;
}
export interface FlickerFx {
  fx: 'flicker';
  every: [number, number];
  dur: number;
  color: string;
  alpha: number;
}
export type AtmosphereFx = LightningFx | ParticlesFx | EyesFx | PulseFx | FlickerFx;

export interface BackdropWorld {
  layers: BackdropLayer[];
  atmosphere: Record<BackdropGrade, AtmosphereFx[]>;
}

interface BackdropFile {
  width: number;
  height: number;
  pathY: number;
  grades: BackdropGrade[];
  worlds: Record<string, BackdropWorld>;
}

// The pipeline validates every effect's kind and fields before writing the file (a typo fails the export).
const DATA = file as unknown as BackdropFile;

/** The strip's art size and the line the fighters stand on, in art pixels. */
export const STRIP_ART_WIDTH = DATA.width;
export const STRIP_ART_HEIGHT = DATA.height;
export const STRIP_PATH_Y = DATA.pathY;

export const BACKDROP_KEYS: readonly string[] = Object.keys(DATA.worlds).sort();
export const BACKDROP_GRADES: readonly BackdropGrade[] = DATA.grades;

/** Art key of a world of a difficulty (1..10 → "w01".."w10"); anything out of range wraps onto the ten. */
export function backdropKeyFor(worldInDifficulty: number): string {
  const n = BACKDROP_KEYS.length;
  const i = (((Math.floor(worldInDifficulty) - 1) % n) + n) % n;
  return BACKDROP_KEYS[i] ?? 'w01';
}

/** Which grade of the art a difficulty shows. Only Normal and Torment are drawn: the three difficulties in
 *  between borrow Normal until they get art of their own (PROVISIONAL). */
export function backdropGradeFor(difficulty: DifficultyKey): BackdropGrade {
  return difficulty === 'torment' ? 'torment' : 'normal';
}

export function backdropWorld(key: string): BackdropWorld | undefined {
  return DATA.worlds[key];
}

/** Pixels per millisecond a drifting layer moves on its own (the lab's figure: 2 px a second). */
export const DRIFT_PX_PER_MS = 0.002;

/** How far a layer's tile is shifted left, in whole pixels within [0, width): the ground scroll times the
 *  layer's factor, plus its own drift. The layer is drawn at −offset and again at width − offset. */
export function layerOffset(layer: BackdropLayer, scrollPx: number, clockMs: number, width: number = STRIP_ART_WIDTH): number {
  const raw = scrollPx * layer.factor + (layer.drift ? clockMs * DRIFT_PX_PER_MS : 0);
  return Math.floor(((raw % width) + width) % width);
}

/** How bright a lightning strike is, `ms` after it lands: a hard flash, a gap, a second flash that dies away. */
export function strikeLevel(ms: number): number {
  if (ms < 0) return 0;
  if (ms < 70) return 1;
  if (ms < 120) return 0.2;
  if (ms < 200) return 0.8;
  if (ms < 460) return 0.5 * (1 - (ms - 200) / 260);
  return 0;
}

/** The pixels of a 1-px line from (x0, y0) to (x1, y1) (Bresenham), for bolts and rain streaks. */
export function pixelLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  let ax = Math.round(x0);
  let ay = Math.round(y0);
  const bx = Math.round(x1);
  const by = Math.round(y1);
  const dx = Math.abs(bx - ax);
  const dy = -Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx + dy;
  const out: [number, number][] = [];
  for (let guard = 0; guard < 900; guard++) {
    out.push([ax, ay]);
    if (ax === bx && ay === by) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      ax += sx;
    }
    if (e2 <= dx) {
      err += dx;
      ay += sy;
    }
  }
  return out;
}

/** "#rrggbb" → 0xrrggbb. */
export function colorNum(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

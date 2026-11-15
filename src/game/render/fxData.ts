import file from '@/assets/strip/fx/fx.json';

// The strip's ability EFFECTS as data (no Pixi here — pure, unit-tested): where each effect's frames are in the
// atlas and how they play, and which whole-figure skins exist. Written by the asset pipeline
// (`sh tools/assets/run.sh export-fx` → src/assets/strip/fx/fx.json). Like the figures, effects are drawn 1 art
// pixel = 1 strip pixel, never scaled.

export interface FxMeta {
  /** The page of the atlas it is on (`fx_<page>.png`: the atlas is written in pages no GPU finds too big). */
  page: number;
  /** Top-left of the effect's first frame in its page; frame i is at (x + (i % cols)·w, y + floor(i / cols)·h). */
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
  /** How many pages the effects' atlas has. */
  pages: number;
  fx: Record<string, FxMeta>;
  /** Skin name → the heroes that have it (their atlas is `skin_<hero>_<skin>.png`, laid out like the hero's own).
   *  RIMS are listed here too: sheets of the same layout that hold only a line of light round each frame's figure. */
  skins: Record<string, string[]>;
  /** Figure → its own panes, LIT (the Unmaker's six mirrors): an atlas `panes_<figure>.png` of equal cells. */
  panes?: Record<string, PaneSheetMeta>;
}

/** Where pane j goes on frame f of a clip: the cell's top-left and the pane's middle, in art pixels from the
 *  figure's root on the ground, the figure facing right; null when nothing of that pane shows on that frame. */
export type PanePlace = readonly [dx: number, dy: number, cx: number, cy: number] | null;

export interface PaneSheetMeta {
  /** Cell size and cells per row; pane j on frame f of a clip is cell `first + f·6 + j`. */
  w: number;
  h: number;
  cols: number;
  anims: Record<string, { first: number; frames: PanePlace[][] }>;
}

/** The lit panes of a figure, or undefined when it has none. */
export function paneSheetMeta(figure: string): PaneSheetMeta | undefined {
  return DATA.panes?.[figure];
}

/** Which cell holds pane `pane` on frame `frame` of `clip`, and where it goes; undefined when it does not show. */
export function panePlace(meta: PaneSheetMeta, clip: string, frame: number, pane: number): { cell: number; at: NonNullable<PanePlace> } | undefined {
  const anim = meta.anims[clip];
  const at = anim?.frames[frame]?.[pane];
  if (anim === undefined || at === undefined || at === null) return undefined;
  return { cell: anim.first + frame * 6 + pane, at };
}

const DATA = file as unknown as FxFile;

export function fxMeta(key: string): FxMeta | undefined {
  return DATA.fx[key];
}

export const FX_KEYS: readonly string[] = Object.keys(DATA.fx);

/** How many pages the effects' atlas is written in (`fx_0.png` … `fx_<n−1>.png`). */
export const FX_PAGES: number = DATA.pages;

/** True when `hero` has the whole-figure skin `skin`. */
export function hasSkin(hero: string, skin: string): boolean {
  return DATA.skins[skin]?.includes(hero) === true;
}

export const SKIN_NAMES: readonly string[] = Object.keys(DATA.skins);

/** The figures that have lit panes of their own. */
export const PANE_FIGURES: readonly string[] = Object.keys(DATA.panes ?? {});

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

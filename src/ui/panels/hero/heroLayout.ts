import {
  HERO_ART_WIDTH,
  PANEL_COLS,
  PLACES_ART,
  WINDOW_FRAME_ART,
  WINDOW_SHADOW_ART,
  CELL_PITCH_ART,
  gridArtHeight,
} from '../panelLayout';

// The hero window's layout, in art pixels: the doll block (gear · niche · gear · name, the ten quick stats,
// experience and item level), the kit row (ultimate, two abilities, two presets) and the bag under them — eleven
// cells across, as many rows as fit above the strip (the rest in pages). Pure: the panel layer fits the scale
// with it and the bag lays itself out.

/** The doll block: five 24 px gear slots tall. */
export const DOLL_ART_HEIGHT = 5 * CELL_PITCH_ART - 2; // 128
/** The row of the ultimate, the abilities and the presets (an ultimate's octagon is 30 tall). */
export const KIT_ROW_ART_HEIGHT = 30;
/** The bag's head row (count, pages, sort, gems out) and the gap to its grid. */
export const BAG_HEAD_ART_HEIGHT = 18 + 3;
const ROW_GAP_ART = 4;

export const BAG_COLS = PANEL_COLS;
export const BAG_MIN_ROWS = 2;
export const BAG_MAX_ROWS = 5;

/** Everything in the window but the bag's rows. */
const BASE_HEIGHT_ART =
  PLACES_ART +
  WINDOW_FRAME_ART +
  DOLL_ART_HEIGHT +
  ROW_GAP_ART +
  KIT_ROW_ART_HEIGHT +
  ROW_GAP_ART +
  BAG_HEAD_ART_HEIGHT;

/** The window's box with `rows` rows of bag (its drop shadow included). */
export function heroWindowArt(rows: number = BAG_MIN_ROWS): { width: number; height: number } {
  return { width: HERO_ART_WIDTH, height: BASE_HEIGHT_ART + gridArtHeight(rows) + WINDOW_SHADOW_ART };
}

/** Rows of the bag that fit `availArtHeight` (the room above the strip), between BAG_MIN_ROWS and BAG_MAX_ROWS. */
export function bagRows(availArtHeight: number): number {
  let rows = BAG_MAX_ROWS;
  while (rows > BAG_MIN_ROWS && heroWindowArt(rows).height > availArtHeight) rows--;
  return rows;
}

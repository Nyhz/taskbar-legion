import { STASH_MAX_SLOTS, STASH_PER_PAGE } from '@/data/inventory';
import { SLOTS, type SlotCategory } from '@/data/itemSlots';
import { isGem, isItem } from '@/sim/items';
import type { Slots } from '@/sim/slots';
import {
  WINDOW_FRAME_ART,
  WINDOW_SHADOW_ART,
  WING_ART_WIDTH,
  WING_COLS,
  gridArtHeight,
} from '../panelLayout';

// The stash window's layout and its filter lens. Pure (no React, no store): unit-tested.

/** What the grid shows: everything in place, or a compacted lens onto one kind. */
export type StashFilter = 'all' | SlotCategory | 'gems';

export const STASH_FILTERS: readonly StashFilter[] = ['all', 'armor', 'weapon', 'jewelry', 'gems'];

/** The entries the grid pages over. "all" keeps the sparse layout (holes stay empty cells, so positions are
 *  fixed and a cell's index IS its stash index); a category is a lens that compacts to matching gear, and
 *  "gems" a lens onto loose gems (which have no gear category). */
export function stashLens(stash: Slots, filter: StashFilter): Slots {
  if (filter === 'all') return stash;
  if (filter === 'gems') return stash.filter((e) => e !== null && isGem(e));
  return stash.filter((e) => e !== null && isItem(e) && SLOTS[e.slot].category === filter);
}

/** Columns of the grid: the wing's width, six cells edge to edge. It grows in ROWS as slots are bought. */
export const STASH_COLS = WING_COLS;

/** Rows for a page of `perPage` slots: 5 for the base 30 (no ragged row), 9 with every slot bought. */
export function stashRows(perPage: number): number {
  return Math.max(1, Math.ceil(perPage / STASH_COLS));
}

/** With more owned pages than this the footer turns them with a stepper ("‹ 5 / 8 ›") instead of listing every
 *  number: the footer is one line of a six-cell wing. */
export const STASH_PAGES_LISTED = 4;

// Art-pixel measures of the pieces the window is made of (kit.css, stash.css): the head line (title and count),
// the line of filters under it, the gap to the grid, and the footer line (a 20 px key) with the gap above it.
const HEAD = 20;
const FILTERS = 20;
const GRID_TOP = 3;
const FOOT = 3 + 20;

/** The window's box in art pixels for a page of `perPage` slots (its drop shadow included). */
export function stashWindowArt(perPage: number): { width: number; height: number } {
  return {
    width: WING_ART_WIDTH,
    height:
      WINDOW_FRAME_ART +
      HEAD +
      FILTERS +
      GRID_TOP +
      gridArtHeight(stashRows(perPage)) +
      FOOT +
      WINDOW_SHADOW_ART,
  };
}

/** The box in its tallest state (every slot per page bought): what the panel layer fits the scale to. */
export function stashWindowArtMax(): { width: number; height: number } {
  return stashWindowArt(STASH_PER_PAGE + STASH_MAX_SLOTS);
}

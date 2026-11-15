// The measures every panel is built on, in ART pixels. Pure (no React, no store): the panel layer fits the scale
// with them and the tests check them against the screens the game must fit (state/pixelScale TARGET_SCREENS).
//
// The hero window is the main panel: fixed, centred over the strip, eleven item cells across. An auxiliary panel
// (a WING) opens glued to its left or right edge, one per side. Every wing has the SAME WIDTH — six item cells of
// content: NARROW and as TALL as it needs ("las pestañas laterales deberían ser más estrechas y más altas"). So
// the widest the constellation can ever be is known (hero + a wing each side + the bookmarks hanging off the
// outer edges) and it fits every target screen at the strip's own scale; only heights vary, up to
// WING_MAX_ART_HEIGHT.

/** An item cell (kit `Slot`): 24 px, 2 px apart. */
export const CELL_ART = 24;
export const CELL_GAP_ART = 2;
export const CELL_PITCH_ART = CELL_ART + CELL_GAP_ART;

/** Cells across the hero window's content: the bag fills it edge to edge. */
export const PANEL_COLS = 11;
/** Width of the hero window's content. */
export const PANEL_CONTENT_ART = PANEL_COLS * CELL_PITCH_ART - CELL_GAP_ART; // 284
/** What the kit `Window` adds around its content, each way (7 px a side). */
export const WINDOW_FRAME_ART = 14;
/** The window's drop shadow (right and down): not layout, but it must stay on screen. */
export const WINDOW_SHADOW_ART = 2;
/** The hero window's places stick this far out of its top edge. */
export const PLACES_ART = 16;
/** Launcher bookmarks hang this far outside the outer edge of the hero window or of an open wing. */
export const TABS_ART = 19;

/** Width of the hero window (frame included). */
export const PANEL_ART_WIDTH = PANEL_CONTENT_ART + WINDOW_FRAME_ART; // 298
export const HERO_ART_WIDTH = PANEL_ART_WIDTH;

/** Cells across a WING's content: the one number every side panel's width comes from. */
export const WING_COLS = 6;
/** Width of a wing's content, and of the wing with its frame: the SAME for every wing. */
export const WING_CONTENT_ART = WING_COLS * CELL_PITCH_ART - CELL_GAP_ART; // 154
export const WING_ART_WIDTH = WING_CONTENT_ART + WINDOW_FRAME_ART; // 168
/** The tallest a wing may be (frame and shadow included): the room above the strip on the tightest target, a
 *  1920×1080 screen at ×2 inside the Tauri window ((1000 − 364 − 8) / 2). */
export const WING_MAX_ART_HEIGHT = 314;

/** The widest the panels can be: the hero, a wing on each side, the bookmarks outside both, the shadow. */
export const CONSTELLATION_ART_WIDTH = HERO_ART_WIDTH + 2 * WING_ART_WIDTH + 2 * TABS_ART + WINDOW_SHADOW_ART; // 674

/** Height of a grid of `rows` rows of cells. */
export function gridArtHeight(rows: number): number {
  return Math.max(0, rows * CELL_PITCH_ART - CELL_GAP_ART);
}

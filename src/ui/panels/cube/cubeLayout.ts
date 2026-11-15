import {
  CELL_PITCH_ART,
  WINDOW_FRAME_ART,
  WINDOW_SHADOW_ART,
  WING_ART_WIDTH,
  WING_COLS,
} from '../panelLayout';

// The Cube wing's layout in art pixels. Pure. Every wing is WING_ART_WIDTH wide and at most WING_MAX_ART_HEIGHT
// tall; the Cube's tallest state is the synthesis recipe with a full picker.

/** The picker under the Cube: the wing's six cells across, three rows a page. */
export const PICK_COLS = WING_COLS;
export const PICK_ROWS = 3;
export const PICK_PER_PAGE = PICK_COLS * PICK_ROWS;

// Rows of the synthesis recipe, top to bottom (see cube.css): the name (22, pulled 2 up), the three recipes (20),
// the equation (16), the Cube's face (3 px + three cells), the keys (4 + 20), the stash toggle (18), the rule
// (5 + 5 + 4), the picker's head (16) and its three rows (2 px + three cells).
const CONTENT_ART =
  20 +
  20 +
  16 +
  (3 + 3 * CELL_PITCH_ART - 2) +
  (4 + 20) +
  18 +
  14 +
  16 +
  (2 + PICK_ROWS * CELL_PITCH_ART - 2);

/** The wing's box in its tallest state (frame and shadow included). */
export const CUBE_WING_ART = {
  width: WING_ART_WIDTH,
  height: CONTENT_ART + WINDOW_FRAME_ART + WINDOW_SHADOW_ART,
};

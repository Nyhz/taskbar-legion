import { CLASS_KEYS } from '@/data/classes';
import { talentTree } from '@/data/talents';
import { WINDOW_FRAME_ART, WINDOW_SHADOW_ART, WING_ART_WIDTH } from '../panelLayout';
import { layoutTalentTree } from './talentsLayout';
import { SHEET_ACCOUNT_ART_HEIGHT, SHEET_MAX_STAT_ROWS, SHEET_STAT_ROW_ART } from './sheetLayout';

// The boxes of the talents and sheet wings, in art pixels (drop shadow included). Pure. Both are WING_ART_WIDTH
// wide like every wing; only their heights differ.

/** Talents: the head line (20), the line of the active abilities and the points (TALENTS_LINE_ART), a gap
 *  (TALENTS_TREE_GAP_ART), then the tree (the tallest of the classes). */
export const TALENTS_LINE_ART = 14;
export const TALENTS_TREE_GAP_ART = 1;
export const TALENTS_CONTENT_ART_HEIGHT =
  20 + TALENTS_LINE_ART + TALENTS_TREE_GAP_ART + Math.max(...CLASS_KEYS.map((c) => layoutTalentTree(talentTree(c)).height));
export const TALENTS_WING_ART = {
  width: WING_ART_WIDTH,
  height: WINDOW_FRAME_ART + TALENTS_CONTENT_ART_HEIGHT + WINDOW_SHADOW_ART,
};

/** Sheet: the head line (20), a gap (4), the two columns of stats, a rule (10), the account figures. */
export const SHEET_CONTENT_ART_HEIGHT =
  20 + 4 + SHEET_MAX_STAT_ROWS * SHEET_STAT_ROW_ART + 10 + SHEET_ACCOUNT_ART_HEIGHT;
export const SHEET_WING_ART = {
  width: WING_ART_WIDTH,
  height: WINDOW_FRAME_ART + SHEET_CONTENT_ART_HEIGHT + WINDOW_SHADOW_ART,
};

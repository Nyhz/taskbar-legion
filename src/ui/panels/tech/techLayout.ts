import { TECH_NODES, type TechNode } from '@/data/techTree';
import { WINDOW_FRAME_ART, WINDOW_SHADOW_ART, WING_ART_WIDTH, WING_CONTENT_ART } from '../panelLayout';

// The upgrades wing's layout, in art pixels. Pure. The twelve upgrades stand in rows of three — a group per row,
// its sign in a slim gutter on the left — so the wing is narrow and tall like every wing: 16 (gutter) + 3 × 46.

/** The groups the upgrades are shown in (presentation only: the data has three categories; the chests one is
 *  split into what makes chests drop and where they are kept). */
export type TechGroupKey = 'economy' | 'drops' | 'storage' | 'utility';

export const TECH_GROUP_ORDER: readonly TechGroupKey[] = ['economy', 'drops', 'storage', 'utility'];

export function techGroupOf(node: TechNode): TechGroupKey {
  if (node.category === 'Economy') return 'economy';
  if (node.category === 'Utility') return 'utility';
  return node.effects.some((e) => e.kind === 'chestStorage') ? 'storage' : 'drops';
}

/** Every upgrade of the data, grouped in display order. A group with nothing in it is left out. */
export function techGroups(
  nodes: readonly TechNode[] = TECH_NODES,
): { key: TechGroupKey; nodes: TechNode[] }[] {
  return TECH_GROUP_ORDER.map((key) => ({ key, nodes: nodes.filter((n) => techGroupOf(n) === key) })).filter(
    (g) => g.nodes.length > 0,
  );
}

export const TECH_COLS = 3;
export const TECH_GUTTER_ART = 16; // the group's sign
export const TECH_NODE_ART_WIDTH = 46;
/** One upgrade: the seal (34), its figure (1 + 10), the price key (2 + 16). */
export const TECH_NODE_ART_HEIGHT = 34 + 11 + 18;
export const TECH_ROW_GAP_ART = 4;
const HEAD_ART = 20; // the head line (title and purse)
const HEAD_GAP_ART = 4;

/** Rows of upgrades the wing shows: a group of more than three wraps onto another row. */
export function techRowCount(nodes: readonly TechNode[] = TECH_NODES): number {
  return techGroups(nodes).reduce((rows, g) => rows + Math.ceil(g.nodes.length / TECH_COLS), 0);
}

export const TECH_GRID_ART_WIDTH = TECH_GUTTER_ART + TECH_COLS * TECH_NODE_ART_WIDTH; // 154 = WING_CONTENT_ART

export function techContentArtHeight(rows: number = techRowCount()): number {
  return HEAD_ART + HEAD_GAP_ART + rows * TECH_NODE_ART_HEIGHT + Math.max(0, rows - 1) * TECH_ROW_GAP_ART;
}

/** The wing's box (frame and shadow included). It never changes: every upgrade is always shown. */
export const TECH_WING_ART = {
  width: WING_ART_WIDTH,
  height: WINDOW_FRAME_ART + techContentArtHeight() + WINDOW_SHADOW_ART,
};

/** True while the grid fills the wing's content edge to edge (a check for the tests). */
export const TECH_GRID_FITS = TECH_GRID_ART_WIDTH === WING_CONTENT_ART;

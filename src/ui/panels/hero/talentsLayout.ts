import { rowUnlockThreshold, type ClassTalentTree, type TalentNode } from '@/data/talents';
import { WING_CONTENT_ART } from '../panelLayout';

// Where every node of a talent tree stands in the talents wing — pure geometry in ART pixels, no React.
//
// The wing is narrow and tall, so the tree reads top to bottom: a TIER is a row (tier N opens at
// rowUnlockThreshold(N) points spent) and the bar down the left edge fills with the points spent, so it says why
// a row is still closed; the points a closed tier needs stand beside its row.
//
// A row is four slots wide. The TRUNK (tiers 1–4) fills them in the data's order: abilities, the role talent,
// the stat passives. From tier 5 the row splits in two LANES of two slots, one per specialisation branch
// (docs/redesign/CLASSES.md §2.1): the first branch on the left, the second on the right; a branch's lone
// capstone stands centred on its lane. Serviceable, not final: the follow-up owns the look (lane headers, the
// "choose one" link, connectors).

/** Room on the left for the points a closed tier needs and for the bar of points spent. */
export const GUTTER = 22;
/** A row is four nodes side by side; they share what the gutter leaves of the wing. */
const ROW_SLOTS = 4;
export const SLOT_PITCH = (WING_CONTENT_ART - GUTTER) / ROW_SLOTS; // 33
/** Node footprints (kit `Node`): an ability or modifier plate is 24, a passive or role seal 22, a capstone's
 *  octagon 30. In this tree the rank pips sit on the node's bottom edge and reach 1 px below it; a node with a
 *  single rank (modifier, capstone) shows none — its frame already says bought or not. */
export const PLATE = 24;
export const SEAL = 22;
export const OCTAGON = 30;
const PIPS = 1;

/** Footprint of a node's frame. */
export function nodeSize(node: TalentNode): number {
  if (node.kind === 'capstone') return OCTAGON;
  return node.kind === 'ability' || node.kind === 'modifier' ? PLATE : SEAL;
}

/** Whether the node shows rank pips. */
export function hasPips(node: TalentNode): boolean {
  return node.maxRank > 1;
}

export interface PlacedNode {
  node: TalentNode;
  /** 0-based tier (the node's row in the data). */
  tier: number;
  /** Top-left of the node's frame. */
  x: number;
  y: number;
}

export interface PlacedTier {
  tier: number;
  /** Top edge of the tier's row: where its tick sits on the bar. */
  y: number;
  height: number;
  /** Points spent that open it. */
  need: number;
}

export interface TalentLayout {
  nodes: PlacedNode[];
  tiers: PlacedTier[];
  width: number;
  height: number;
}

/** Centre x of each node of a row, in slots from the left edge of the tree's node area. */
function slotCentres(row: readonly TalentNode[], branchKeys: readonly string[]): number[] {
  const perLane = new Map<string, TalentNode[]>();
  for (const n of row) perLane.set(n.lane, [...(perLane.get(n.lane) ?? []), n]);
  const laneSlots = ROW_SLOTS / Math.max(1, branchKeys.length);
  return row.map((n) => {
    const lane = perLane.get(n.lane) ?? [n];
    const i = lane.indexOf(n);
    const branch = branchKeys.indexOf(n.lane);
    if (branch < 0) return i + 0.5; // the trunk: one slot each, in order
    // A branch's lane: its nodes side by side, or its lone node (the capstone) centred on the lane.
    return branch * laneSlots + (lane.length === 1 ? laneSlots / 2 : i + 0.5);
  });
}

export function layoutTalentTree(tree: ClassTalentTree): TalentLayout {
  const nodes: PlacedNode[] = [];
  const tiers: PlacedTier[] = [];
  const branchKeys = tree.branches.map((b) => b.key);
  let y = 0;
  tree.rows.forEach((row, tier) => {
    // A row is as tall as its tallest node (with its pips); nodes are centred on the tallest frame.
    const tall = Math.max(SEAL, ...row.map(nodeSize));
    const height = Math.max(SEAL + PIPS, ...row.map((n) => nodeSize(n) + (hasPips(n) ? PIPS : 0)));
    tiers.push({ tier, y, height, need: rowUnlockThreshold(tier) });
    const centres = slotCentres(row, branchKeys);
    row.forEach((node, i) => {
      const size = nodeSize(node);
      nodes.push({
        node,
        tier,
        x: Math.round(GUTTER + (centres[i] ?? 0.5) * SLOT_PITCH - size / 2),
        y: y + Math.floor((tall - size) / 2),
      });
    });
    y += height;
  });
  return { nodes, tiers, width: WING_CONTENT_ART, height: Math.max(SEAL + PIPS, y) };
}

/** How far the bar of points spent is filled, in px from its top end: it reaches each tier's tick exactly when
 *  that tier opens, and the far end at `maxPoints` (every point a hero can ever have). */
export function spentBarFill(spent: number, layout: TalentLayout, maxPoints: number): number {
  const stops = [...layout.tiers.map((t) => ({ at: t.need, y: t.y }))];
  const last = stops[stops.length - 1];
  if (last === undefined) return 0;
  stops.push({ at: Math.max(maxPoints, last.at + 1), y: layout.height });
  const s = Math.max(0, spent);
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (a === undefined || b === undefined) break;
    if (s <= b.at) return a.y + ((s - a.at) / (b.at - a.at)) * (b.y - a.y);
  }
  return layout.height;
}

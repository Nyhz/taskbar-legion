import { rowUnlockThreshold, type ClassTalentTree, type TalentNode } from '@/data/talents';
import { WING_CONTENT_ART } from '../panelLayout';

// Where every node of a talent tree stands in the talents wing — pure geometry in ART pixels, no React.
//
// The wing is narrow and tall, so the tree reads top to bottom: a TIER is a row (tier N opens at
// rowUnlockThreshold(N) points spent) and the bar down the left edge fills with the points spent, so it says why
// a row is still closed; the points a closed tier needs stand beside its row.
//
// Inside a tier, nodes stand on a LANE (a band of columns). Today every tier has ONE lane, the trunk: its
// abilities stack from the left and its passives from the right, so abilities and passives each read as a
// column band down the tiers. The redesign's specialisation branches (docs/redesign/CLASSES.md: two branches
// from tier 5, modifiers, a capstone) become extra lanes of the same tiers — add them to `lanesOf` and give each
// its `left`; nothing else here needs to change.

/** Room on the left for the points a closed tier needs and for the bar of points spent. */
export const GUTTER = 22;
/** A lane is wide enough for four nodes side by side; they share what the gutter leaves of the wing. */
const LANE_SLOTS = 4;
export const SLOT_PITCH = (WING_CONTENT_ART - GUTTER) / LANE_SLOTS; // 33
/** Node footprints (kit `Node`): an ability plate is 24, a passive seal 22. In this tree the rank pips sit on the
 *  node's bottom edge and reach 1 px below it. */
export const PLATE = 24;
export const SEAL = 22;
const PIPS = 1;
const ROW_GAP = 1;
/** Height of a tier's row: its tallest node, its pips and a pixel of air. */
const ROW_WITH_ABILITY = PLATE + PIPS + ROW_GAP; // 26
const ROW_OF_PASSIVES = SEAL + PIPS + ROW_GAP; // 24

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

interface Lane {
  nodes: TalentNode[];
  /** Left edge of the lane inside the tree (after the gutter). */
  left: number;
}

/** The lanes of one tier. One for now (the trunk); branches add theirs here. */
function lanesOf(row: readonly TalentNode[]): Lane[] {
  return [{ nodes: [...row], left: GUTTER }];
}

/** Abilities stack from the left of the lane (a lone ability sits half a step in, centred on the two-slot
 *  ability band); passives stack from the right. Seals are centred on the row's plates. */
function placeLane(lane: Lane, tier: number, y: number, rowHeight: number): PlacedNode[] {
  const abilities = lane.nodes.filter((n) => n.kind === 'ability');
  const passives = lane.nodes.filter((n) => n.kind !== 'ability');
  const lone = abilities.length === 1 ? SLOT_PITCH / 2 : 0;
  const tall = rowHeight - PIPS - ROW_GAP; // the tallest node of the row
  const placed: PlacedNode[] = abilities.map((node, i) => ({
    node,
    tier,
    x: Math.round(lane.left + lone + i * SLOT_PITCH + (SLOT_PITCH - PLATE) / 2),
    y: y + (tall - PLATE) / 2,
  }));
  passives.forEach((node, i) => {
    const fromRight = passives.length - 1 - i;
    placed.push({
      node,
      tier,
      x: Math.round(lane.left + (LANE_SLOTS - 1 - fromRight) * SLOT_PITCH + (SLOT_PITCH - SEAL) / 2),
      y: y + (tall - SEAL) / 2,
    });
  });
  return placed;
}

export function layoutTalentTree(tree: ClassTalentTree): TalentLayout {
  const nodes: PlacedNode[] = [];
  const tiers: PlacedTier[] = [];
  let y = 0;
  tree.rows.forEach((row, tier) => {
    const height = row.some((n) => n.kind === 'ability') ? ROW_WITH_ABILITY : ROW_OF_PASSIVES;
    tiers.push({ tier, y, height, need: rowUnlockThreshold(tier) });
    for (const lane of lanesOf(row)) nodes.push(...placeLane(lane, tier, y, height));
    y += height;
  });
  return { nodes, tiers, width: WING_CONTENT_ART, height: Math.max(ROW_OF_PASSIVES, y) };
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

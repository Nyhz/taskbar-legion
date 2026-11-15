import { rowUnlockThreshold, TRUNK, type ClassTalentTree, type TalentBranch, type TalentNode } from '@/data/talents';
import { WING_CONTENT_ART } from '../panelLayout';

// Where every node of a talent tree stands in the talents wing — pure geometry in ART pixels, no React.
//
// The wing is narrow and tall, so the tree reads top to bottom: a TIER is a row (tier N opens at
// rowUnlockThreshold(N) points spent) and the bar down the left edge fills with the points spent, so it says why
// a row is still closed; the points a closed tier needs stand beside its row.
//
// A row is four slots wide. The TRUNK (tiers 1–4) fills them in the data's order: abilities, the role talent,
// the stat passives. From tier 5 the row splits in two LANES of two slots, one per specialisation branch
// (docs/redesign/CLASSES.md §2.1): the first branch on the left, the second on the right. Each lane opens with
// its HEAD (the branch's sign, in a short row of its own under the trunk) and a SPINE runs from the head down
// the middle of the lane to the branch's capstone, which stands alone, centred on the lane: the branch visibly
// ends there. The two nodes of a "choose one" pair are joined by a LINK with the either-or diamond on it: a
// branch's two modifiers, and the two capstones across the lanes.

/** Room on the left for the points a closed tier needs and for the bar of points spent. */
export const GUTTER = 22;
/** A row is four nodes side by side; they share what the gutter leaves of the wing. */
const ROW_SLOTS = 4;
export const SLOT_PITCH = (WING_CONTENT_ART - GUTTER) / ROW_SLOTS; // 33
/** Node footprints: an ability or modifier plate and a role talent's pointed seal are 24, a passive's seal 22, a
 *  capstone's octagon 30. In this tree the rank pips sit on the node's bottom edge and reach 1 px below it; a node with a
 *  single rank (modifier, capstone) shows none — its frame already says bought or not. */
export const PLATE = 24;
export const SEAL = 22;
export const OCTAGON = 30;
const PIPS = 1;
/** The row of the branch heads, between the trunk and tier 5. A head's sign is 16 px with a transparent margin:
 *  it stands 2 px above the row (over the pips' line of the tier above, which is empty at a lane's centre). */
export const HEAD_ROW = 13;
export const HEAD_SIGN = 16;
const HEAD_RISE = 2;
/** The either-or diamond on a "choose one" link. */
export const EITHER = 5;

/** Footprint of a node's frame. */
export function nodeSize(node: TalentNode): number {
  if (node.kind === 'capstone') return OCTAGON;
  return node.kind === 'passive' ? SEAL : PLATE;
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

/** A branch's head: its sign, centred on the lane, in the head row. */
export interface PlacedHead {
  branch: TalentBranch;
  /** Top-left of the 16 px sign. */
  x: number;
  y: number;
  /** The lane it heads: left edge and width (for the rules either side of the sign). */
  laneX: number;
  laneWidth: number;
}

/** A branch's spine: a 1 px vertical line down the middle of its lane, from its head to its capstone. */
export interface PlacedSpine {
  branchKey: string;
  x: number;
  y: number;
  height: number;
}

/** The link between the two nodes of a "choose one": a 1 px horizontal line between their frames, the
 *  either-or diamond at its middle. */
export interface PlacedLink {
  group: string;
  /** The two nodes it joins. */
  keys: [string, string];
  x: number;
  /** The line's y (the diamond is centred on it). */
  y: number;
  width: number;
}

export interface TalentLayout {
  nodes: PlacedNode[];
  tiers: PlacedTier[];
  heads: PlacedHead[];
  spines: PlacedSpine[];
  links: PlacedLink[];
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
  const heads: PlacedHead[] = [];
  const branchKeys = tree.branches.map((b) => b.key);
  const laneWidth = (ROW_SLOTS / Math.max(1, branchKeys.length)) * SLOT_PITCH;
  let y = 0;
  tree.rows.forEach((row, tier) => {
    // The heads stand in a row of their own just above the first tier that belongs to the branches.
    if (heads.length === 0 && row.length > 0 && row.every((n) => n.lane !== TRUNK)) {
      tree.branches.forEach((branch, i) => {
        const laneX = GUTTER + i * laneWidth;
        heads.push({ branch, x: Math.round(laneX + laneWidth / 2 - HEAD_SIGN / 2), y: y - HEAD_RISE, laneX, laneWidth });
      });
      y += HEAD_ROW;
    }
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
  return {
    nodes,
    tiers,
    heads,
    spines: placeSpines(heads, nodes),
    links: placeLinks(nodes),
    width: WING_CONTENT_ART,
    height: Math.max(SEAL + PIPS, y),
  };
}

/** From under each head's sign down to the top of its branch's capstone (or of its lowest node, if a branch
 *  had none). */
function placeSpines(heads: readonly PlacedHead[], nodes: readonly PlacedNode[]): PlacedSpine[] {
  return heads.flatMap((head) => {
    const lane = nodes.filter((p) => p.node.lane === head.branch.key);
    const end = lane.find((p) => p.node.kind === 'capstone') ?? lane[lane.length - 1];
    if (end === undefined) return [];
    const top = head.y + HEAD_SIGN - 1;
    return [{ branchKey: head.branch.key, x: Math.floor(head.laneX + head.laneWidth / 2), y: top, height: Math.max(0, end.y - top) }];
  });
}

/** One link per "choose one" group whose two nodes stand in the same row. */
function placeLinks(nodes: readonly PlacedNode[]): PlacedLink[] {
  const groups = new Map<string, PlacedNode[]>();
  for (const p of nodes) {
    const g = p.node.chooseGroup;
    if (g !== undefined) groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  const links: PlacedLink[] = [];
  for (const [group, pair] of groups) {
    const [a, b] = [...pair].sort((p, q) => p.x - q.x);
    if (a === undefined || b === undefined || pair.length !== 2 || a.tier !== b.tier) continue;
    const from = a.x + nodeSize(a.node);
    links.push({
      group,
      keys: [a.node.key, b.node.key],
      x: from,
      y: a.y + Math.floor(nodeSize(a.node) / 2),
      width: b.x - from,
    });
  }
  return links;
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

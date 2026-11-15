import { CLASS_KEYS } from './classes';
import { TRUNK, type ClassTreeSpec, type NodeSpec, type TalentBranch, type TalentNode } from './talentSpec';
import { KNIGHT_TREE } from './talentTrees/knight';
import { RANGER_TREE } from './talentTrees/ranger';
import { PRIEST_TREE } from './talentTrees/priest';

// Per-class talent trees (docs/redesign/CLASSES.md §2 — supersedes TALENTS.md and SPEC §4.9). Ten tiers; tier
// N opens at (N−1)·10 points spent, whichever nodes hold them:
//   tiers 1–4   the common TRUNK: the five original abilities, eight stat passives, three role talents
//   tiers 5–9   two BRANCHES, two nodes each per tier: the branch ability, a "choose one" pair of modifiers,
//               the branch ability's modifier and stat passives
//   tier 10     each branch's capstone (one point, needs points in its branch, excludes the other)
// The class ULTIMATE is not on the tree: it unlocks at level 30 (data/ultimates.ts); a capstone transforms it.
// The model and the node constructors are in data/talentSpec.ts, the content in data/talentTrees/*; the rules
// (what can be bought or given back) are pure functions in sim/talentRules.ts.

export type { RoleEffect, TalentBranch, TalentNode, TalentNodeKind, TargetCondition } from './talentSpec';
export { CAPSTONE_BRANCH_POINTS, TRUNK } from './talentSpec';

export interface ClassTalentTree {
  classKey: string;
  /** One array per tier, top (tier 1) to bottom (tier 10): trunk nodes, or the first branch's nodes followed
   *  by the second's. */
  rows: TalentNode[][];
  branches: TalentBranch[];
}

const SPECS: Record<string, ClassTreeSpec> = {
  knight: KNIGHT_TREE,
  ranger: RANGER_TREE,
  priest: PRIEST_TREE,
};

const place = (specs: readonly NodeSpec[], rowIndex: number, lane: string): TalentNode[] =>
  specs.map((spec) => ({ ...spec, rowIndex, lane }));

function buildTree(classKey: string): ClassTalentTree {
  const spec = SPECS[classKey];
  if (spec === undefined) return { classKey, rows: [], branches: [] };
  const rows: TalentNode[][] = spec.trunk.map((row, tier) => place(row, tier, TRUNK));
  const branchTiers = Math.max(...spec.branches.map((b) => b.rows.length));
  for (let i = 0; i < branchTiers; i++) {
    const tier = spec.trunk.length + i;
    const row = spec.branches.flatMap((b) => place(b.rows[i] ?? [], tier, b.key));
    // The "choose one" pairs: the two modifiers a branch offers in one tier, and the capstones of the tier.
    for (const b of spec.branches) {
      const mods = row.filter((n) => n.lane === b.key && n.kind === 'modifier');
      if (mods.length > 1) for (const n of mods) n.chooseGroup = `${classKey}_${b.key}_t${tier + 1}`;
    }
    const caps = row.filter((n) => n.kind === 'capstone');
    if (caps.length > 1) for (const n of caps) n.chooseGroup = `${classKey}_capstone`;
    rows.push(row);
  }
  return { classKey, rows, branches: spec.branches.map((b) => ({ key: b.key, name: b.name })) };
}

export const TALENT_TREES: Record<string, ClassTalentTree> = Object.fromEntries(
  CLASS_KEYS.map((k) => [k, buildTree(k)]),
);

const NODE_LISTS: Record<string, TalentNode[]> = Object.fromEntries(
  Object.values(TALENT_TREES).map((t) => [t.classKey, t.rows.flat()]),
);
const NODE_MAPS: Record<string, Map<string, TalentNode>> = Object.fromEntries(
  Object.entries(NODE_LISTS).map(([k, nodes]) => [k, new Map(nodes.map((n) => [n.key, n]))]),
);

export function talentTree(classKey: string): ClassTalentTree {
  const tree = TALENT_TREES[classKey];
  if (tree === undefined) throw new Error(`No talent tree for ${classKey}`);
  return tree;
}

/** Whether the class has a tree (a save may name a class that no longer exists). */
export function hasTalentTree(classKey: string): boolean {
  return NODE_LISTS[classKey] !== undefined;
}

/** Flat list of every node in a class tree, in tree order (tier by tier). */
export function talentNodes(classKey: string): TalentNode[] {
  const nodes = NODE_LISTS[classKey];
  if (nodes === undefined) throw new Error(`No talent tree for ${classKey}`);
  return nodes;
}

/** A node by key, or undefined — never throws (a stale key or an unknown class in a save must not take the
 *  interface or the load down). */
export function tryTalentNode(classKey: string, nodeKey: string): TalentNode | undefined {
  return NODE_MAPS[classKey]?.get(nodeKey);
}

/** Row N (0-based) unlocks at N*10 points spent — independent of which line. */
export function rowUnlockThreshold(rowIndex: number): number {
  return rowIndex * 10;
}

/** Talent points a hero of this level has earned: one at level 1 and one per level after. */
export function talentPointsAtLevel(level: number): number {
  return Math.max(0, Math.floor(level));
}

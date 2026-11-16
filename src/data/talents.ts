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

export type { PassiveEffect, RoleEffect, TalentBranch, TalentNode, TalentNodeKind, TargetCondition } from './talentSpec';
export { CAPSTONE_BRANCH_POINTS, TRUNK } from './talentSpec';

/** Nodes that took the PLACE of another (second combat wave, 2026-11-15: an effect passive where a stat passive
 *  stood): old key → the key that stands there now. A save's points in the old node move to the new one
 *  (sim/talentRules.sanitizeTalents), so the tiers a build had open stay open; what does not fit is given back. */
export const REPLACED_NODES: Readonly<Record<string, string>> = {
  knight_t1_armor: 'knight_guardian',
  knight_bastion_t7_armor: 'knight_close_ranks',
  knight_bastion_t9_health: 'knight_shelter',
  knight_scourge_t7_health: 'knight_weathered_hide',
  knight_scourge_t9_damageReduction: 'knight_endurance',
  ranger_t1_attackSpeed: 'ranger_first_blood',
  ranger_marksman_t7_attackDamage: 'ranger_countersniper',
  ranger_marksman_t9_critChance: 'ranger_hemorrhage',
  ranger_pierce_armor: 'ranger_hemorrhage', // the passive that stood there first (it did nothing: no enemy armour)
  ranger_stalker_t7_attackDamage: 'ranger_pierce_through',
  ranger_stalker_t9_cooldownReduction: 'ranger_cruelty',
  priest_t1_health: 'priest_overflow',
  priest_devotion_t7_magicResist: 'priest_mantle',
  priest_devotion_t9_cooldownReduction: 'priest_revive',
  priest_zeal_t7_health: 'priest_searing_light',
  priest_zeal_t9_healPower: 'priest_condemn',
  priest_t4_magicResist: 'priest_retribution', // the aura took this node's place (it keeps its own ranks first)
  // The heal kit (2026-11-16): two abilities left for two instant heals in their places, and Power Infusion became a
  // passive in the Zeal node that held cooldown reduction.
  priest_powerinfusion: 'priest_healing_light',
  priest_purify: 'priest_circle',
  priest_zeal_t5_cooldownReduction: 'priest_infusion',
  priest_mod_twin_infusion: 'priest_mod_twin_light',
};

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

import type { StatKey } from './stats';
import { STATS } from './stats';
import { CLASS_KEYS } from './classes';
import { abilityDef } from './abilities';

// Per-class talent trees on the shared 10-ROW framework (TALENTS.md, supersedes
// SPEC §4.9). Row N unlocks at (N-1)*10 points spent, regardless of which nodes.
// REWORK: each class has exactly 5 abilities, all in the FIRST FOUR rows —
//   Row 1: 2 abilities + 2 stats. Rows 2-4: 1 ability + 2 stats. Rows 5-10: 3 stats.
// Every passive node is a PERCENT bonus (flat-origin stats convert via FLAT_TO_PERCENT;
// already-percent stats add percentage points). The class ULTIMATE is NOT on the tree —
// it auto-unlocks at level 30 (data/ultimates.ts) and uses no points or loadout slot.

export interface TalentNode {
  key: string;
  rowIndex: number; // 0-based
  kind: 'passive' | 'ability';
  name: string;
  maxRank: number;
  passive?: { stat: StatKey; mode: 'flat' | 'percent'; valuePerRank: number };
  abilityKey?: string;
}

export interface ClassTalentTree {
  classKey: string;
  rows: TalentNode[][];
}

const MAX_RANK = 5;

// A spec is either a stat node [stat, perRankValue] or an ability node (its key).
type StatSpec = readonly [StatKey, number];
type Spec = StatSpec | string;

const isStat = (s: Spec): s is StatSpec => Array.isArray(s);

// Per-class row layout. Each inner array is one row, top (row 1) to bottom (row 10).
const CLASS_TALENTS: Record<string, Spec[][]> = {
  knight: [
    // Rows 1-4: the 5 abilities (row 1 = 2) + role stats. Rows 5-10: pure % stats.
    ['knight_guard', 'knight_debilitate', ['health', 20], ['armor', 2.5]],
    ['knight_bulwark', ['health', 20], ['block', 2]],
    ['knight_battlecry', ['armor', 2.5], ['magicResist', 2.5]],
    ['knight_bloodlust', ['health', 20], ['block', 2]],
    [['health', 20], ['armor', 2.5], ['magicResist', 2.5]],
    [['block', 2], ['health', 20], ['attackDamage', 2.0]],
    [['armor', 2.5], ['magicResist', 2.5], ['block', 2]],
    [['health', 20], ['block', 2], ['armor', 2.5]],
    [['armor', 2.5], ['magicResist', 2.5], ['health', 20]],
    [['health', 20], ['armor', 2.5], ['attackDamage', 2.0]],
  ],
  priest: [
    ['priest_mend', 'priest_powerinfusion', ['healPower', 3], ['health', 20]],
    ['priest_holyshield', ['cooldownReduction', 1.5], ['magicResist', 2.5]],
    ['priest_nova', ['healPower', 3], ['health', 20]],
    ['priest_retribution', ['cooldownReduction', 1.5], ['magicResist', 2.5]],
    [['healPower', 3], ['health', 20], ['magicResist', 2.5]],
    [['cooldownReduction', 1.5], ['healPower', 3], ['attackDamage', 2.0]],
    [['healPower', 4], ['health', 20], ['magicResist', 2.5]],
    [['cooldownReduction', 1.5], ['healPower', 4], ['health', 20]],
    [['healPower', 4], ['health', 20], ['attackDamage', 2.0]],
    [['healPower', 4], ['cooldownReduction', 1.5], ['magicResist', 2.5]],
  ],
  ranger: [
    ['ranger_fast_fire', 'ranger_aimedshot', ['attackDamage', 2.0], ['attackSpeed', 1.5]],
    ['ranger_multishot', ['critChance', 2], ['health', 20]],
    ['ranger_focus', ['attackDamage', 2.0], ['critDamage', 4]],
    ['ranger_frozentrap', ['attackSpeed', 1.5], ['critChance', 2]],
    [['attackDamage', 2.0], ['critChance', 2], ['health', 20]],
    [['attackSpeed', 1.5], ['critChance', 2], ['attackDamage', 2.0]],
    [['attackDamage', 2.0], ['critDamage', 4], ['critChance', 2]],
    [['critChance', 2], ['attackSpeed', 1.5], ['critDamage', 4]],
    [['attackDamage', 2.0], ['attackSpeed', 1.5], ['critChance', 2]],
    [['critDamage', 4], ['attackDamage', 2.0], ['critChance', 2]],
  ],
};

// Flat stats whose talent nodes are expressed as PERCENT instead (REBALANCE:
// flat talent stats are swingy early and useless late; a percent bonus scales with
// total power, so "points spent" stays meaningful at every stage). The row layout's
// per-rank number is multiplied by this factor and applied as a percent bonus.
// Stats not listed keep their native mode (already-percent stats; flat ones that don't
// convert cleanly are not talent-rollable anyway).
const FLAT_TO_PERCENT: Partial<Record<StatKey, number>> = {
  attackDamage: 1.5,
  health: 0.1,
  armor: 1.0,
  magicResist: 1.0,
};

function statNode(classKey: string, row: number, slot: number, spec: StatSpec): TalentNode {
  const [stat, perRank] = spec;
  const conv = FLAT_TO_PERCENT[stat];
  const mode: 'flat' | 'percent' = conv !== undefined ? 'percent' : STATS[stat].kind;
  const valuePerRank = conv !== undefined ? Math.round(perRank * conv * 100) / 100 : perRank;
  return {
    key: `${classKey}_r${row}_s${slot}`,
    rowIndex: row,
    kind: 'passive',
    name: STATS[stat].label,
    maxRank: MAX_RANK,
    passive: { stat, mode, valuePerRank },
  };
}

function abilityNode(row: number, abilityKey: string): TalentNode {
  return {
    key: abilityKey, // ability node key == its ability def key
    rowIndex: row,
    kind: 'ability',
    name: abilityDef(abilityKey).name,
    maxRank: MAX_RANK,
    abilityKey,
  };
}

function buildTree(classKey: string): ClassTalentTree {
  const layout = CLASS_TALENTS[classKey] ?? [];
  const rows = layout.map((rowSpecs, row) =>
    rowSpecs.map((spec, slot) => (isStat(spec) ? statNode(classKey, row, slot, spec) : abilityNode(row, spec))),
  );
  return { classKey, rows };
}

export const TALENT_TREES: Record<string, ClassTalentTree> = Object.fromEntries(
  CLASS_KEYS.map((k) => [k, buildTree(k)]),
);

export function talentTree(classKey: string): ClassTalentTree {
  const tree = TALENT_TREES[classKey];
  if (tree === undefined) throw new Error(`No talent tree for ${classKey}`);
  return tree;
}

/** Flat list of every node in a class tree (handy for lookups). */
export function talentNodes(classKey: string): TalentNode[] {
  return talentTree(classKey).rows.flat();
}

/** Row N (0-based) unlocks at N*10 points spent — independent of which line. */
export function rowUnlockThreshold(rowIndex: number): number {
  return rowIndex * 10;
}

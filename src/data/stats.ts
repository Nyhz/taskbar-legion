// The two stat pools (SPEC §4.1 / AFFIXES.md). Each stat has a `kind` that drives
// scaling: FLAT stats scale with Φ(stageIndex); PERCENT stats are bounded rolls
// (PROGRESSION §6 — the critical flat/percent split). `rollPerIlvl` is the legacy
// SPEC field name; it is the rand(min,max) band, NOT multiplied by ilvl anymore.

export type StatGroup = 'offensive' | 'defensive' | 'utility';

export type OffensiveStat =
  | 'attackSpeed'
  | 'critChance'
  | 'critDamage'
  | 'damageIncrease'
  | 'attackDamage'
  | 'lifesteal';

export type DefensiveStat =
  | 'armor'
  | 'magicResist'
  | 'health'
  | 'dodgeChance'
  | 'hpRegen'
  | 'hpPerHit'
  | 'block';

// Utility stats: aggregated + shown, but they DON'T roll on items (talents/tech/buffs
// only). `damageReduction` is a flat % off incoming damage — stage-independent (unlike
// armor, whose mitigation is Φ-scaled), so it's what makes a defensive cooldown bite at
// any stage. Bounded when applied in combat so it can't reach immunity.
export type UtilityStat = 'cooldownReduction' | 'healPower' | 'damageReduction';

export type StatKey = OffensiveStat | DefensiveStat | UtilityStat;

export interface StatDef {
  key: StatKey;
  label: string;
  group: StatGroup;
  kind: 'flat' | 'percent';
  /** rand(min,max) roll band before tier multiplier / Φ (BALANCE.md). */
  rollPerIlvl: { min: number; max: number };
}

export const STATS: Record<StatKey, StatDef> = {
  attackDamage: { key: 'attackDamage', label: 'Attack Damage', group: 'offensive', kind: 'flat', rollPerIlvl: { min: 3.5, max: 6.0 } },
  attackSpeed: { key: 'attackSpeed', label: 'Attack Speed', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 1.5, max: 3.0 } },
  critChance: { key: 'critChance', label: 'Crit Chance', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 1.0, max: 2.0 } },
  critDamage: { key: 'critDamage', label: 'Crit Damage', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 4.0, max: 8.0 } },
  damageIncrease: { key: 'damageIncrease', label: 'Damage Increase', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 2.0, max: 4.0 } },
  lifesteal: { key: 'lifesteal', label: 'Lifesteal', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 0.4, max: 0.9 } },
  armor: { key: 'armor', label: 'Armor', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 1.4, max: 2.4 } },
  magicResist: { key: 'magicResist', label: 'Magic Resist', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 1.4, max: 2.4 } },
  health: { key: 'health', label: 'Health', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 6.0, max: 10.0 } },
  dodgeChance: { key: 'dodgeChance', label: 'Dodge Chance', group: 'defensive', kind: 'percent', rollPerIlvl: { min: 0.8, max: 1.6 } },
  hpRegen: { key: 'hpRegen', label: 'HP Regen', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 0.6, max: 1.2 } },
  hpPerHit: { key: 'hpPerHit', label: 'HP per Hit', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 0.4, max: 0.9 } },
  block: { key: 'block', label: 'Block', group: 'defensive', kind: 'percent', rollPerIlvl: { min: 1.5, max: 3.0 } },
  // CDR + healPower NOW ROLL on gear (gear overhaul): CDR is the universal ability-uptime
  // stat (clamped ≤75% in combat) so it rolls small; healPower amplifies priest heals.
  // damageReduction stays buff-ONLY ({0,0}) — flat %DR on gear stacks toward immunity.
  cooldownReduction: { key: 'cooldownReduction', label: 'Cooldown Reduction', group: 'utility', kind: 'percent', rollPerIlvl: { min: 1.0, max: 2.0 } },
  healPower: { key: 'healPower', label: 'Heal Power', group: 'utility', kind: 'percent', rollPerIlvl: { min: 2.5, max: 5.0 } },
  damageReduction: { key: 'damageReduction', label: 'Damage Reduction', group: 'defensive', kind: 'percent', rollPerIlvl: { min: 0, max: 0 } },
};

export const UTILITY_STATS: UtilityStat[] = ['cooldownReduction', 'healPower', 'damageReduction'];

// Utility stats that can actually roll on gear (damageReduction is buff-only).
export const ROLLABLE_UTILITY_STATS: UtilityStat[] = ['cooldownReduction', 'healPower'];

export const OFFENSIVE_STATS: OffensiveStat[] = [
  'attackDamage', 'attackSpeed', 'critChance', 'critDamage', 'damageIncrease', 'lifesteal',
];

export const DEFENSIVE_STATS: DefensiveStat[] = [
  'armor', 'magicResist', 'health', 'dodgeChance', 'hpRegen', 'hpPerHit', 'block',
];

export const ALL_STAT_KEYS: StatKey[] = [...OFFENSIVE_STATS, ...DEFENSIVE_STATS, ...UTILITY_STATS];

// The full FLEX pool — every stat that can roll on a flexible slot (armor substats,
// jewelry base + substats). Offensive ∪ Defensive ∪ rollable-utility (15 stats).
export const FLEX_STATS: StatKey[] = [...OFFENSIVE_STATS, ...DEFENSIVE_STATS, ...ROLLABLE_UTILITY_STATS];

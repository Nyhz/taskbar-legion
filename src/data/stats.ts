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
  | 'multistrike'
  | 'lifesteal';

export type DefensiveStat =
  | 'armor'
  | 'magicResist'
  | 'health'
  | 'hpRegen'
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
  // multistrike: % chance an auto-attack lands a SECOND hit (its own crit roll). HARD-capped
  // in combat (MAX_MULTISTRIKE) so it can't compound into a runaway DPS multiplier. Rolls
  // lower than crit — a point of multistrike is worth more (a full extra hit). Tune the band.
  multistrike: { key: 'multistrike', label: 'Multistrike', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 0.6, max: 1.2 } },
  // damageIncrease is BUFF/AURA-only now ({0,0}) — Battle Cry's Arcane Surge + the
  // Retribution Aura still grant it (it multiplies all damage in combat), but it never
  // rolls on gear/gems/talents. Kept aggregated + displayed as an offensive stat.
  damageIncrease: { key: 'damageIncrease', label: 'Damage Increase', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 0, max: 0 } },
  // lifesteal is BUFF-only now ({0,0}) — the Knight's Bloodlust still grants it (heals for
  // a % of damage dealt in combat), but it never rolls on gear/gems/talents. Kept aggregated.
  lifesteal: { key: 'lifesteal', label: 'Lifesteal', group: 'offensive', kind: 'percent', rollPerIlvl: { min: 0, max: 0 } },
  armor: { key: 'armor', label: 'Armor', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 1.4, max: 2.4 } },
  magicResist: { key: 'magicResist', label: 'Magic Resist', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 1.4, max: 2.4 } },
  health: { key: 'health', label: 'Health', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 6.0, max: 10.0 } },
  // hpRegen is BASE-ONLY ({0,0}) — a flat early-game cushion on class bases so a fresh
  // low-level hero doesn't die; it never rolls on gear/gems/talents and the build isn't
  // meant to depend on it (it tapers as enemy damage outscales it). Kept aggregated.
  hpRegen: { key: 'hpRegen', label: 'HP Regen', group: 'defensive', kind: 'flat', rollPerIlvl: { min: 0, max: 0 } },
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
  'attackDamage', 'attackSpeed', 'critChance', 'critDamage', 'multistrike', 'damageIncrease', 'lifesteal',
];

// Offensive stats that can actually roll on gear (damageIncrease + lifesteal are buff-only).
export const ROLLABLE_OFFENSIVE_STATS: OffensiveStat[] = [
  'attackDamage', 'attackSpeed', 'critChance', 'critDamage', 'multistrike',
];

export const DEFENSIVE_STATS: DefensiveStat[] = [
  'armor', 'magicResist', 'health', 'hpRegen', 'block',
];

// Defensive stats that can actually roll on gear (hpRegen is base-only — an early cushion,
// not a chase stat the build should depend on).
export const ROLLABLE_DEFENSIVE_STATS: DefensiveStat[] = [
  'armor', 'magicResist', 'health', 'block',
];

export const ALL_STAT_KEYS: StatKey[] = [...OFFENSIVE_STATS, ...DEFENSIVE_STATS, ...UTILITY_STATS];

// ── Enabler soft caps (DIMINISHING RETURNS) ──
// A few stats are "enablers" (a chance or a reduction) that shouldn't blow past a ceiling.
// Instead of a HARD cap that wastes every point past it, we map the summed RAW contribution
// (class base + gear + talents + buffs, all additive) to an EFFECTIVE value via
//   effective = cap · raw / (raw + k)
// which rises with every raw point, gives diminishing returns as it nears `cap`, and
// asymptotically approaches but NEVER reaches `cap`. So no roll is ever wasted, the stat can
// never reach an absurd value, and "upgrade feel" lives in the unbounded SCALER stats
// (attackDamage/health/critDamage/attackSpeed/healPower…) which have no cap.
// `k` = the raw amount at which the stat sits at half its cap — TUNE in the sim pass.
export interface SoftCap {
  cap: number; // the asymptotic ceiling (percentage points)
  k: number; // raw value at half-cap (curve steepness)
}
export const ENABLER_SOFT_CAPS: Partial<Record<StatKey, SoftCap>> = {
  critChance: { cap: 100, k: 60 },
  cooldownReduction: { cap: 50, k: 40 },
  block: { cap: 75, k: 50 },
  multistrike: { cap: 25, k: 20 },
};

/** Map a summed RAW enabler value to its EFFECTIVE (soft-capped) value. */
export function softCapValue(raw: number, sc: SoftCap): number {
  if (raw <= 0) return 0;
  return (sc.cap * raw) / (raw + sc.k);
}

// The 4 soft-capped enablers (mirrors ENABLER_SOFT_CAPS). They are RESTRICTED to specific
// gear slots (AFFIXES.md) instead of the shared flex pool, so their raw can't pile up from
// every slot and slam the soft cap early. Slot homes (see WEAPON_TYPES + JEWELRY_STATS):
//   block             → knight sword + shield
//   multistrike       → knight sword/shield + ranger bow/quiver
//   critChance        → knight sword/shield, ranger bow/quiver, priest wand/tome, + jewelry
//   cooldownReduction → jewelry only
export const ENABLER_STATS: StatKey[] = Object.keys(ENABLER_SOFT_CAPS) as StatKey[];

// SCALER flex pool — armor substats + jewelry's scaler options. Every rollable stat that is
// NOT a soft-capped enabler (enablers are slot-restricted above). Unbounded power lives here.
export const FLEX_STATS: StatKey[] = [
  ...ROLLABLE_OFFENSIVE_STATS,
  ...ROLLABLE_DEFENSIVE_STATS,
  ...ROLLABLE_UTILITY_STATS,
].filter((k) => !ENABLER_STATS.includes(k));

// Jewelry is the gear home of two enablers (crit + CDR) on top of the scaler flex pool.
export const JEWELRY_STATS: StatKey[] = [...FLEX_STATS, 'critChance', 'cooldownReduction'];

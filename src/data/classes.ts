import type { StatKey } from './stats';
import type { AttackStyle } from './field';
import { RANGE } from './field';

// The 3 launch classes — the canonical Knight·Ranger·Priest (tank·dps·healer) party
// the game is balanced around. Mage/Rogue were removed so all tuning happens against
// this exact composition; new classes will be added later with comparable stat curves
// and skill damage. Knight is free; others cost small gold (never a progression
// blocker — SPEC §4.7). Own up to 5, field max 3. Party slots unlock via tech.
// Percent base stats are stored as points (critChance 5 = 5%, critDamage 50 =
// +50%); attackSpeed is attacks/sec (the cadence — sim/stats.ts special-cases it).

export interface ClassDef {
  key: string;
  name: string;
  role: 'tank' | 'dps' | 'healer' | 'support';
  baseStats: Partial<Record<StatKey, number>>;
  /** Per-level growth of PERCENT stats only (points a level). Flat stats grow with the level's power instead
   *  (data/power levelPower, sim/loadout heroBaseStats). */
  statGrowthPerLevel: Partial<Record<StatKey, number>>;
  unlock: { type: 'free' } | { type: 'gold'; cost: number };
  /** The class's basic active (its talent tree's ability node scales it). */
  signatureAbility: string;
  /** Combat reach: melee must be at the front line; ranged/casters hit from afar. */
  style: AttackStyle;
  range: number;
  /** How far its shot can PICK a target (world px) — apart from `range`, which is where it stands and what says
   *  the fight has reached it. Long enough for the support at the far end of a wave (data/enemies SUPPORT_KIND:
   *  it stops RANGE.caster + 30 from the front hero, i.e. 170 past the nearest enemy; the Ranger stands 160
   *  before that enemy and the Priest 195 → 330 and 365 away, plus a margin). Omit for a hero that only hits
   *  what it stands next to (the Knight). */
  shotReach?: number;
  /** Basic auto-attack AoE: the primary target takes full damage, every other enemy within
   *  `radius` world-px takes `coeff×` the hit (e.g. 0.5 = 50%). Omit for single-target autos.
   *  The Priest's holy strike uses this (mirrors Explosive Arrow's splash, but on the auto). */
  autoSplash?: { coeff: number; radius: number };
}

export const CLASSES: Record<string, ClassDef> = {
  knight: {
    key: 'knight', name: 'Knight', role: 'tank',
    // hpRegen 4 (2026-11-18, was 5; user: with 5 the Knight barely needed healing through Normal's first three worlds
    // and the Priest cast next to nothing — «bajarla a 3 o así y ver cómo afecta». At 3 the naked solo Knight of a new game took 27 min over 1-1, dying again
    // and again; at 4 he takes ~6 min, as at 5 — the lowest that keeps the opening). Before: hpRegen 5 (was 2): a flat early-game cushion (~+15 HP/wave at L1) so the FRESH
    // solo knight survives 1-1 and can farm at all (it was getting deleted before it
    // could earn gold/items, blocking the whole loop). Tapers to irrelevance once
    // Φ-scaled enemy damage dominates. Per design request; verified by the fresh-start
    // advance probe (scripts/sim-newgame.ts).
    // block 5: a small baseline so the shield tank actually blocks (and plays its block
    // animation) from level 1; scales up with block% from gear/talents/tech.
    // attackDamage bumped (8→12, growth 2.2→2.8) for the gear overhaul: weapons are now
    // class-locked (a solo knight rarely gets a Sword early) and armor is pure mitigation,
    // so the tank needs an innate damage floor instead of leaning on any-weapon + offensive
    // armor. The Sword stacks on top. (Starting value — tune the knight's offense here.)
    baseStats: { health: 145, armor: 15, magicResist: 11, attackDamage: 12, attackSpeed: 1.4, critChance: 8, critDamage: 60, hpRegen: 4, block: 5 },
    // hpRegen is intentionally NOT in the growth: it's a FLAT early-game cushion (4),
    // not a stat that scales with level — it tapers to irrelevance as enemy damage grows.
    statGrowthPerLevel: {},
    unlock: { type: 'free' },
    signatureAbility: 'knight_guard',
    style: 'melee', range: RANGE.melee + 5, // a touch longer reach than base melee
  },
  ranger: {
    key: 'ranger', name: 'Ranger', role: 'dps',
    baseStats: { health: 94, armor: 8, magicResist: 6, attackDamage: 9, attackSpeed: 1.5, critChance: 18, critDamage: 70 },
    statGrowthPerLevel: { critChance: 0.15 },
    unlock: { type: 'gold', cost: 150 },
    signatureAbility: 'ranger_fast_fire',
    style: 'ranged', range: RANGE.ranged, shotReach: RANGE.ranged + 180,
  },
  priest: {
    key: 'priest', name: 'Priest', role: 'healer',
    baseStats: { health: 115, armor: 10, magicResist: 13, attackDamage: 5, attackSpeed: 1.0, critChance: 6, critDamage: 50, hpRegen: 2 },
    statGrowthPerLevel: {}, // hpRegen stays flat (2) — not a scaling stat
    unlock: { type: 'gold', cost: 150 },
    signatureAbility: 'priest_mend',
    style: 'caster', range: RANGE.caster, shotReach: RANGE.caster + 180,
    // The priest's holy strike lands ON the target and splashes nearby enemies for 50% (45
    // world-px ≈ 1.5 bodies, same radius as Explosive Arrow) — turns the auto into light AoE.
    autoSplash: { coeff: 0.5, radius: 45 },
  },
};

export const CLASS_KEYS: string[] = ['knight', 'ranger', 'priest'];

export function classDef(key: string): ClassDef {
  const def = CLASSES[key];
  if (def === undefined) throw new Error(`Unknown class ${key}`);
  return def;
}

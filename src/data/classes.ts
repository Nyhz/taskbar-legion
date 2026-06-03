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
  statGrowthPerLevel: Partial<Record<StatKey, number>>;
  unlock: { type: 'free' } | { type: 'gold'; cost: number };
  /** The class's basic active (its talent tree's ability node scales it). */
  signatureAbility: string;
  /** Combat reach: melee must be at the front line; ranged/casters hit from afar. */
  style: AttackStyle;
  range: number;
}

export const CLASSES: Record<string, ClassDef> = {
  knight: {
    key: 'knight', name: 'Knight', role: 'tank',
    // hpRegen 5 (was 2): a flat early-game cushion (~+15 HP/wave at L1) so the FRESH
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
    baseStats: { health: 145, armor: 15, magicResist: 11, attackDamage: 12, attackSpeed: 1.4, critChance: 8, critDamage: 60, hpRegen: 5, block: 5 },
    statGrowthPerLevel: { health: 5, armor: 0.5, magicResist: 0.3, attackDamage: 2.8, hpRegen: 0.15 },
    unlock: { type: 'free' },
    signatureAbility: 'knight_guard',
    style: 'melee', range: RANGE.melee,
  },
  ranger: {
    key: 'ranger', name: 'Ranger', role: 'dps',
    baseStats: { health: 94, armor: 8, magicResist: 6, attackDamage: 9, attackSpeed: 1.5, critChance: 18, critDamage: 70 },
    statGrowthPerLevel: { health: 3, armor: 0.3, attackDamage: 2.6, critChance: 0.15 },
    unlock: { type: 'gold', cost: 500 },
    signatureAbility: 'ranger_fast_fire',
    style: 'ranged', range: RANGE.ranged,
  },
  priest: {
    key: 'priest', name: 'Priest', role: 'healer',
    baseStats: { health: 115, armor: 10, magicResist: 13, attackDamage: 5, attackSpeed: 1.0, critChance: 6, critDamage: 50, hpRegen: 2 },
    statGrowthPerLevel: { health: 4, armor: 0.3, magicResist: 0.4, attackDamage: 1.5, hpRegen: 0.15 },
    unlock: { type: 'gold', cost: 500 },
    signatureAbility: 'priest_mend',
    style: 'caster', range: RANGE.caster,
  },
};

export const CLASS_KEYS: string[] = ['knight', 'ranger', 'priest'];

export function classDef(key: string): ClassDef {
  const def = CLASSES[key];
  if (def === undefined) throw new Error(`Unknown class ${key}`);
  return def;
}

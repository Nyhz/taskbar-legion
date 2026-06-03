import type { StatKey } from './stats';

// Tiered gems T1–T8. A gem is an INSTANCE with its own birth certificate so its flat
// grants scale with Φ(origin.stageIndex). Gems are SCALER-ONLY: they never grant the
// soft-capped enablers (critChance/cooldownReduction/block/multistrike), which are
// restricted to specific gear slots (AFFIXES.md) — so a gem can't sneak an enabler into a
// slot that isn't allowed to roll it. Each gem grants ONE scaler stat (Diamond grants two:
// armor + magicResist), the SAME in any socket; tier scales the MAGNITUDE, not the count.

export type GemKey = 'sapphire' | 'ruby' | 'emerald' | 'topaz' | 'amethyst' | 'diamond';
export type GemTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface GemDef {
  key: GemKey;
  name: string;
  color: string;
  /** The scaler stat(s) granted in ANY socket. `base` = pre-scale magnitude
   *  (flat → ×tierMult×Φ; percent → ×tierMult). */
  grants: { key: StatKey; base: number }[];
}

export interface GemInstance {
  id: string;
  key: GemKey;
  tier: GemTier;
  origin: { rollSeed: number; stageIndex: number; generatorVersion: number };
}

// gemTierMult(tier): magnitude scaling by tier.
const GEM_TIER_MULT: Record<GemTier, number> = { 1: 1.0, 2: 1.3, 3: 1.7, 4: 2.2, 5: 2.9, 6: 3.8, 7: 5.0, 8: 6.6 };

export function gemTierMult(tier: GemTier): number {
  return GEM_TIER_MULT[tier];
}

// One scaler identity per gem (the gem redesign). Sapphire's crit DAMAGE pairs with the
// crit CHANCE you get from gear/talents; Topaz's heal power now also amplifies crit-heals.
export const GEMS: Record<GemKey, GemDef> = {
  ruby: { key: 'ruby', name: 'Ruby', color: '#d33d3d', grants: [{ key: 'attackDamage', base: 1.0 }] },
  sapphire: { key: 'sapphire', name: 'Sapphire', color: '#3d7fe0', grants: [{ key: 'critDamage', base: 8 }] },
  amethyst: { key: 'amethyst', name: 'Amethyst', color: '#9b4dca', grants: [{ key: 'attackSpeed', base: 4 }] },
  emerald: { key: 'emerald', name: 'Emerald', color: '#4caf50', grants: [{ key: 'health', base: 9 }] },
  topaz: { key: 'topaz', name: 'Topaz', color: '#e8c34c', grants: [{ key: 'healPower', base: 5 }] },
  diamond: { key: 'diamond', name: 'Diamond', color: '#bfe9ff', grants: [{ key: 'armor', base: 3 }, { key: 'magicResist', base: 3 }] },
};

export const GEM_KEYS: GemKey[] = ['sapphire', 'ruby', 'emerald', 'topaz', 'amethyst', 'diamond'];

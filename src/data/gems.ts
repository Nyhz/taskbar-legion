import type { StatKey } from './stats';
import type { SlotCategory } from './itemSlots';

// Tiered gems T1–T8 (overrides SPEC §4.5's single-stat gem). Higher tier = more
// granted affixes + bigger values. A gem is an INSTANCE with its own birth
// certificate so its flat grants scale with Φ(origin.stageIndex). Grants are
// category-routed: armor→defensive, weapon→offensive, jewelry→either (AFFIXES.md).

export type GemKey = 'sapphire' | 'ruby' | 'emerald' | 'topaz' | 'amethyst' | 'diamond';
export type GemTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface GemDef {
  key: GemKey;
  name: string;
  color: string;
  /** Ordered (up to 4) grant list per category. A tier-T gem grants the first
   *  gemAffixCount(T). `base` is the pre-scale magnitude (flat→×mult×Φ; percent→×mult). */
  grants: Record<SlotCategory, { key: StatKey; base: number }[]>;
}

export interface GemInstance {
  id: string;
  key: GemKey;
  tier: GemTier;
  origin: { rollSeed: number; stageIndex: number; generatorVersion: number };
}

// gemAffixCount(tier): how many ordered grants a tier unlocks.
const GEM_AFFIX_COUNT: Record<GemTier, number> = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4 };
// gemTierMult(tier): magnitude scaling by tier.
const GEM_TIER_MULT: Record<GemTier, number> = { 1: 1.0, 2: 1.3, 3: 1.7, 4: 2.2, 5: 2.9, 6: 3.8, 7: 5.0, 8: 6.6 };

export function gemAffixCount(tier: GemTier): number {
  return GEM_AFFIX_COUNT[tier];
}
export function gemTierMult(tier: GemTier): number {
  return GEM_TIER_MULT[tier];
}

export const GEMS: Record<GemKey, GemDef> = {
  ruby: {
    key: 'ruby', name: 'Ruby', color: '#d33d3d',
    grants: {
      armor: [{ key: 'health', base: 9 }, { key: 'armor', base: 3 }, { key: 'hpPerHit', base: 2 }, { key: 'block', base: 3 }],
      weapon: [{ key: 'attackDamage', base: 1.0 }, { key: 'damageIncrease', base: 5 }, { key: 'critDamage', base: 8 }, { key: 'attackSpeed', base: 4 }],
      jewelry: [{ key: 'critDamage', base: 8 }, { key: 'health', base: 9 }, { key: 'attackDamage', base: 1.0 }, { key: 'critChance', base: 3 }],
    },
  },
  sapphire: {
    key: 'sapphire', name: 'Sapphire', color: '#3d7fe0',
    grants: {
      armor: [{ key: 'armor', base: 3 }, { key: 'magicResist', base: 3 }, { key: 'health', base: 7 }, { key: 'hpRegen', base: 2 }],
      weapon: [{ key: 'critDamage', base: 8 }, { key: 'attackDamage', base: 0.8 }, { key: 'attackSpeed', base: 4 }, { key: 'critChance', base: 3 }],
      jewelry: [{ key: 'attackSpeed', base: 4 }, { key: 'armor', base: 3 }, { key: 'critChance', base: 3 }, { key: 'health', base: 7 }],
    },
  },
  emerald: {
    key: 'emerald', name: 'Emerald', color: '#4caf50',
    grants: {
      armor: [{ key: 'dodgeChance', base: 3 }, { key: 'health', base: 7 }, { key: 'armor', base: 2 }, { key: 'hpRegen', base: 2 }],
      weapon: [{ key: 'lifesteal', base: 3 }, { key: 'attackDamage', base: 0.8 }, { key: 'critChance', base: 3 }, { key: 'damageIncrease', base: 5 }],
      jewelry: [{ key: 'critChance', base: 3 }, { key: 'dodgeChance', base: 3 }, { key: 'lifesteal', base: 3 }, { key: 'attackDamage', base: 0.8 }],
    },
  },
  topaz: {
    key: 'topaz', name: 'Topaz', color: '#e8c34c',
    grants: {
      armor: [{ key: 'magicResist', base: 3 }, { key: 'health', base: 7 }, { key: 'block', base: 3 }, { key: 'armor', base: 2 }],
      weapon: [{ key: 'damageIncrease', base: 5 }, { key: 'attackDamage', base: 0.8 }, { key: 'attackSpeed', base: 4 }, { key: 'critDamage', base: 8 }],
      jewelry: [{ key: 'damageIncrease', base: 5 }, { key: 'magicResist', base: 3 }, { key: 'attackDamage', base: 0.8 }, { key: 'health', base: 7 }],
    },
  },
  amethyst: {
    key: 'amethyst', name: 'Amethyst', color: '#9b4dca',
    grants: {
      armor: [{ key: 'hpRegen', base: 2 }, { key: 'health', base: 8 }, { key: 'dodgeChance', base: 3 }, { key: 'armor', base: 2 }],
      weapon: [{ key: 'critChance', base: 3 }, { key: 'attackDamage', base: 0.8 }, { key: 'critDamage', base: 8 }, { key: 'attackSpeed', base: 4 }],
      jewelry: [{ key: 'damageIncrease', base: 5 }, { key: 'hpRegen', base: 2 }, { key: 'critChance', base: 3 }, { key: 'health', base: 7 }],
    },
  },
  diamond: {
    key: 'diamond', name: 'Diamond', color: '#bfe9ff',
    grants: {
      armor: [{ key: 'block', base: 4 }, { key: 'armor', base: 3 }, { key: 'health', base: 7 }, { key: 'magicResist', base: 3 }],
      weapon: [{ key: 'critDamage', base: 8 }, { key: 'attackDamage', base: 1.0 }, { key: 'attackSpeed', base: 4 }, { key: 'damageIncrease', base: 5 }],
      jewelry: [{ key: 'attackSpeed', base: 4 }, { key: 'block', base: 4 }, { key: 'critDamage', base: 8 }, { key: 'attackDamage', base: 1.0 }],
    },
  },
};

export const GEM_KEYS: GemKey[] = ['sapphire', 'ruby', 'emerald', 'topaz', 'amethyst', 'diamond'];

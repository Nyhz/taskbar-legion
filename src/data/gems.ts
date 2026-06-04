import type { StatKey } from './stats';

// Tiered gems T1–T8. A gem is an INSTANCE with its own birth certificate (origin.stageIndex
// → its effective ITEM LEVEL). Its grant is computed (sim/gems.gemGrants) as a fixed
// fraction (GEM_AFFIX_FRACTION) of ONE same-tier, same-ilvl gear affix of that stat, using
// gear's exact normalization — so a gem scales with ilvl + tier exactly like the gear it
// sockets into, and every gem type is a consistent, predictable fraction of an affix.
// Gems are SCALER-ONLY: they never grant the soft-capped enablers (critChance/
// cooldownReduction/block/multistrike), which are restricted to specific gear slots
// (AFFIXES.md). Each gem grants ONE scaler stat (Diamond grants two: armor + magicResist,
// splitting the fraction), the SAME in any socket; tier + ilvl scale the MAGNITUDE.

export type GemKey = 'sapphire' | 'ruby' | 'emerald' | 'topaz' | 'amethyst' | 'diamond';
export type GemTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface GemDef {
  key: GemKey;
  name: string;
  color: string;
  /** The scaler stat(s) granted in ANY socket. A gem's TOTAL value is GEM_AFFIX_FRACTION
   *  of one same-tier/ilvl gear affix, split equally across these stats (so Diamond's two
   *  mitigation stats are each half). Magnitude is derived, not stored (sim/gems). */
  grants: StatKey[];
}

export interface GemInstance {
  id: string;
  key: GemKey;
  tier: GemTier;
  origin: { rollSeed: number; stageIndex: number; generatorVersion: number };
}

// One scaler identity per gem (the gem redesign). Sapphire's crit DAMAGE pairs with the
// crit CHANCE you get from gear/talents; Topaz's heal power now also amplifies crit-heals.
export const GEMS: Record<GemKey, GemDef> = {
  ruby: { key: 'ruby', name: 'Ruby', color: '#d33d3d', grants: ['attackDamage'] },
  sapphire: { key: 'sapphire', name: 'Sapphire', color: '#3d7fe0', grants: ['critDamage'] },
  amethyst: { key: 'amethyst', name: 'Amethyst', color: '#9b4dca', grants: ['attackSpeed'] },
  emerald: { key: 'emerald', name: 'Emerald', color: '#4caf50', grants: ['health'] },
  topaz: { key: 'topaz', name: 'Topaz', color: '#e8c34c', grants: ['healPower'] },
  diamond: { key: 'diamond', name: 'Diamond', color: '#bfe9ff', grants: ['armor', 'magicResist'] },
};

export const GEM_KEYS: GemKey[] = ['sapphire', 'ruby', 'emerald', 'topaz', 'amethyst', 'diamond'];

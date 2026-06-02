import type { GemInstance, GemKey, GemTier } from '@/data/gems';
import { GEMS, GEM_KEYS, gemAffixCount, gemTierMult } from '@/data/gems';
import type { StatKey } from '@/data/stats';
import { STATS } from '@/data/stats';
import type { SlotCategory } from '@/data/itemSlots';
import { phi, EG_FLAT } from '@/data/stageScaling';
import { makeRng } from './rng';
import { round2 } from './num';

// Tiered gem generation + the category-routed, tier-scaled grant computation.
// A gem's flat grants scale with Φ(origin.stageIndex); percent grants are bounded
// (same rule as item affixes — PROGRESSION §6). Group routing is enforced by the
// per-category grant lists in data/gems.ts (armor→def, weapon→off, jewelry→either).

export interface GemOrigin {
  rollSeed: number;
  stageIndex: number;
  generatorVersion: number;
}

/** Deterministic from (rollSeed, tier): same inputs → identical gem instance. */
export function generateGem(origin: GemOrigin, tier: GemTier): GemInstance {
  const rng = makeRng(origin.rollSeed);
  const key: GemKey = rng.pick(GEM_KEYS);
  return { id: `g${(origin.rollSeed >>> 0).toString(36)}`, key, tier, origin };
}

/** Stats a gem grants when socketed into an item of category `C`. Deterministic
 *  (no rng): the first gemAffixCount(tier) entries of the gem's grant list for C. */
export function gemGrants(
  gem: GemInstance,
  category: SlotCategory,
): { key: StatKey; value: number }[] {
  const def = GEMS[gem.key];
  const list = def.grants[category];
  const count = gemAffixCount(gem.tier);
  const mult = gemTierMult(gem.tier);
  const scale = phi(gem.origin.stageIndex) ** EG_FLAT;
  return list.slice(0, count).map((entry) => {
    const isPercent = STATS[entry.key].kind === 'percent';
    const value = isPercent ? round2(entry.base * mult) : round2(entry.base * mult * scale);
    return { key: entry.key, value };
  });
}

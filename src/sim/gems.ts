import type { GemInstance, GemKey, GemTier } from '@/data/gems';
import { GEMS, GEM_KEYS, gemTierMult } from '@/data/gems';
import type { StatKey } from '@/data/stats';
import { STATS } from '@/data/stats';
import { phi, EG_FLAT } from '@/data/stageScaling';
import { makeRng } from './rng';
import { round2 } from './num';

// Tiered gem generation + the tier-scaled grant computation. Gems are SCALER-ONLY and
// grant the same stat(s) in any socket (data/gems.ts). A gem's flat grants scale with
// Φ(origin.stageIndex); percent grants are bounded (same rule as item affixes, §6).

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

/** Stats a gem grants when socketed (same in any slot — gems are scaler-only). Deterministic:
 *  the gem's grant list, scaled by tier (magnitude) + Φ (flat grants only). */
export function gemGrants(gem: GemInstance): { key: StatKey; value: number }[] {
  const def = GEMS[gem.key];
  const mult = gemTierMult(gem.tier);
  const scale = phi(gem.origin.stageIndex) ** EG_FLAT;
  return def.grants.map((entry) => {
    const isPercent = STATS[entry.key].kind === 'percent';
    const value = isPercent ? round2(entry.base * mult) : round2(entry.base * mult * scale);
    return { key: entry.key, value };
  });
}

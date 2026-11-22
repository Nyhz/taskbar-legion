import type { GemInstance, GemKey, GemTier } from '@/data/gems';
import { GEMS, GEM_KEYS } from '@/data/gems';
import type { StatKey } from '@/data/stats';
import { STATS } from '@/data/stats';
import { GEM_FRACTION } from '@/data/power';
import { tierDef } from '@/data/tiers';
import { makeRng } from './rng';
import { statValue } from './loot';

// Tiered gem generation + the grant computation (docs/redesign/POWER_CURVE.md §2). A gem grants GEM_FRACTION of one
// same-rarity, same-level item's budget in its stat (split over a two-stat gem), with the item formula (sim/loot
// statValue) at a mid roll — so a gem follows the power curve exactly like the gear it sockets into.

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

/** A gem's ITEM LEVEL: the stage it dropped on (item levels are stages, data/power). Shown as "Gem Lv.". */
export function gemLevel(gem: GemInstance): number {
  return Math.max(1, gem.origin.stageIndex);
}

/** Stats a gem grants when socketed (same in any slot — gems are scaler-only): GEM_FRACTION of its rarity's budget,
 *  split across a multi-stat gem, at the middle of each stat's band. */
export function gemGrants(gem: GemInstance): { key: StatKey; value: number }[] {
  const def = GEMS[gem.key];
  const budget = tierDef(gem.tier).statMultiplier;
  const share = GEM_FRACTION / def.grants.length;
  return def.grants.map((key) => {
    const band = STATS[key].rollPerIlvl;
    return { key, value: statValue(key, budget, gemLevel(gem), share, (band.min + band.max) / 2) };
  });
}

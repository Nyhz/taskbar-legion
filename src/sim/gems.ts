import type { GemInstance, GemKey, GemTier } from '@/data/gems';
import { GEMS, GEM_KEYS } from '@/data/gems';
import type { StatKey } from '@/data/stats';
import { STATS } from '@/data/stats';
import { phi, expectedLevel, EG_FLAT, GEAR_POWER, GEM_AFFIX_FRACTION, pctAffixIlvlMult } from '@/data/stageScaling';
import { tierDef } from '@/data/tiers';
import { makeRng } from './rng';
import { round2 } from './num';

// Tiered gem generation + the tier/ilvl-scaled grant computation (gem rework). A gem grants
// a fixed fraction (GEM_AFFIX_FRACTION) of ONE same-tier, same-ilvl gear affix of its stat,
// using gear's exact normalization — so a gem scales with ilvl + tier just like the gear it
// sockets into, and every gem type is a consistent, predictable fraction of an affix. Gems
// are SCALER-ONLY (data/gems.ts). Flat grants scale Φ(ilvl)^EG_FLAT × GEAR_POWER like flat
// gear stats; percent grants are level-flat (bounded, §6) — both exactly as item affixes.

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

/** A gem's effective ITEM LEVEL — its origin stage mapped onto the same level spine items
 *  use (expectedLevel), so a gem scales with ilvl exactly like the gear it sockets into.
 *  This is the value surfaced as the gem's "Gem Lv." in the UI. */
export function gemLevel(gem: GemInstance): number {
  return expectedLevel(gem.origin.stageIndex);
}

/** Stats a gem grants when socketed (same in any slot — gems are scaler-only). Each grant
 *  is GEM_AFFIX_FRACTION (split across a multi-stat gem) of one same-tier, same-ilvl gear
 *  affix of that stat: fraction × midRoll × tierMult × (flat: GEAR_POWER × Φ(ilvl); percent: 1). */
export function gemGrants(gem: GemInstance): { key: StatKey; value: number }[] {
  const def = GEMS[gem.key];
  const tierMult = tierDef(gem.tier).statMultiplier; // SAME per-tier scaling as gear
  const phiFlat = phi(gemLevel(gem)) ** EG_FLAT;
  const fractionPer = GEM_AFFIX_FRACTION / def.grants.length; // multi-stat gems split it
  return def.grants.map((key) => {
    const band = STATS[key].rollPerIlvl;
    const midRoll = (band.min + band.max) / 2; // the deterministic "average affix roll"
    const isPercent = STATS[key].kind === 'percent';
    const value = isPercent
      ? round2(fractionPer * midRoll * tierMult * pctAffixIlvlMult(gemLevel(gem)))
      : round2(fractionPer * midRoll * tierMult * GEAR_POWER * phiFlat);
    return { key, value };
  });
}

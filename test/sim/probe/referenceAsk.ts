// THE CANONICAL LADDER MEASURE (round 13, 2026-11-17; user: «grupo de referencia fijo»). What a wall asks is its life as
// a % of the 60 s of damage of a FIXED reference party: the zone's realistic ceiling (zoneGear: the zone's top rarity at
// its top item level, average rolls, gems of that rarity, interpolated inside the difficulty — gradualCeilingDamage)
// worn by a Knight, a Ranger and a Priest at the zone's own level (data/stageScaling expectedLevel), in the probe's
// build for there (the default build up to Hell, the good one from Inferno), with no account bonuses. Deterministic and
// independent of any probe run: the arrive-based ask (scripts/ceiling-pass.ts) moves 1–2 points from pass to pass with
// the level and gear the probe's party happens to bring, and a ladder written in it could not be held strictly rising.

import { expectedLevel, zoneBossHp } from '@/data/stageScaling';
import { getBonuses } from '@/sim/bonuses';
import type { HeroConfig } from '@/sim/loadout';
import { freshHero } from './economy';
import { PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from './builds';
import { gradualCeilingDamage } from './zoneGear';

/** The seeds of the reference fights (the ceiling's item draws have their own, zoneGear ZONE_SET_SEED). One fight can
 *  lose its glass back-liner early and halve its damage; the median of five does not hinge on that. */
export const REFERENCE_SEEDS: readonly number[] = [4242, 1, 2, 3, 4];
const CLASSES = ['knight', 'ranger', 'priest'] as const;

/** The reference party at the wall `S`: the three classes, naked (the ceiling dresses them), at the zone's level. */
export function referenceParty(S: number): HeroConfig[] {
  const build = S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD;
  return CLASSES.map((c) => freshHero(c, c, expectedLevel(S), build[c]));
}

/** What the wall `S` asks, as a % of the reference party's 60 s of damage in the zone's realistic ceiling. */
export function referenceAsk(S: number): number {
  const party = referenceParty(S);
  const bonuses = getBonuses({}, {});
  const asks = REFERENCE_SEEDS.map((seed) => {
    const dealt = gradualCeilingDamage(party, S, bonuses, seed);
    return dealt > 0 ? (100 * zoneBossHp(S)) / dealt : Number.POSITIVE_INFINITY;
  }).sort((a, b) => a - b);
  return asks[Math.floor(asks.length / 2)] ?? Number.POSITIVE_INFINITY;
}

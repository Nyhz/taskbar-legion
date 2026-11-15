import type { Combatant } from './world';
import { HEAVY_HIT_LIFE_FRAC, RECENT_DAMAGE_HALF_LIFE_MS, RECENT_HIT_MS } from '@/data/abilities';

// What a hero has been through in the last moments — the bookkeeping behind the abilities that REACT
// (data/abilities FireRule): when it was last hit, a running tally of the damage it is taking, and when a
// single blow last took a big bite of its life. Pure state on the combatant; no RNG; heroes only.

/** A hit of `dmg` has just landed on `c`: after its armour, block and damage reduction, BEFORE its shields — a
 *  hero whose shield soaks the blows is still under attack. */
export function noteDamageTaken(c: Combatant, dmg: number): void {
  if (c.side !== 'hero' || dmg <= 0) return;
  c.sinceHitMs = 0;
  c.recentDamage = (c.recentDamage ?? 0) + dmg;
  if (dmg >= c.maxHp * HEAVY_HIT_LIFE_FRAC) c.sinceHeavyHitMs = 0;
}

/** Advance the clocks and let the tally fade (once per tick, in the hero's upkeep). */
export function tickRecent(c: Combatant, deltaMs: number): void {
  if (c.sinceHitMs !== undefined) c.sinceHitMs += deltaMs;
  if (c.sinceHeavyHitMs !== undefined) c.sinceHeavyHitMs += deltaMs;
  if (c.recentDamage !== undefined && c.recentDamage > 0) {
    c.recentDamage *= 0.5 ** (deltaMs / RECENT_DAMAGE_HALF_LIFE_MS);
    if (c.recentDamage < 0.01) c.recentDamage = 0;
  }
}

/** It has taken damage in the last RECENT_HIT_MS. */
export function recentlyHit(c: Combatant): boolean {
  return c.sinceHitMs !== undefined && c.sinceHitMs <= RECENT_HIT_MS;
}

/** A single blow took HEAVY_HIT_LIFE_FRAC of its life in the last RECENT_HIT_MS. */
export function recentlyHitHard(c: Combatant): boolean {
  return c.sinceHeavyHitMs !== undefined && c.sinceHeavyHitMs <= RECENT_HIT_MS;
}

/** Forget it all (a revived hero, a new stage): the hits taken, and what the effect passives had banked on
 *  them (Weathered Hide's stacks, Shelter already given). */
export function clearRecent(c: Combatant): void {
  c.sinceHitMs = undefined;
  c.sinceHeavyHitMs = undefined;
  c.recentDamage = undefined;
  c.hideStacks = undefined;
  c.hideMisses = undefined;
  c.sheltered = undefined;
  c.divertedPhys = undefined;
  c.divertedMagic = undefined;
}

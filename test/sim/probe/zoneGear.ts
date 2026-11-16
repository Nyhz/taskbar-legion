// "Geared at X % of the zone" — the measurable definition (user, 2026-11-15: "matar al boss en exactamente 60 s
// quiere decir que tus personajes van equipados al 80 %-90 % del nivel de la zona").
//
//   gear % of a party at a world  =  the damage it deals to that world's boss in the 60 s before the enrage
//                                    ÷ the damage the same heroes deal in THE ZONE SET
//
// THE ZONE SET is what the world itself can dress those heroes in: the same heroes (level, talents, tech), stripped,
// then dressed by the probe's own rule from ZONE_SET_CHESTS stage-boss chests of the world's X-9, their gems
// socketed. It is a fixed reference (one seed per world), not a ceiling: an older piece with a lucky roll can beat it.
// Both damages are measured in the REAL fight, against a boss of its real life that cannot die inside the window
// (wallDamage tops its life up), so the number is
// the one the wall's life is written in: a wall of `share × zone-set damage` dies at exactly 60 s to a party at
// `share` of the zone.

import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { ZONE_ENRAGE_MS, worldOf } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import { buildParty } from './combat';
import { openCaptured, equipItems, socketGems } from './gear';

export const ZONE_SET_CHESTS = 240; // stage-boss chests of the world's X-9 the zone set is picked from
export const ZONE_SET_SEED = 90_210; // the reference draw (per world: + the boss stage)
export const ZONE_SET_DRAWS = 5; // independent zone sets the reference is averaged over

/** The heroes of `party` (same level, talents) dressed from nothing with the best of `chests` chests of the world. */
export function zoneSet(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, chests = ZONE_SET_CHESTS, seed = ZONE_SET_SEED): HeroConfig[] {
  const set: HeroConfig[] = party.map((h) => ({ ...h, equipment: {} }));
  const loot = openCaptured('stageBoss', bossStage - 1, chests, seed + bossStage, { n: 0 }, bonuses, set.map((h) => h.classKey));
  // two passes: a piece passed over while the party was naked can be the better one once the rest is worn
  equipItems(set, loot.items);
  equipItems(set, loot.items);
  socketGems(set, loot.gems);
  return set;
}

/** `party` with `chests` more chests of the world opened on top of what it wears (the road from arriving to the zone set). */
export function withZoneChests(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, chests: number, seed = ZONE_SET_SEED): HeroConfig[] {
  const out: HeroConfig[] = party.map((h) => ({ ...h, equipment: { ...h.equipment } }));
  if (chests <= 0) return out;
  const loot = openCaptured('stageBoss', bossStage - 1, chests, seed + bossStage, { n: 0 }, bonuses, out.map((h) => h.classKey));
  equipItems(out, loot.items);
  socketGems(out, loot.gems);
  return out;
}

/** Damage `party` deals to the world boss at `bossStage` before its enrage (a party that dies early simply stops
 *  adding). The boss has its REAL life — so its shell (Acorazado) soaks and breaks as in the fight, and Culpa takes its
 *  toll by the share of that life the party takes off — but it cannot die inside the measure: whenever it falls under
 *  half its life, half its life is given back (and Culpa's record of it moved with it, so the refill costs no toll).
 *  The damage is the sum of what the party took off it. (Until 2026-11-16 the boss was given 10^18 life: the shell
 *  then never broke and Culpa never took a toll.) */
export function wallDamage(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, seed: number, windowMs = ZONE_ENRAGE_MS): number {
  const W = worldOf(bossStage);
  const world = createWorld(seed, buildParty(party));
  world.maxClearedStage = bossStage - 1;
  world.globalStageIndex = bossStage - 1;
  const sim = new Simulation(world);
  if (!sim.enterZoneBoss(W)) return 0;
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const wipes = world.wipes;
  let dealt = 0;
  let before: number | undefined;
  for (let t = 0; t < (windowMs + 30_000) / TICK_MS; t++) {
    sim.tick(ctx);
    world.chests = [];
    if (world.wipes > wipes) break;
    const boss = world.enemies.find((e) => e.isBoss === true);
    if (boss === undefined) continue;
    if (before !== undefined && boss.hp < before) dealt += before - boss.hp;
    if (boss.hp < boss.maxHp / 2) {
      const refill = boss.maxHp / 2;
      boss.hp += refill;
      if (boss.hpSeen !== undefined) boss.hpSeen += refill;
    }
    before = boss.hp;
    if ((boss.fightMs ?? 0) >= windowMs || !boss.alive) break;
  }
  return dealt;
}

/** The zone set's damage at a world for these heroes: the geometric mean over ZONE_SET_DRAWS independent zone sets
 *  (one draw of chests swings ±25 % on a lucky weapon; the mean of a few is the reference). */
export function zoneSetDamage(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, seed: number, draws = ZONE_SET_DRAWS): number {
  let logs = 0;
  let n = 0;
  for (let d = 0; d < draws; d++) {
    const dealt = wallDamage(zoneSet(party, bossStage, bonuses, ZONE_SET_CHESTS, ZONE_SET_SEED + 7919 * d), bossStage, bonuses, seed);
    if (dealt <= 0) continue;
    logs += Math.log(dealt);
    n += 1;
  }
  return n > 0 ? Math.exp(logs / n) : 0;
}

/** Gear % of `party` at the world whose boss is `bossStage` (100 = the zone set). */
export function gearPercent(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, seed: number): number {
  const ref = zoneSetDamage(party, bossStage, bonuses, seed);
  return ref > 0 ? (100 * wallDamage(party, bossStage, bonuses, seed)) / ref : 0;
}

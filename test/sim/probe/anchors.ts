// The TOUGHNESS ANCHORS (user, 2026-11-15) and how they are measured — with the REAL simulation.
//   - a NORMAL enemy (a grunt) survives 2–3 basic hits of the party's HARDEST hitter (so nobody one-shots it;
//     the tank and the healer need more);
//   - an elite sits between (it has ELITE_HP_MULT times a grunt's life);
//   - a STAGE boss (X-1 … X-9) lasts 5–10 seconds against the on-gear full party;
//   - the world boss stays the wall (tuned for the pacing target, not for a number of seconds).
// "On-gear" is the probe's average player at that point of the game (test/sim/probe/loop.ts), not an over-geared one.

import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import { enemyHp } from '@/sim/enemyScale';
import { TRASH_HP_FRACTION, ELITE_HP_MULT, wavesPerStage } from '@/data/stageScaling';
import { buildParty } from './combat';

/** The band a grunt's hits-to-kill must stay in, and the stage boss's seconds (with the tolerance the tests allow:
 *  a party grows inside a world, so the same enemy is a little softer at the wall than on arrival). */
export const GRUNT_HITS = { target: 2.5, min: 2, max: 3 } as const;
export const STAGE_BOSS_SEC = { target: 7.5, min: 5, max: 10 } as const;

/** Life of a grunt (the plain melee enemy: hpMult 1) at stage S. */
export function gruntHp(S: number): number {
  return enemyHp(S) * TRASH_HP_FRACTION;
}

export interface HitSample {
  /** Mean damage of one BASIC attack (no ability, no splash, no multistrike echo), per class in the party. */
  basicHit: Record<string, number>;
  /** The hit the anchor uses: the hardest basic hitter of the party (its damage dealer). */
  topHit: number;
}

/** Fight stage S for a while and average what each hero's basic attack does. */
export function measureBasicHits(configs: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses, seconds = 45): HitSample {
  const world = createWorld(seed, buildParty(configs));
  world.globalStageIndex = S;
  world.maxClearedStage = S;
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const classOf = new Map(world.heroes.map((h) => [h.id, h.classKey ?? '?']));
  const sum: Record<string, number> = {};
  const n: Record<string, number> = {};
  for (let t = 0; t < (seconds * 1000) / TICK_MS; t++) {
    for (const ev of sim.tick(ctx)) {
      if (ev.type !== 'damage' || ev.sourceId === undefined || ev.amount === undefined) continue;
      if (ev.abilityKey !== undefined || ev.splash === true || ev.tick === true || ev.multi === true) continue;
      const cls = classOf.get(ev.sourceId);
      if (cls === undefined) continue; // an enemy's hit
      sum[cls] = (sum[cls] ?? 0) + ev.amount;
      n[cls] = (n[cls] ?? 0) + 1;
    }
    world.pending.gold = 0;
    world.pending.xp = 0;
    world.chests = [];
  }
  const basicHit: Record<string, number> = {};
  for (const cls of Object.keys(sum)) basicHit[cls] = (sum[cls] ?? 0) / Math.max(1, n[cls] ?? 0);
  const topHit = Math.max(0, ...Object.values(basicHit));
  return { basicHit, topHit };
}

/** Basic hits a grunt of stage S takes from this party's hardest hitter (and an elite: ELITE_HP_MULT times that). */
export function gruntHits(configs: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses): { hits: number; eliteHits: number; byClass: Record<string, number> } {
  const { basicHit, topHit } = measureBasicHits(configs, S, seed, bonuses);
  const hp = gruntHp(S);
  const byClass: Record<string, number> = {};
  for (const [cls, hit] of Object.entries(basicHit)) byClass[cls] = hit > 0 ? hp / hit : Number.POSITIVE_INFINITY;
  const hits = topHit > 0 ? hp / topHit : Number.POSITIVE_INFINITY;
  return { hits, eliteHits: hits * ELITE_HP_MULT, byClass };
}

export interface StageBossSample {
  win: boolean;
  seconds: number; // from the boss's first tick alive to its death (the cap when it did not fall)
  minHpFrac: number; // worst hero life fraction during the fight
}

/** The stage boss of S alone against the party at full life: how long it lasts. */
export function measureStageBoss(configs: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses, capSec = 90): StageBossSample {
  const world = createWorld(seed, buildParty(configs));
  world.globalStageIndex = S;
  world.maxClearedStage = S;
  world.wavesThisStage = wavesPerStage(S); // the waves are done: the boss is next
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const startWipes = world.wipes;
  let seen = -1;
  let minHpFrac = 1;
  const maxTicks = Math.floor(((capSec + 20) * 1000) / TICK_MS);
  for (let t = 0; t < maxTicks; t++) {
    sim.tick(ctx);
    if (world.wipes > startWipes) return { win: false, seconds: capSec, minHpFrac: 0 };
    const boss = world.enemies.find((e) => e.isBoss === true && e.alive);
    if (boss !== undefined) {
      if (seen < 0) seen = t;
      for (const h of world.heroes) minHpFrac = Math.min(minHpFrac, h.alive && h.maxHp > 0 ? Math.max(0, h.hp / h.maxHp) : 0);
      if (((t - seen) * TICK_MS) / 1000 >= capSec) return { win: false, seconds: capSec, minHpFrac };
    } else if (seen >= 0) {
      return { win: true, seconds: ((t - seen) * TICK_MS) / 1000, minHpFrac };
    }
  }
  return { win: false, seconds: capSec, minHpFrac };
}

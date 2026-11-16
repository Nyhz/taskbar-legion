// "Geared at X % of the zone" — the measurable definition (user, 2026-11-15: "matar al boss en exactamente 60 s
// quiere decir que tus personajes van equipados al 80 %-90 % del nivel de la zona").
//
//   gear % of a party at a world  =  the damage it deals to that world's boss in the 60 s before the enrage
//                                    ÷ the damage the same heroes deal in THE ZONE SET
//
// THE ZONE SET (option C, user decision 2026-11-15, wired 2026-11-16) is the world's TYPICAL gear: the same heroes
// (level, talents, tech), stripped, and every slot filled with an item of the world's X-9 — its expected item level
// and the usual rarity of what a player WEARS there — the best for the hero of ZONE_REF_CANDIDATES such items per
// slot (a player keeps the piece whose stats suit him), its sockets filled with gems of that rarity.
// "Usual rarity" is the 90th percentile of the world's drops (ZONE_REF_QUANTILE), not their mode: the mode is the
// common piece a player throws away (Hell's mode is rarity 0–1 while the average player wears 3–5), and a party is
// 5 to 50 times the mode set's damage from Hell on — walls asking 80–90 % of it would be no wall at all (docs/redesign
// PACING_REPORT.md, round 3 checkpoint 3a). ZONE_REF_QUANTILE=mode ZONE_REF_GEMS=0 gives the literal mode set.
// It replaced the best of 240 stage-boss chests, which the probe's party outgrew from Eternal on.
// Both damages are measured in the REAL fight, against a boss of its real life that cannot die inside the window
// (wallDamage tops its life up), so the number is
// the one the wall's life is written in: a wall of `share × zone-set damage` dies at exactly 60 s to a party at
// `share` of the zone.

import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { ZONE_ENRAGE_MS, worldOf } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import { buildParty } from './combat';
import { openCaptured, equipItems, socketGems, heroScore } from './gear';
import { composeItem } from '@/sim/loot';
import { makeRng, deriveSeed } from '@/sim/rng';
import { tierWeightsAt } from '@/data/difficulties';
import { expectedLevel } from '@/data/stageScaling';
import { SLOTS, SLOT_KEYS } from '@/data/itemSlots';
import type { ItemInstance } from '@/sim/items';
import type { ItemTier } from '@/data/tiers';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { generateGem } from '@/sim/gems';
import { GEM_KEYS, type GemTier } from '@/data/gems';
import type { SlotKey } from '@/data/itemSlots';
import { STATS, type StatKey } from '@/data/stats';
import { tierDef } from '@/data/tiers';
import { round2 } from '@/sim/num';
import { phi, EG_FLAT, GEAR_POWER, pctAffixIlvlMult } from '@/data/stageScaling';

export const ZONE_SET_CHESTS = 240; // stage-boss chests of the world's X-9 the zone set is picked from
export const ZONE_SET_SEED = 90_210; // the reference draw (per world: + the boss stage)
export const ZONE_SET_DRAWS = 5; // independent zone sets the reference is averaged over

export const ZONE_REF_CANDIDATES = 3; // typical items per slot the reference hero picks the best of
/** Which rarity "usual" means (tooling knob while the definition is settled): undefined = the mode of the world's
 *  drops; a number = that quantile of them. */
export let ZONE_REF_QUANTILE: number | undefined = process.env.ZONE_REF_QUANTILE === 'mode' ? undefined : Number(process.env.ZONE_REF_QUANTILE ?? 0.9);
/** Whether the reference set's sockets carry gems of its rarity (tooling knob). */
export let ZONE_REF_GEMS = process.env.ZONE_REF_GEMS !== '0';
export function setZoneReference(quantile: number | undefined, gems: boolean): void {
  ZONE_REF_QUANTILE = quantile;
  ZONE_REF_GEMS = gems;
}

/** The rarity of the reference set at global stage S: the `quantile` of that world's drops (ZONE_REF_QUANTILE; the
 *  most usual rarity — the mode — when no quantile is given). A jewel is never below rarity 1. */
export function usualTier(S: number, jewel = false, quantile: number | undefined = ZONE_REF_QUANTILE): ItemTier {
  const w = tierWeightsAt(S);
  let best = 0;
  if (quantile === undefined) {
    for (let t = 1; t < w.length; t++) if ((w[t] ?? 0) > (w[best] ?? 0)) best = t;
  } else {
    const total = w.reduce((a, x) => a + x, 0);
    let acc = 0;
    for (let t = 0; t < w.length; t++) {
      acc += w[t] ?? 0;
      best = t;
      if (acc >= quantile * total) break;
    }
  }
  return Math.max(best, jewel ? 1 : 0) as ItemTier;
}

/** THE ZONE SET (option C): the heroes of `party` (same level, talents) with every slot filled by a typical item of
 *  the world — X-9's expected item level and its most usual rarity, no gems — the best of ZONE_REF_CANDIDATES per
 *  slot. Deterministic in (`seed`, world). */
export function zoneReferenceSet(party: readonly HeroConfig[], bossStage: number, seed = ZONE_SET_SEED): HeroConfig[] {
  const set: HeroConfig[] = party.map((h) => ({ ...h, equipment: {} }));
  const S = bossStage - 1;
  const rng = makeRng(deriveSeed(seed, bossStage));
  const items: ItemInstance[] = [];
  for (const hero of set) {
    for (const slot of SLOT_KEYS) {
      const jewel = SLOTS[slot].category === 'jewelry';
      for (let c = 0; c < ZONE_REF_CANDIDATES; c++) {
        const origin = { rollSeed: rng.int(2 ** 31), stageIndex: S, chestType: 'stageBoss' as const, generatorVersion: GENERATOR_VERSION };
        items.push(composeItem(slot, usualTier(S, jewel), origin, rng, expectedLevel(S), jewel ? undefined : hero.classKey));
      }
    }
  }
  equipItems(set, items);
  equipItems(set, items);
  if (ZONE_REF_GEMS) {
    const gems = [];
    for (const hero of set) for (const item of Object.values(hero.equipment)) for (let k = 0; k < (item?.sockets.length ?? 0); k++) {
      gems.push(generateGem({ rollSeed: rng.int(2 ** 31), stageIndex: S, generatorVersion: GENERATOR_VERSION }, Math.max(1, usualTier(S)) as GemTier));
    }
    socketGems(set, gems, false);
  }
  return set;
}

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
 *  The damage is the sum of what the party took off it; a party that falls first is counted at the rate it was
 *  dealing until then. (Until 2026-11-16 the boss was given 10^18 life: the shell then never broke and Culpa never
 *  took a toll.) */
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
  let fightMs = 0;
  for (let t = 0; t < (windowMs + 30_000) / TICK_MS; t++) {
    sim.tick(ctx);
    world.chests = [];
    if (world.wipes > wipes) {
      // A party that falls before the window ends is counted at the rate it was dealing (the gear % is the
      // damage the gear gives; whether the party stands the minute is measured apart — scripts/pressure-survival).
      return fightMs > 1000 ? (dealt * windowMs) / fightMs : dealt;
    }
    const boss = world.enemies.find((e) => e.isBoss === true);
    if (boss === undefined) continue;
    if (before !== undefined && boss.hp < before) dealt += before - boss.hp;
    if (boss.hp < boss.maxHp / 2) {
      const refill = boss.maxHp / 2;
      boss.hp += refill;
      if (boss.hpSeen !== undefined) boss.hpSeen += refill;
    }
    before = boss.hp;
    fightMs = boss.fightMs ?? 0;
    if (fightMs >= windowMs || !boss.alive) break;
  }
  return dealt;
}

/** The zone set's damage at a world for these heroes: the geometric mean over ZONE_SET_DRAWS independent reference
 *  sets (zoneReferenceSet: the typical items' affixes are rolled; the mean of a few is the reference). */
export function zoneSetDamage(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, seed: number, draws = ZONE_SET_DRAWS): number {
  let logs = 0;
  let n = 0;
  for (let d = 0; d < draws; d++) {
    const dealt = wallDamage(zoneReferenceSet(party, bossStage, ZONE_SET_SEED + 7919 * d), bossStage, bonuses, seed);
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

// ── THE CEILING (round 4, user decision 2026-11-16) ────────────────────────────────────────────────────────────────
// "100 % = el techo realista de la zona": every slot holds an item of the HIGHEST rarity that drops in that world
// (tierWeightsAt — so a difficulty's world 1 tops out at the previous difficulty's cap), at the world's X-9 item level,
// with every affix at the MIDDLE of its roll (no perfect stars), and every socket holding a gem of that rarity (gems are
// mid-rolled by design), its kind picked per socket for the hero who wears it. The affix KEYS are the best of
// CEILING_CANDIDATES draws per slot (a patient player keeps the piece whose stats suit him).

export const CEILING_CANDIDATES = Number(process.env.CEILING_CANDIDATES ?? ZONE_REF_CANDIDATES);

/** The highest rarity with any chance to drop at global stage S. */
export function topTierAt(S: number): ItemTier {
  const w = tierWeightsAt(S);
  let top = 0;
  w.forEach((x, t) => { if (x > 0) top = t; });
  return top as ItemTier;
}

/** An affix value at the middle of its roll band (rollStatValue with r = the band's midpoint). */
export function midStatValue(key: StatKey, tierMult: number, itemLevel: number): number {
  const band = STATS[key].rollPerIlvl;
  const r = (band.min + band.max) / 2;
  if (STATS[key].kind === 'percent') return round2(r * tierMult * pctAffixIlvlMult(itemLevel));
  return round2(r * tierMult * GEAR_POWER * phi(itemLevel) ** EG_FLAT);
}

/** `item` with every affix (base and substats) at its mid roll; an armour/MR split base keeps its halves. */
function midRolled(item: ItemInstance): ItemInstance {
  const mult = tierDef(item.tier).statMultiplier;
  const split = item.baseAffix.length > 1;
  return {
    ...item,
    baseAffix: item.baseAffix.map((a) => ({ key: a.key, value: split ? round2(midStatValue(a.key, mult, item.ilvl) / 2) : midStatValue(a.key, mult, item.ilvl) })),
    stats: item.stats.map((a) => ({ key: a.key, value: midStatValue(a.key, mult, item.ilvl) })),
  };
}

/** THE CEILING SET of the world whose boss is `bossStage`, worn by the heroes of `party` (same level, talents). */
export function zoneCeilingSet(party: readonly HeroConfig[], bossStage: number, seed = ZONE_SET_SEED, tierOverride?: ItemTier): HeroConfig[] {
  const set: HeroConfig[] = party.map((h) => ({ ...h, equipment: {} }));
  const S = bossStage - 1;
  const tier = tierOverride ?? topTierAt(S);
  const ilvl = expectedLevel(S);
  const rng = makeRng(deriveSeed(seed, bossStage) ^ 0x5eed);
  const items: ItemInstance[] = [];
  for (const hero of set) {
    for (const slot of SLOT_KEYS) {
      const jewel = SLOTS[slot].category === 'jewelry';
      for (let c = 0; c < CEILING_CANDIDATES; c++) {
        const origin = { rollSeed: rng.int(2 ** 31), stageIndex: S, chestType: 'stageBoss' as const, generatorVersion: GENERATOR_VERSION };
        items.push(midRolled(composeItem(slot, tier, origin, rng, ilvl, jewel ? undefined : hero.classKey, undefined, 0)));
      }
    }
  }
  equipItems(set, items);
  equipItems(set, items);
  // Gems: socket by socket, the kind that adds most to the hero who wears it.
  const gemTier = Math.max(1, tier) as GemTier;
  for (let i = 0; i < set.length; i++) {
    const hero = set[i];
    if (hero === undefined) continue;
    for (const slot of Object.keys(hero.equipment) as SlotKey[]) {
      const sockets = hero.equipment[slot]?.sockets.length ?? 0;
      for (let s = 0; s < sockets; s++) {
        let best: { gem: ReturnType<typeof generateGem>; score: number } | null = null;
        for (const key of GEM_KEYS) {
          const gem = { ...generateGem({ rollSeed: rng.int(2 ** 31), stageIndex: S, generatorVersion: GENERATOR_VERSION }, gemTier), key };
          const item = hero.equipment[slot];
          if (item === undefined) continue;
          const trial: HeroConfig = { ...hero, equipment: { ...hero.equipment, [slot]: { ...item, sockets: item.sockets.map((sk, idx) => (idx === s ? { gem } : sk)) } } };
          const score = heroScore(trial, set);
          if (best === null || score > best.score) best = { gem, score };
        }
        const item = hero.equipment[slot];
        if (best !== null && item !== undefined) {
          hero.equipment = { ...hero.equipment, [slot]: { ...item, sockets: item.sockets.map((sk, idx) => (idx === s ? { gem: best!.gem } : sk)) } };
        }
      }
    }
  }
  return set;
}

/** The ceiling set's 60 s damage at a world for these heroes: geometric mean over ZONE_SET_DRAWS draws of the keys. */
export function ceilingDamage(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, seed: number, draws = ZONE_SET_DRAWS, tierOverride?: ItemTier): number {
  let logs = 0;
  let n = 0;
  for (let d = 0; d < draws; d++) {
    const dealt = wallDamage(zoneCeilingSet(party, bossStage, ZONE_SET_SEED + 7919 * d, tierOverride), bossStage, bonuses, seed);
    if (dealt <= 0) continue;
    logs += Math.log(dealt);
    n += 1;
  }
  return n > 0 ? Math.exp(logs / n) : 0;
}

// ── THE GRADUAL CEILING (round 4b, user decision 2026-11-16: «sube poco a poco») ───────────────────────────────────
// Within a difficulty the ceiling climbs from the top rarity of its world 1 (the previous difficulty's cap; Normal's
// world 1 tops out at T2, the starter table) to the difficulty's own cap in world 10: the ceiling's 60 s of damage is
// the straight blend, by (world − 1) / 9, of the ceiling set at the world-1 rarity and at the world-10 rarity (both at
// the world's item level, mid rolls, gems of their rarity). It replaces the plain ceiling, whose world 2 already
// counted a rarity that drops there on 0.1 % of items.

/** The rarities the gradual ceiling blends between in the difficulty of `bossStage`: its world 1 and world 10 tops. */
export function ceilingTierRange(bossStage: number): { from: ItemTier; to: ItemTier; t: number } {
  const d = Math.floor((bossStage - 1) / 100);
  const w = Math.floor(((bossStage - 1) % 100) / 10) + 1;
  return { from: topTierAt(d * 100 + 5), to: topTierAt(d * 100 + 95), t: (w - 1) / 9 };
}

/** The gradual ceiling's 60 s of damage at the wall `bossStage` for these heroes. */
export function gradualCeilingDamage(party: readonly HeroConfig[], bossStage: number, bonuses: Bonuses, seed: number, draws = ZONE_SET_DRAWS): number {
  const { from, to, t } = ceilingTierRange(bossStage);
  const hi = ceilingDamage(party, bossStage, bonuses, seed, draws, to);
  if (from === to || t >= 1) return hi;
  const lo = ceilingDamage(party, bossStage, bonuses, seed, draws, from);
  return lo + (hi - lo) * t;
}

// THE POWER CURVE (docs/redesign/POWER_CURVE.md; rama redesign/power-curve, 2026-11-22; user: «que no tengamos que
// medir cosas constantemente por 2 cambios minúsculos»). Every number of power — an item's stats, a hero's class
// stats, an enemy's life and hit — comes from ONE curve of the global stage, P(S). Items and heroes read it directly;
// enemies read it through the TYPICAL party of their zone (sim/reference.ts), so the two sides cannot drift apart.

import { MAX_GLOBAL_STAGE } from './difficulties';

/** +2 % a stage: ×1.22 a world, ≈ ×19 600 from 1-1 to Torment 10-10. */
export const POWER_GROWTH = 1.02;

/** P(S): the power of global stage `S` (1 at 1-1). Accepts fractional and out-of-range stages. */
export function powerAt(S: number): number {
  return POWER_GROWTH ** (Math.max(1, S) - 1);
}

// ── Levels ↔ stages ───────────────────────────────────────────────────────────────────────────────────────
// The level a party is meant to have at a stage is data/stageScaling expectedLevel (rounded); its continuous form
// and its inverse live here so a hero's class stats can follow the curve: a hero at the level expected of a zone
// has class stats proportional to that zone's P.
export const LEVEL_AT_END = 115; // the level expected at Torment 10-10 (120 is the post-completion grind)
export const LEVEL_CURVE_EXP = 1.6; // fast early, decelerating
/** Stages a level past LEVEL_AT_END is worth (the post-completion grind keeps growing). */
const STAGES_PER_LEVEL_PAST_END = 8;

/** The continuous level expected at global stage `S` (1 … LEVEL_AT_END over the 500 stages). */
export function levelCurve(S: number): number {
  const g = Math.max(0, Math.min(MAX_GLOBAL_STAGE, S));
  return LEVEL_AT_END * (1 - (1 - g / MAX_GLOBAL_STAGE) ** LEVEL_CURVE_EXP);
}

/** The global stage whose expected level is `level` (the inverse of levelCurve; past the end, a level is worth
 *  STAGES_PER_LEVEL_PAST_END stages). Level 1 is stage 1. */
export function stageAtLevel(level: number): number {
  if (level >= LEVEL_AT_END) return MAX_GLOBAL_STAGE + (level - LEVEL_AT_END) * STAGES_PER_LEVEL_PAST_END;
  const frac = Math.max(0, Math.min(1, level / LEVEL_AT_END));
  return Math.max(1, MAX_GLOBAL_STAGE * (1 - (1 - frac) ** (1 / LEVEL_CURVE_EXP)));
}

/** How much of the curve a level carries: a class's flat stats grow as P^LEVEL_POWER_EXP of the stage its level is
 *  expected at. Below 1 on purpose (2026-11-22, the fast probe): a level comes from experience, not from the zone, so
 *  a party a few levels behind (one that went through a difficulty faster) must not be several times weaker — the
 *  GEAR, which drops from the zone it fights in, carries the curve; the level is a gentler, secondary growth. */
export const LEVEL_POWER_EXP = 0.5;

/** × a class's flat stats at `level`. */
export function levelPower(level: number): number {
  return powerAt(stageAtLevel(level)) ** LEVEL_POWER_EXP;
}

// ── Items ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Global × on every FLAT affix (attack damage, life, armour, magic resist): the unit gear is written in. */
export const GEAR_POWER = 9;
/** × on every PERCENT affix (crit, crit damage, attack speed, multistrike, block, cooldown reduction, heal power).
 *  Percent affixes do NOT follow P: a point of crit is worth the same in Normal and in Torment; they grow only
 *  with rarity and with how many pieces carry them. */
export const PCT_SCALE = 6;
/** How an item's budget is split: the base affix weighs this, each substat 1. */
export const BASE_AFFIX_WEIGHT = 2;

/** The share of an item's budget one affix gets: the base affix (`isBase`) or one of its `subCount` substats. */
export function affixShare(isBase: boolean, subCount: number): number {
  const total = BASE_AFFIX_WEIGHT + Math.max(0, subCount);
  return (isBase ? BASE_AFFIX_WEIGHT : 1) / total;
}

/** A gem grants this share of one same-rarity, same-level item's budget (split over a two-stat gem). */
export const GEM_FRACTION = 0.3;

/** Item levels are stages. A drop's level: the stage it fell on, ~15 % a little above (+1 … +5), ~5 % an
 *  aspirational piece (+6 … +15) — at most ×1.35 of the zone's power. */
export const ILVL_TAIL = { smallChance: 0.15, smallMin: 1, smallSpan: 5, bigChance: 0.05, bigMin: 6, bigSpan: 10 } as const;

// ── The typical party of a zone (sim/reference.ts builds it; docs/redesign/POWER_CURVE.md §3) ─────────────────
/** Stages the typical party's gear lags the stage it fights on: what a player wears is what dropped over the last
 *  worlds (2026-11-22, the fast probe: a party arrives at a wall ~0.6 below a set only 8 stages old). */
export const REF_ILVL_LAG = 30;
/** The rarity the typical party wears, as a continuous position along the game (2026-11-22, the fast probe: the
 *  average player's worn rarity — 1.2 at the end of Normal's walls, 2.6 Hell, 3.2 Inferno, 4.0 Eternal, 4.2 Torment —
 *  grows smoothly; a quantile of each zone's own drop table jumped at every difficulty and the typical party with it).
 *  Linear between the points. */
export const REF_TIER_CURVE: readonly (readonly [number, number])[] = [[1, 0], [50, 1.2], [150, 2.6], [250, 3.2], [350, 4.0], [450, 4.2], [500, 4.4]];
export function refTierPosition(S: number): number {
  const pts = REF_TIER_CURVE;
  if (S <= pts[0]![0]) return pts[0]![1];
  for (let i = 1; i < pts.length; i++) {
    const [s1, t1] = pts[i]!;
    const [s0, t0] = pts[i - 1]!;
    if (S <= s1) return t0 + ((t1 - t0) * (S - s0)) / (s1 - s0);
  }
  return pts[pts.length - 1]![1];
}
/** (Kept for tooling: the quantile of a drop table a rarity sits at.) */
export const REF_TIER_QUANTILE = 0.6;
/** The share of the typical party's sockets that hold a gem (the average player keeps nearly all of them filled). */
export const REF_GEM_FILL = 0.9;

/** The rarity at quantile `q` of the drop table `weights`, as a CONTINUOUS position (a jewel is never below rarity
 *  1): 2.0 is all of rarity 2's mass below the quantile, 2.4 four tenths into rarity 3's. As a zone's table shifts
 *  world by world, the position slides smoothly — no jump the day the quantile crosses into a new rarity. */
export function tierPositionAtQuantile(weights: readonly number[], q: number, jewel = false): number {
  const from = jewel ? 1 : 0;
  let total = 0;
  for (let t = from; t < weights.length; t++) total += weights[t] ?? 0;
  if (total <= 0) return from;
  const target = q * total;
  let acc = 0;
  for (let t = from; t < weights.length; t++) {
    const w = weights[t] ?? 0;
    if (w > 0 && acc + w >= target - 1e-9) return Math.max(from, t - 1 + (target - acc) / w);
    acc += w;
  }
  return weights.length - 1;
}

/** The whole rarity at quantile `q` (the rarity whose mass holds it). */
export function tierAtQuantile(weights: readonly number[], q: number, jewel = false): number {
  return Math.ceil(tierPositionAtQuantile(weights, q, jewel) - 1e-9);
}

/** How much of the typical party's gear is on while a new game fills it in: nothing at 1-1, rising across Normal to
 *  all of it at its end (2026-11-22, the fast probe: a player in Normal stood at a third of a fully geared zone set —
 *  few chests yet, slots still empty or worn from the first worlds). From Hell on, all of it. */
export const REF_FILL_END_STAGE = 100;
export const REF_FILL_EXP = 0.6;
export function refGearFill(S: number): number {
  const t = Math.max(0, Math.min(1, (S - 1) / (REF_FILL_END_STAGE - 1)));
  return t ** REF_FILL_EXP;
}

/** The typical party's damage from its abilities and talents, as × its basic attacks', by its level: the allowance
 *  the enemies are sized with (sim/reference). It grows with the level because abilities, their ranks and the talents
 *  come with it — measured once against real fights (test/sim/probe/fast.ts calibration, 2026-11-22: ×0.8 at level 5,
 *  ×1.5 at 50, ×1.85 from 80 on). */
export const ABILITY_DPS_AT_LEVEL_1 = 0.8;
export const ABILITY_DPS_FULL = 1.85;
export const ABILITY_DPS_FULL_LEVEL = 80;
export function abilityDpsAllowance(level: number): number {
  const t = Math.max(0, Math.min(1, (level - 1) / (ABILITY_DPS_FULL_LEVEL - 1)));
  return ABILITY_DPS_AT_LEVEL_1 + (ABILITY_DPS_FULL - ABILITY_DPS_AT_LEVEL_1) * t;
}

// ── The walls (docs/redesign/POWER_CURVE.md §5) ─────────────────────────────────────────────────────────────
/** What a world boss asks, as × the typical party's damage over the minute before its enrage: low in Normal, rising
 *  smoothly world after world to the final boss. Below 1 the typical gear of the zone kills it in time; above 1 the
 *  party needs gear better than the zone's usual (farming: rarity, rolls, gems, the aspirational item levels). */
export const WALL_ASK_FIRST = 0.42;
export const WALL_ASK_LAST = 2.3;
/** 3.5: gentle early, steep toward the end (the final difficulty is the long grind). Fitted 2026-11-22 to the fast probe's hours per difficulty (a party
 *  reaches every wall ~0.6 below the typical standing — it moves on as soon as it can clear the stages — and the
 *  hours a wall costs grow with how far above that it asks). */
export const WALL_ASK_EXP = 3.5;
export function wallAsk(world: number): number {
  const t = Math.max(0, Math.min(1, (world - 1) / 49));
  return WALL_ASK_FIRST + (WALL_ASK_LAST - WALL_ASK_FIRST) * t ** WALL_ASK_EXP;
}

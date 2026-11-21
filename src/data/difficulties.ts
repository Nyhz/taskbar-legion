import type { ItemTier } from './tiers';

// The five DIFFICULTIES — the finite-model spine (docs/DIFFICULTY.md, canonical;
// supersedes the infinite/zone-wall model). Each difficulty is a full 10 worlds × 10
// stages and unlocks ONE new top gear/gem tier. Heroes/levels/gear/gems/tech carry
// across; the stage counter resets to 1-1 each difficulty while enemy POWER keeps
// rising (Hell 1-1 > Normal 10-10). Played in order; a difficulty unlocks by clearing
// the prior one's 10-10 world boss.
//
// This file holds the LOCKED structural facts (keys, names, tier cap, drop tables).
// The scaling KNOBS (the per-difficulty power multiplier D(d) and the X-10 wall
// multipliers) are added + tuned in Phase 2 when stageScaling.ts is re-parameterized —
// they are NOT here yet, so this file stays a pure, stable catalogue.

export type DifficultyKey = 'normal' | 'hell' | 'inferno' | 'eternal' | 'torment';

/** Canonical play order; the array index IS the difficulty index (0..4) used by `G`. */
export const DIFFICULTY_KEYS: readonly DifficultyKey[] = ['normal', 'hell', 'inferno', 'eternal', 'torment'] as const;

export const WORLDS_PER_DIFFICULTY = 10;
export const STAGES_PER_WORLD = 10;
export const STAGES_PER_DIFFICULTY = WORLDS_PER_DIFFICULTY * STAGES_PER_WORLD; // 100

export interface DifficultyDef {
  key: DifficultyKey;
  name: string;
  index: number; // 0..4 — position in play order; also the `G = index·100 + …` band
  /** Highest gear/gem tier this difficulty can drop (gear and gems share the cap). */
  tierCap: ItemTier;
  /** Drop table — relative weights indexed by tier 0..8 (0 = not in this pool). This is the table of the
   *  difficulty's LAST world: the worlds climb to it from the previous difficulty's table (`tierWeightsAt`,
   *  the per-world ladder). Rows sum to 100. */
  tierWeights: readonly number[];
}

// Drop tables (docs/DIFFICULTY.md §4) — each is the table of its difficulty's LAST world; see `tierWeightsAt`
// for the per-world ladder that climbs to it. MIDDLE-WEIGHTED pass: the two top tiers of every
// difficulty are fixed at 4 (just below the cap) and 1 (the cap chase), and the remaining weight
// is humped on the MIDDLE tiers of each difficulty's range, tapering toward the low trash — so most
// drops land in the mid band rather than the T0/T1 floor, while the endgame chase stays rare. Each
// row sums to 100.
// User, 2026-11-16 (round 4): the two top tiers HALVED (2 → 1, 7.5 → 4) — at 2 % a Torment run saw 60–75 T8 pieces
// and the party ended with 21–22 T8 of 30 slots. The 4.5 points taken went to the middle tiers (between the lowest
// tier with weight and the second-highest, exclusive) in proportion to their weight. Boss chests lift the two top tiers
// again (chests.ts BOSS_CHEST_TOP_TIER_MULT). Old rows: N 40.5/30/20/7.5/2 · H 12.5/25/33/20/7.5/2 ·
// I 7.5/15/24/28/16/7.5/2 · E 4.5/10/17/24/21/14/7.5/2 · T 0/5.5/12/19/24/18/12/7.5/2.
//                                  T0     T1     T2     T3     T4     T5     T6   T7  T8
const W_NORMAL  = [40.5,  32.7,  21.8,   4,     1,     0,     0,     0,  0] as const;
const W_HELL    = [12.5,  26.44, 34.91, 21.15,  4,     1,     0,     0,  0] as const;
const W_INFERNO = [ 7.5,  15.81, 25.3,  29.52, 16.87,  4,     1,     0,  0] as const;
const W_ETERNAL = [ 4.5,  10.52, 17.89, 25.26, 22.1,  14.73,  4,     1,  0] as const;
const W_TORMENT = [   0,   5.5,  12.64, 20.01, 25.26, 18.95, 12.64,  4,  1] as const;

export const DIFFICULTIES: Readonly<Record<DifficultyKey, DifficultyDef>> = {
  normal:  { key: 'normal',  name: 'Normal',  index: 0, tierCap: 4, tierWeights: W_NORMAL },
  hell:    { key: 'hell',    name: 'Hell',    index: 1, tierCap: 5, tierWeights: W_HELL },
  inferno: { key: 'inferno', name: 'Inferno', index: 2, tierCap: 6, tierWeights: W_INFERNO },
  eternal: { key: 'eternal', name: 'Eternal', index: 3, tierCap: 7, tierWeights: W_ETERNAL },
  torment: { key: 'torment', name: 'Torment', index: 4, tierCap: 8, tierWeights: W_TORMENT },
};

/** What drops in Normal's FIRST world, before the ladder starts climbing: plain gear, nothing epic or legendary. */
export const STARTER_TIER_WEIGHTS: readonly number[] = [80, 18, 2, 0, 0, 0, 0, 0, 0];

export const DIFFICULTY_COUNT = DIFFICULTY_KEYS.length;

export function difficultyDef(key: DifficultyKey): DifficultyDef {
  const def = DIFFICULTIES[key];
  if (def === undefined) throw new Error(`Unknown difficulty ${key}`);
  return def;
}

/** Difficulty by play-order index (0..4). Clamps out-of-range to the ends. */
export function difficultyByIndex(index: number): DifficultyDef {
  const clamped = Math.max(0, Math.min(DIFFICULTY_COUNT - 1, Math.floor(index)));
  return difficultyDef(DIFFICULTY_KEYS[clamped]!);
}

/** True when `tier` can drop in this difficulty (0 < weight, i.e. in-pool and ≤ cap). */
export function tierInPool(def: DifficultyDef, tier: ItemTier): boolean {
  return (def.tierWeights[tier] ?? 0) > 0;
}

// ── Finite global-stage decomposition (the canonical G semantics, DIFFICULTY.md §2) ──
// A global stage index G ∈ [1..MAX_GLOBAL_STAGE] is the engine's single monotonic anchor.
// G = difficultyIndex·100 + (world-1)·10 + stageInWorld. Difficulty is DERIVED from G — no
// separate state field. (These supersede stageScaling.ts's infinite `worldOf` for DISPLAY
// and difficulty-aware scaling; the global helpers there still drive boss/spawn internals
// until the Phase-2 magnitude refit lands.)

/** Total stages in the finite game: 5 difficulties × 100 = 500. The game ends at G=500
 *  (Torment 10-10) — there is no G=501. */
export const MAX_GLOBAL_STAGE = STAGES_PER_DIFFICULTY * DIFFICULTY_COUNT; // 500

/** Difficulty index (0..4) for a global stage G∈[1..500]. Clamps out-of-range. */
export function difficultyIndexOf(globalStage: number): number {
  const i = Math.floor((Math.max(1, globalStage) - 1) / STAGES_PER_DIFFICULTY);
  return Math.max(0, Math.min(DIFFICULTY_COUNT - 1, i));
}

/** Difficulty def for a global stage. */
export function difficultyOf(globalStage: number): DifficultyDef {
  return difficultyByIndex(difficultyIndexOf(globalStage));
}

/** Stage within its difficulty (1..100). */
export function localStageOf(globalStage: number): number {
  return ((Math.max(1, globalStage) - 1) % STAGES_PER_DIFFICULTY) + 1;
}

/** World within its difficulty (1..10). */
export function worldInDifficulty(globalStage: number): number {
  return Math.floor((localStageOf(globalStage) - 1) / STAGES_PER_WORLD) + 1;
}

/** The drop table of a global stage — THE PER-WORLD LADDER (user decision, 2026-11-15; it replaces the flat
 *  table per difficulty, under which a legendary could drop at stage 1-1). A difficulty starts where the
 *  previous one ended and only reaches its own table in its last world: world 1 rolls the previous difficulty's
 *  table (Normal: STARTER_TIER_WEIGHTS), world 10 the difficulty's `tierWeights`, the worlds between a straight
 *  blend of the two. So the new top rarity of a difficulty is absent in its first world and climbs to its 2 %. */
export function tierWeightsAt(globalStage: number): number[] {
  const index = difficultyIndexOf(globalStage);
  const to = difficultyByIndex(index).tierWeights;
  const from = index === 0 ? STARTER_TIER_WEIGHTS : difficultyByIndex(index - 1).tierWeights;
  const t = (worldInDifficulty(globalStage) - 1) / (WORLDS_PER_DIFFICULTY - 1);
  return to.map((w, tier) => (from[tier] ?? 0) + (w - (from[tier] ?? 0)) * t);
}

/** Stage within its world (1..10; 10 = the world boss). */
export function stageInWorldOf(globalStage: number): number {
  return ((Math.max(1, globalStage) - 1) % STAGES_PER_WORLD) + 1;
}

/** True when this is a world-boss stage (the 10th of any world). */
export function isWorldBossStage(globalStage: number): boolean {
  return stageInWorldOf(globalStage) === 10;
}

/** The world-boss (X-10) global stage of the zone CONTAINING `globalStage` — i.e. its
 *  (world, difficulty) identity. This is the canonical key for that zone's challenge keys:
 *  a stage-boss chest dropped anywhere in a world credits a key here, and entering the world
 *  boss consumes one. E.g. Hell 4-5 (135) → 140 (Hell 4-10); Normal 3-7 (27) → 30. */
export function worldBossStageOf(globalStage: number): number {
  return Math.floor((Math.max(1, globalStage) - 1) / STAGES_PER_WORLD) * STAGES_PER_WORLD + STAGES_PER_WORLD;
}

/** True when this is the final stage of the game (Torment 10-10). */
export function isFinalStage(globalStage: number): boolean {
  return globalStage >= MAX_GLOBAL_STAGE;
}

/** Inverse: global stage index for (difficultyIndex 0..4, world 1..10, stageInWorld 1..10). */
export function globalStageOf(difficultyIndex: number, world: number, stageInWorld: number): number {
  return difficultyIndex * STAGES_PER_DIFFICULTY + (world - 1) * STAGES_PER_WORLD + stageInWorld;
}

/** Display label, e.g. "Normal 3-7" / "Torment 10-10". */
export function stageLabelOf(globalStage: number): string {
  return `${difficultyOf(globalStage).name} ${worldInDifficulty(globalStage)}-${stageInWorldOf(globalStage)}`;
}

// (Heal-power effectiveness per difficulty — the "zone debuff" that devalued heal power 1 / 0.33 / 0.20 / 0.15 / 0.11 —
// was removed on 2026-11-21: heal power is no longer tier-scaled (data/stats), so it no longer balloons.)

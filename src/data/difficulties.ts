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
  /** LOCKED drop table — relative weights indexed by tier 0..8 (0 = not in this pool).
   *  One table per difficulty, NO depth-gate: every stage of the difficulty rolls from
   *  this same table; only enemy power changes with depth. Rows sum to 100. */
  tierWeights: readonly number[];
}

// Drop tables — LOCKED (docs/DIFFICULTY.md §4). Inferno→Torment is one sliding kernel
// [8,16,26,24,16,8,2] shifted up one tier per difficulty; Normal/Hell are the
// front-loaded ramp-in. The new top tier is always ~2% — the chase.
//                                  T0  T1  T2  T3  T4  T5  T6  T7  T8
const W_NORMAL  = [40, 32, 18,  8,  2,  0,  0,  0,  0] as const;
const W_HELL    = [12, 28, 30, 20,  8,  2,  0,  0,  0] as const;
const W_INFERNO = [ 8, 16, 26, 24, 16,  8,  2,  0,  0] as const;
const W_ETERNAL = [ 0,  8, 16, 26, 24, 16,  8,  2,  0] as const;
const W_TORMENT = [ 0,  0,  8, 16, 26, 24, 16,  8,  2] as const;

export const DIFFICULTIES: Readonly<Record<DifficultyKey, DifficultyDef>> = {
  normal:  { key: 'normal',  name: 'Normal',  index: 0, tierCap: 4, tierWeights: W_NORMAL },
  hell:    { key: 'hell',    name: 'Hell',    index: 1, tierCap: 5, tierWeights: W_HELL },
  inferno: { key: 'inferno', name: 'Inferno', index: 2, tierCap: 6, tierWeights: W_INFERNO },
  eternal: { key: 'eternal', name: 'Eternal', index: 3, tierCap: 7, tierWeights: W_ETERNAL },
  torment: { key: 'torment', name: 'Torment', index: 4, tierCap: 8, tierWeights: W_TORMENT },
};

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

/** Stage within its world (1..10; 10 = the world boss). */
export function stageInWorldOf(globalStage: number): number {
  return ((Math.max(1, globalStage) - 1) % STAGES_PER_WORLD) + 1;
}

/** True when this is a world-boss stage (the 10th of any world). */
export function isWorldBossStage(globalStage: number): boolean {
  return stageInWorldOf(globalStage) === 10;
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

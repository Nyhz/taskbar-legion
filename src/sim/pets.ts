import type { Rng } from './rng';
import { MILESTONE_PETS, PETS, PET_KEYS, petDef, type PetBonus, type PetObjectiveKind } from '@/data/pets';
import { STAGES_PER_DIFFICULTY } from '@/data/difficulties';

// Pets: the rare drop roll on kills (NOT from chests) and the RANKS. A pet is found at rank 1 and grows through
// its own objective — a count on its theme (data/pets.ts) kept per owned pet since it was found. Owning grants
// the bonus of its rank permanently; every owned pet progresses at once; the companion is cosmetic. Pure.

/** Progress of each owned pet towards its objective (pet key → what its objective has counted since it was found). */
export type PetProgress = Readonly<Record<string, number>>;
/** Rank of each owned pet (pet key → 1…). A pet that is not a key here is not owned. */
export type PetRanks = Readonly<Record<string, number>>;
/** What happened since the last count, by objective kind. */
export type PetFacts = Readonly<Partial<Record<PetObjectiveKind, number>>>;

/** Whether `key` is a pet of the game (a save may carry a key that no longer is). */
export function isPet(key: string): boolean {
  return PETS[key] !== undefined;
}

export function petMaxRank(key: string): number {
  return petDef(key).ranks.length;
}

/** The rank a pet has reached with `progress` on its objective: 1 when found, up to its last rank. */
export function petRank(key: string, progress: number): number {
  const { goals } = petDef(key).objective;
  let rank = 1;
  for (const goal of goals) {
    if (progress < goal) break;
    rank += 1;
  }
  return Math.min(rank, petMaxRank(key));
}

/** What a pet gives at `rank` (clamped to its ranks). */
export function petBonusAt(key: string, rank: number): PetBonus {
  const { ranks } = petDef(key);
  const bonus = ranks[Math.max(1, Math.min(ranks.length, Math.round(rank))) - 1];
  if (bonus === undefined) throw new Error(`Pet ${key} has no ranks`);
  return bonus;
}

export interface PetStanding {
  rank: number;
  maxRank: number;
  /** Counted so far and needed for the next rank, both measured from the start; `goal` is null at the last rank. */
  progress: number;
  goal: number | null;
  /** 0…1 of the way from this rank's start to the next rank (1 at the last rank). */
  fraction: number;
}

/** Where a pet stands on its objective. */
export function petStanding(key: string, progress: number): PetStanding {
  const { goals } = petDef(key).objective;
  const rank = petRank(key, progress);
  const maxRank = petMaxRank(key);
  const goal = rank >= maxRank ? null : (goals[rank - 1] ?? null);
  if (goal === null) return { rank, maxRank, progress, goal: null, fraction: 1 };
  const from = rank >= 2 ? (goals[rank - 2] ?? 0) : 0;
  const fraction = goal > from ? Math.max(0, Math.min(1, (progress - from) / (goal - from))) : 1;
  return { rank, maxRank, progress, goal, fraction };
}

/** The rank of every owned pet. */
export function petRanks(ownedKeys: readonly string[], progress: PetProgress): Record<string, number> {
  const ranks: Record<string, number> = {};
  for (const key of ownedKeys) if (isPet(key)) ranks[key] = petRank(key, progress[key] ?? 0);
  return ranks;
}

/** Add what happened (`facts`) to the objective of every owned pet. Returns the same object when nothing moved. */
export function advancePetProgress(ownedKeys: readonly string[], progress: PetProgress, facts: PetFacts): PetProgress {
  let next: Record<string, number> | null = null;
  for (const key of ownedKeys) {
    if (!isPet(key)) continue;
    const gained = facts[petDef(key).objective.kind] ?? 0;
    if (!(gained > 0)) continue;
    next ??= { ...progress };
    next[key] = (next[key] ?? 0) + gained;
  }
  return next ?? progress;
}

/** Chance of `key` dropping from one kill of `source`; 0 when the pet does not drop from that source. */
export function petDropChance(key: string, source: 'enemy' | 'boss'): number {
  const def = petDef(key);
  return def.dropSource === 'both' || def.dropSource === source ? def.baseDropChance : 0;
}

/** Chance that `key` has NOT dropped after `kills` normal kills and `bossKills` boss kills. */
export function petMissChance(key: string, kills: number, bossKills: number): number {
  return Math.pow(1 - petDropChance(key, 'enemy'), kills) * Math.pow(1 - petDropChance(key, 'boss'), bossKills);
}

/** Expected number of DIFFERENT pets found after `kills` normal kills and `bossKills` boss kills (each pet is
 *  found once: 1 − the chance of never dropping). Tuning helper for data/pets.ts. */
export function expectedPetsFound(kills: number, bossKills: number): number {
  let expected = 0;
  for (const key of PET_KEYS) expected += 1 - petMissChance(key, kills, bossKills);
  return expected;
}

/** Roll for a pet drop from a single kill. Returns a newly-dropped (unowned) key or null. Iterates
 *  deterministically; the first matching unowned hit wins. */
export function rollPetDrop(
  source: 'enemy' | 'boss',
  ownedKeys: readonly string[],
  rng: Rng,
): string | null {
  for (const key of PET_KEYS) {
    const chance = petDropChance(key, source);
    if (chance <= 0) continue;
    if (ownedKeys.includes(key)) {
      // Still consume a roll so ownership doesn't shift the RNG stream for others.
      rng.next();
      continue;
    }
    if (rng.chance(chance)) return key;
  }
  return null;
}

/** The milestone pets (data/pets MILESTONE_PETS) a player with this frontier should own and does not: those whose
 *  difficulty's last stage is cleared, minus `ownedKeys`. In table order. */
export function milestonePetsDue(maxClearedStage: number, ownedKeys: readonly string[]): string[] {
  return MILESTONE_PETS.filter((m) => maxClearedStage >= (m.difficulty + 1) * STAGES_PER_DIFFICULTY && !ownedKeys.includes(m.pet)).map((m) => m.pet);
}

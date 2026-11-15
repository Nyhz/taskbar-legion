import {
  ROLE_TRAITS, SUPPORT_AURA_COUNT, SUPPORT_AURA_KEYS, SUPPORT_MIN_STAGE, TRAIT_TUNING, auraValue, traitsOf,
  type EnemyRole, type EnemyTrait, type SupportAura,
} from '@/data/enemies';
import { STAGES_PER_DIFFICULTY, worldInDifficulty } from '@/data/difficulties';
import { EFFECTS } from '@/data/effects';

// What the wave enemies of a difficulty DO, as facts for the interface to word (the map's difficulty tooltip):
// each kind's traits with their numbers, and the support's auras. Everything is read from data/enemies.ts.

export interface TraitFact {
  role: EnemyRole;
  trait: EnemyTrait;
  /** The trait's own numbers (which ones depends on the trait): percentages, a multiplier, seconds, a count. */
  pct?: number;
  hp?: number;
  mult?: number;
  seconds?: number;
  every?: number;
}

export interface SupportFacts {
  /** How many different auras a support carries on this difficulty. */
  auras: number;
  /** The first world (1–10) of this difficulty with supports; undefined when it has them from its first world. */
  fromWorld?: number;
  /** Every aura it can carry and its strength here, in the list's order. */
  values: { key: SupportAura; value: number }[];
}

const KINDS: readonly EnemyRole[] = ['beast', 'soldier', 'shooter', 'brute'];

function traitFact(role: EnemyRole, trait: EnemyTrait): TraitFact {
  switch (trait) {
    case 'rage':
      return { role, trait, pct: TRAIT_TUNING.rage.attackSpeedPct, hp: TRAIT_TUNING.rage.hpBelow * 100 };
    case 'charge':
      return { role, trait, mult: TRAIT_TUNING.charge.mult };
    case 'lastBreath':
      return { role, trait, pct: TRAIT_TUNING.lastBreath.attackSpeedPct, seconds: TRAIT_TUNING.lastBreath.ms / 1000 };
    case 'chargedShot':
      return { role, trait, every: TRAIT_TUNING.chargedShot.every, mult: TRAIT_TUNING.chargedShot.mult };
    case 'tremor': {
      // The slow and its length are the effect's own (data/effects).
      const slow = EFFECTS[TRAIT_TUNING.tremor.effect];
      const pct = slow?.kind.type === 'statMod' ? Math.abs(slow.kind.value) : 0;
      return { role, trait, pct, seconds: (slow?.durationMs ?? 0) / 1000 };
    }
    case 'guard':
    case 'focusFire':
    case 'unstoppable':
      return { role, trait };
  }
}

/** The traits of the four kinds on difficulty `difficultyIndex` (0 Normal … 4 Torment), kind by kind. */
export function traitFacts(difficultyIndex: number): TraitFact[] {
  return KINDS.flatMap((role) => traitsOf(role, difficultyIndex).map((trait) => traitFact(role, trait)));
}

/** The support's auras on a difficulty. */
export function supportFacts(difficultyIndex: number): SupportFacts {
  const d = Math.max(0, Math.min(4, Math.floor(difficultyIndex)));
  const first = d * STAGES_PER_DIFFICULTY + 1;
  const fromWorld = SUPPORT_MIN_STAGE > first ? worldInDifficulty(SUPPORT_MIN_STAGE) : undefined;
  return {
    auras: SUPPORT_AURA_COUNT[d] ?? 1,
    ...(fromWorld === undefined ? {} : { fromWorld }),
    values: SUPPORT_AURA_KEYS.map((key) => ({ key, value: auraValue(key, d) })),
  };
}

/** Every trait a kind can have, on some difficulty (the interface must have a line for each). */
export function allTraits(): EnemyTrait[] {
  return [...new Set(Object.values(ROLE_TRAITS).flatMap((list) => list.map((t) => t.trait)))];
}

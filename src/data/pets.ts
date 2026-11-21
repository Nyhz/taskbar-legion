import type { ChestType } from './chests';

// Pets drop on kill (extremely rare — a late-game find). Owning one grants its bonus PERMANENTLY; all owned pets
// stack, and the one picked to accompany the party is COSMETIC only. Bonuses are economy/utility ONLY — never a
// combat stat (DATA_MODEL / SPEC §4.12).
//
// RANKS (redesign, 2026-11-15): a pet is found at rank 1 with a small part of its bonus and grows through ITS OWN
// OBJECTIVE — a count of something on its theme, counted from the moment it is owned, for every owned pet at
// once (no currency, no cost). Its last rank gives what the pet used to give at once. The rules live in
// sim/pets.ts; every number is here. ALL NUMBERS ARE PROVISIONAL until the pacing retune (they were set against
// the probe's kill counts of 2026-11-15, see `npm run probe`).

/** What a pet gives at one rank. */
export type PetBonus =
  | { kind: 'xpMult'; value: number }
  | { kind: 'goldMult'; value: number }
  | { kind: 'chestDropMult'; value: number }
  | { kind: 'chestStorage'; type: ChestType; value: number }
  | { kind: 'awayHours'; value: number }; // hours added to the away-time cap (sim/offline OFFLINE_CAP_MS)

/** What a pet's objective counts. Away-time banks gold and experience only, so only those two advance while away. */
export type PetObjectiveKind =
  | 'goldEarned' // gold from kills (after bonuses; away-time gold included)
  | 'xpEarned' // experience from kills, per hero (after bonuses; away-time experience included)
  | 'commonChestsOpened' // common chests opened, by hand or by auto-open
  | 'chestsFound' // chests of any kind dropped into storage
  | 'timePlayed' // milliseconds of active play
  | 'bossesDefeated'; // stage bosses and world bosses defeated

export interface PetObjective {
  kind: PetObjectiveKind;
  /** Progress that reaches rank 2, 3, …: one goal fewer than the pet has ranks, each larger than the last. */
  goals: readonly number[];
}

export interface PetDef {
  key: string;
  name: string;
  sprite: string;
  dropSource: 'enemy' | 'boss' | 'both';
  /** Chance per kill of its source ('both': the same chance on a normal kill and on a boss kill). */
  baseDropChance: number;
  /** What it gives at rank 1, 2, …; the last entry is its full bonus. A pet has as many ranks as entries. */
  ranks: readonly PetBonus[];
  objective: PetObjective;
}

// DROPS — flat per kill, the same in every difficulty. Measured with the probe on 2026-11-15 (2 seeds, the
// average player at 8 h a day, BEFORE the pacing retune — re-measure after it): cumulative normal kills / boss
// kills at the end of Normal 132,000 / 430, Hell 269,000 / 790, Inferno 638,000 / 1,680, Eternal 1,536,000 /
// 3,770. With the chances below the expected number of pets found is about 0.5 at the end of Normal (most
// players reach Hell with none, the rest with one), 1.0 after Hell, 2.0 after Inferno and 3.6 after Eternal:
// the last pets are a Torment find. Kills per difficulty grow on their own, so no multiplier is needed.
const ENEMY_DROP = 1 / 1_500_000; // 1 in a million and a half kills, per pet (user, 2026-11-15: rarer than the first 1 in a million)
const BOSS_DROP = 0.0002; // 1 in 5,000 boss kills, per pet (a boss-only pet has no other source)

const HOUR_MS = 3_600_000;
const percent = (kind: 'xpMult' | 'goldMult' | 'chestDropMult', values: readonly number[]): PetBonus[] => values.map((value) => ({ kind, value }));
const storage = (type: ChestType, values: readonly number[]): PetBonus[] => values.map((value) => ({ kind: 'chestStorage', type, value }));

// OBJECTIVES — goals set so the LAST rank is two to three weeks of play (110–170 active hours) at mid/late-game
// rates, and the first a few hours. Rates the probe measured per active hour, Normal → Eternal: gold 21,000 →
// 197,000; experience per hero 22,000 → 152,000; chests found about 85 → 120 (storage caps ignored); common
// chests opened 40 → 57; bosses defeated 14 → 22. Gold and experience also come in while away.
export const PETS: Record<string, PetDef> = {
  coin_sprite: {
    key: 'coin_sprite', name: 'Coin Sprite', sprite: 'coin_sprite', dropSource: 'both', baseDropChance: ENEMY_DROP,
    ranks: percent('goldMult', [0.03, 0.06, 0.09, 0.12, 0.15]),
    objective: { kind: 'goldEarned', goals: [250_000, 2_000_000, 10_000_000, 40_000_000] },
  },
  scholar_owl: {
    key: 'scholar_owl', name: 'Scholar Owl', sprite: 'scholar_owl', dropSource: 'both', baseDropChance: ENEMY_DROP,
    ranks: percent('xpMult', [0.03, 0.06, 0.09, 0.12, 0.15]),
    objective: { kind: 'xpEarned', goals: [250_000, 2_000_000, 8_000_000, 30_000_000] },
  },
  pack_mule: {
    key: 'pack_mule', name: 'Pack Mule', sprite: 'pack_mule', dropSource: 'boss', baseDropChance: BOSS_DROP,
    ranks: storage('normal', [1, 2, 3]), // whole slots: three ranks, the last one slot above the old +2
    objective: { kind: 'commonChestsOpened', goals: [500, 5_000] },
  },
  lucky_cat: {
    key: 'lucky_cat', name: 'Lucky Cat', sprite: 'lucky_cat', dropSource: 'both', baseDropChance: ENEMY_DROP,
    ranks: percent('chestDropMult', [0.03, 0.05, 0.07, 0.09, 0.12]),
    objective: { kind: 'chestsFound', goals: [150, 1_000, 4_000, 12_000] },
  },
  time_imp: {
    key: 'time_imp', name: 'Time Imp', sprite: 'time_imp', dropSource: 'both', baseDropChance: ENEMY_DROP,
    // "It moves the clock forward when nobody is looking": away time counts 8 h without it, up to 18 h with it.
    ranks: [2, 4, 6, 8, 10].map((value) => ({ kind: 'awayHours', value })),
    objective: { kind: 'timePlayed', goals: [10 * HOUR_MS, 40 * HOUR_MS, 100 * HOUR_MS, 250 * HOUR_MS] }, // the user's numbers
  },
  hoarder: {
    key: 'hoarder', name: 'Hoarder', sprite: 'hoarder', dropSource: 'boss', baseDropChance: BOSS_DROP,
    ranks: storage('stageBoss', [1, 2]), // whole slots: two ranks, the last one slot above the old +1
    objective: { kind: 'bossesDefeated', goals: [2_000] },
  },
};

export const PET_KEYS: string[] = Object.keys(PETS);

/** MILESTONE PETS (user, 2026-11-21): a pet handed over the first time a whole difficulty is beaten (its 10-10), so
 *  every player owns at least two by the end of Hell however the drops went. A player who already found it gets
 *  nothing extra. `difficulty` is the index (0 = Normal). */
export const MILESTONE_PETS: readonly { pet: string; difficulty: number }[] = [
  { pet: 'coin_sprite', difficulty: 0 }, // the gold pet, at the end of Normal
  { pet: 'scholar_owl', difficulty: 1 }, // the experience pet, at the end of Hell
];

export function petDef(key: string): PetDef {
  const def = PETS[key];
  if (def === undefined) throw new Error(`Unknown pet ${key}`);
  return def;
}

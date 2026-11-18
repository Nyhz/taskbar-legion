// Chest config (DATA_MODEL + BALANCE). Loot does NOT drop from enemies — kills
// yield chests (3 types, capped storage). When a type's storage is full it stops
// accumulating (no overflow). Auto-open tech opens all chests on an interval.

import { tierWeightsAt } from './difficulties';

export type ChestType = 'normal' | 'stageBoss' | 'zoneBoss';

export interface ChestStack {
  type: ChestType;
  /** globalStageIndex where this chest dropped. On open it drives BOTH the loot tier
   *  and the zone its key credits — never where/when it's opened. Chests stack per
   *  (type, dropStage), so a type can have several stacks from different stages. */
  dropStage: number;
  count: number; // unopened; the per-TYPE total (summed across drop stages) <= capacity[type]
}

/** Total unopened chests of a type, summed across all its drop-stage stacks. */
export function chestCountOf(chests: ChestStack[], type: ChestType): number {
  return chests.reduce((n, c) => (c.type === type ? n + c.count : n), 0);
}

export interface ChestDropConfig {
  baseDropChance: Record<ChestType, number>; // before tech mult, per relevant kill
  capacity: Record<ChestType, number>; // before tech/pet bonus
  itemsPerChest: Record<ChestType, number>; // items rolled on open
  gemChance: Record<ChestType, number>; // per chest opened → a tiered gem
}

export const CHEST_CONFIG: ChestDropConfig = {
  // Nerfed again (player feedback: tech mults flooded the bag): at 1% a full stage
  // (~100 trash kills over 20 waves) drops ~1 normal chest before tech bonuses; stage
  // bosses (W-1..W-9) drop their chest 25% of the time; the zone boss (W-10) always does.
  // Common chests: 0.5% per kill since round 18 (was 0.2%, user decision 2026-11-15: "caen demasiados cofres normales" at 1.5% —
  // one or two a minute; now about one every five minutes of play, so the storage of 6 fills in half an hour).
  baseDropChance: { normal: 0.005, stageBoss: 0.25, zoneBoss: 1.0 }, // round 18 (2026-11-18, user): common 0.2 % → 0.5 % (1 in 200)
  capacity: { normal: 6, stageBoss: 4, zoneBoss: 4 },
  itemsPerChest: { normal: 1, stageBoss: 1, zoneBoss: 1 }, // every chest = exactly 1 item
  // Gem chance per chest opened (× gemDropMult tech, capped at 1.0). The ONLY thing that
  // differs between chest TYPES besides the boss lift of the two top rarities (BOSS_CHEST_TOP_TIER_MULT below,
  // docs/DIFFICULTY.md §4): normal chests stay the rare trickle (10%) while boss chests are a
  // reliable gem source — stage-boss chest = 50%, world-boss chest = 100% (always a bonus gem).
  gemChance: { normal: 0.1, stageBoss: 0.5, zoneBoss: 1.0 },
};

export const CHEST_TYPES: ChestType[] = ['normal', 'stageBoss', 'zoneBoss'];

// Challenge-key drop: each STAGE-BOSS chest opened has this chance to also yield one world-boss key for its
// zone (world+difficulty). Keys gate entering the X-10 world boss: one is spent per attempt, the first too, even
// on a wipe. User, 2026-11-15 (round 2): "mantenemos 25% cofre y llave al 25% también" → one key per ~16 stage
// bosses (it was 0.5 until today, then 0.1 for a few hours).
export const STAGE_KEY_DROP_CHANCE = 0.25;
// OPTION A (user decision, 2026-11-15, wired 2026-11-16): the FIRST clear of a world's X-9 gives one key of that
// world outright (FIRST_CLEAR_KEYS, granted by the sim — Simulation.handleClear → world.pending.keys), on every
// difficulty, so the first attempt never waits; after it, a quarter of the stage-boss chests hold one — Normal too.
export const STAGE_KEY_DROP_CHANCE_BY_DIFFICULTY: readonly number[] = [STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE];
/** Keys of its world the first clear of an X-9 gives (option A). */
export const FIRST_CLEAR_KEYS = 1;
/** The chance that a stage-boss chest dropped at global stage `S` holds a world-boss key. */
export function stageKeyDropChance(S: number): number {
  return STAGE_KEY_DROP_CHANCE_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor((Math.max(1, S) - 1) / 100)))] ?? STAGE_KEY_DROP_CHANCE;
}

/** Auto-open interval: 30-min base (user decision, 2026-11-15: with a common chest every ~5 minutes the old
 *  15 minutes fired on a storage that was never full), shaved 90s per rank by the `auto_open` tech (12 ranks)
 *  down to the 12-min floor (30m − 12×90s) — the same proportions as before, doubled. */
export const AUTO_OPEN_BASE_INTERVAL_MS = 1_800_000; // 30 min
export const AUTO_OPEN_FLOOR_MS = 720_000; // 12 min (30m − 12×90s)

// BOSS CHESTS ROLL A BETTER TABLE (user, 2026-11-16, round 4): the TWO highest rarities of the world's table are
// multiplied — a stage-boss chest ×1.5, the world-boss chest ×3 — and the rest of the table is scaled down so it still
// sums to 100 (a common chest rolls the table as it is). Items AND the chest's gem roll from it.
export const BOSS_CHEST_TOP_TIER_MULT: Readonly<Record<ChestType, number>> = { normal: 1, stageBoss: 1.5, zoneBoss: 3 };
/** How many of the highest rarities with weight a boss chest lifts. */
export const BOSS_CHEST_TOP_TIERS = 2;

/** The rarity table a chest of `type` dropped at global stage `S` rolls (sums to 100). */
export function chestTierWeightsAt(S: number, type: ChestType = 'normal'): number[] {
  const base = tierWeightsAt(S);
  const mult = BOSS_CHEST_TOP_TIER_MULT[type];
  if (mult === 1) return base;
  const top = base.map((w, t) => (w > 0 ? t : -1)).filter((t) => t >= 0).slice(-BOSS_CHEST_TOP_TIERS);
  const topSum = top.reduce((a, t) => a + (base[t] ?? 0), 0);
  const lifted = topSum * mult;
  const restSum = 100 - topSum;
  const restScale = restSum > 0 ? Math.max(0, 100 - lifted) / restSum : 0;
  return base.map((w, t) => (top.includes(t) ? w * mult : w * restScale));
}

// Chest config (DATA_MODEL + BALANCE). Loot does NOT drop from enemies — kills
// yield chests (3 types, capped storage). When a type's storage is full it stops
// accumulating (no overflow). Auto-open tech opens all chests on an interval.

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
  // Common chests: 0.2% per kill (user decision, 2026-11-15: "caen demasiados cofres normales" at 1.5% —
  // one or two a minute; now about one every five minutes of play, so the storage of 6 fills in half an hour).
  baseDropChance: { normal: 0.002, stageBoss: 0.25, zoneBoss: 1.0 },
  capacity: { normal: 6, stageBoss: 4, zoneBoss: 4 },
  itemsPerChest: { normal: 1, stageBoss: 1, zoneBoss: 1 }, // every chest = exactly 1 item
  // Gem chance per chest opened (× gemDropMult tech, capped at 1.0). The ONLY thing that
  // differs between chest TYPES (the item tier table is identical across them —
  // docs/DIFFICULTY.md §4): normal chests stay the rare trickle (7.5%) while boss chests are a
  // reliable gem source — stage-boss chest = 50%, world-boss chest = 100% (always a bonus gem).
  gemChance: { normal: 0.1, stageBoss: 0.5, zoneBoss: 1.0 },
};

export const CHEST_TYPES: ChestType[] = ['normal', 'stageBoss', 'zoneBoss'];

// Challenge-key drop: each STAGE-BOSS chest opened has this chance to also yield one world-boss key for its
// zone (world+difficulty). Keys gate entering the X-10 world boss: one is spent per attempt, the first too, even
// on a wipe. User, 2026-11-15 (round 2): "mantenemos 25% cofre y llave al 25% también" → one key per ~16 stage
// bosses (it was 0.5 until today, then 0.1 for a few hours).
export const STAGE_KEY_DROP_CHANCE = 0.25;
// NORMAL is the exception: there EVERY stage-boss chest holds a key. He wants Normal strolled through in three
// or four hours ("keys are no obstacle"): at 25 % more than half the players would reach each of its ten world
// bosses without a key and repeat X-9 some sixteen times — three quarters of an hour a world, Normal's whole
// budget twice over. With a key in every chest nine players in ten have theirs before they reach the boss.
export const STAGE_KEY_DROP_CHANCE_BY_DIFFICULTY: readonly number[] = [1, STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE, STAGE_KEY_DROP_CHANCE];
/** The chance that a stage-boss chest dropped at global stage `S` holds a world-boss key. */
export function stageKeyDropChance(S: number): number {
  return STAGE_KEY_DROP_CHANCE_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor((Math.max(1, S) - 1) / 100)))] ?? STAGE_KEY_DROP_CHANCE;
}

/** Auto-open interval: 30-min base (user decision, 2026-11-15: with a common chest every ~5 minutes the old
 *  15 minutes fired on a storage that was never full), shaved 90s per rank by the `auto_open` tech (12 ranks)
 *  down to the 12-min floor (30m − 12×90s) — the same proportions as before, doubled. */
export const AUTO_OPEN_BASE_INTERVAL_MS = 1_800_000; // 30 min
export const AUTO_OPEN_FLOOR_MS = 720_000; // 12 min (30m − 12×90s)

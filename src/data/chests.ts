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
  zoneKeyChance: Record<ChestType, number>; // per chest opened → a zone key
  gemChance: Record<ChestType, number>; // per chest opened → a tiered gem
}

export const CHEST_CONFIG: ChestDropConfig = {
  // Nerfed again (player feedback: tech mults flooded the bag): at 1% a full stage
  // (~100 trash kills over 20 waves) drops ~1 normal chest before tech bonuses; stage
  // bosses (W-1..W-9) drop their chest 25% of the time; the zone boss (W-10) always does.
  baseDropChance: { normal: 0.02, stageBoss: 0.25, zoneBoss: 1.0 },
  capacity: { normal: 6, stageBoss: 4, zoneBoss: 4 },
  itemsPerChest: { normal: 1, stageBoss: 1, zoneBoss: 1 }, // every chest = exactly 1 item
  // Zone-key supply. Two rolls gate it: a stage boss drops its chest only ~25% of the time
  // (baseDropChance.stageBoss = the "sometimes"); when it DOES, that chest always holds a
  // key. Net ≈ 1 key per 4 stage-boss kills (~2 per world) — enough for the W-10 gate plus a
  // few zone-boss retries. zoneBoss chests give NO key: that key would be for the world you
  // just cleared, so it's useless. A small trickle still comes from normal chests.
  zoneKeyChance: { normal: 0.02, stageBoss: 1.0, zoneBoss: 0 },
  gemChance: { normal: 0.05, stageBoss: 0.12, zoneBoss: 0.25 },
};

export const CHEST_TYPES: ChestType[] = ['normal', 'stageBoss', 'zoneBoss'];

/** Auto-open base interval (10 min); reducible by tech down to this floor. */
export const AUTO_OPEN_BASE_INTERVAL_MS = 600_000;
export const AUTO_OPEN_FLOOR_MS = 60_000;

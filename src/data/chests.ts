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
  baseDropChance: { normal: 0.015, stageBoss: 0.25, zoneBoss: 1.0 },
  capacity: { normal: 6, stageBoss: 4, zoneBoss: 4 },
  itemsPerChest: { normal: 1, stageBoss: 1, zoneBoss: 1 }, // every chest = exactly 1 item
  // Gem chance per chest opened. The ONLY thing that differs between chest TYPES (the item
  // tier table is identical across them — docs/DIFFICULTY.md §4): stage-boss chest = ×2 the
  // normal gem chance, world-boss chest = ×4. (Phase 3 may retune the base 0.05.)
  gemChance: { normal: 0.05, stageBoss: 0.10, zoneBoss: 0.20 },
};

export const CHEST_TYPES: ChestType[] = ['normal', 'stageBoss', 'zoneBoss'];

/** Auto-open interval: 15-min base, shaved 45s per rank by the `auto_open` tech (12 ranks)
 *  down to the 6-min floor (15m − 12×45s). */
export const AUTO_OPEN_BASE_INTERVAL_MS = 900_000; // 15 min
export const AUTO_OPEN_FLOOR_MS = 360_000; // 6 min (15m − 12×45s)

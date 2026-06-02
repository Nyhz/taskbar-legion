import type { Rng } from './rng';
import type { WorldState } from './world';
import type { ItemInstance } from './items';
import { generateItem, rollTier } from './loot';
import type { GemInstance, GemTier } from '@/data/gems';
import { generateGem } from './gems';
import type { ChestStack, ChestType } from '@/data/chests';
import { CHEST_CONFIG, AUTO_OPEN_BASE_INTERVAL_MS, AUTO_OPEN_FLOOR_MS, chestCountOf } from '@/data/chests';
import { TIER_CHEST_FACTOR, GENERATOR_VERSION } from '@/data/lootTables';
import { worldOf } from '@/data/stageScaling';
import type { Bonuses } from './bonuses';

// Chest accrual (per-type caps halt accrual — no overflow) and opening → loot,
// tiered gems, and zone keys. Pets are NOT here (they drop on kill — sim/pets.ts).
// Each chest remembers the stage it dropped on, so on open BOTH its loot tier and its
// key's zone come from that drop point — not from where/when the player opens it.

export interface ChestOpenResult {
  items: ItemInstance[];
  gems: GemInstance[];
  keys: number; // total keys rolled (for popups)
  keysByZone: Record<number, number>; // world index → keys credited (by each chest's drop zone)
}

export function chestCapacity(type: ChestType, bonuses: Bonuses): number {
  return CHEST_CONFIG.capacity[type] + bonuses.chestStorageBonus[type];
}

/** Effective per-kill drop chance for a chest type (0..1). The single source of
 *  truth for the roll in `tryAccrueChest` — the UI reads it too so the displayed
 *  number always matches the sim. The per-type mult is MULTIPLICATIVE on the base:
 *  base × global × type, NOT base + flat (see CHEST_CONFIG.baseDropChance). */
export function chestDropChance(type: ChestType, bonuses: Bonuses): number {
  return Math.min(1, CHEST_CONFIG.baseDropChance[type] * bonuses.chestDropMult * bonuses.chestTypeDropMult[type]);
}

/** Auto-open interval after tech/pet reductions, floored. */
export function autoOpenIntervalMs(bonuses: Bonuses): number {
  return Math.max(AUTO_OPEN_FLOOR_MS, AUTO_OPEN_BASE_INTERVAL_MS - bonuses.autoOpenReduceMs);
}

function addChest(world: WorldState, type: ChestType, dropStage: number, n: number): void {
  const stack = world.chests.find((c) => c.type === type && c.dropStage === dropStage);
  if (stack !== undefined) stack.count += n;
  else world.chests.push({ type, dropStage, count: n });
}

/** Roll a chest drop on a relevant kill. When the type's storage is full, it
 *  stops accumulating (SPEC §4.8). The chest is stamped with the current stage so its
 *  loot tier + key zone are fixed at drop time. Returns true if a chest was stored. */
export function tryAccrueChest(
  world: WorldState,
  type: ChestType,
  rng: Rng,
  bonuses: Bonuses,
): boolean {
  if (!rng.chance(chestDropChance(type, bonuses))) return false;
  if (chestCountOf(world.chests, type) >= chestCapacity(type, bonuses)) return false; // full → no overflow
  addChest(world, type, world.globalStageIndex, 1);
  return true;
}

function seedFrom(rng: Rng): number {
  return Math.floor(rng.next() * 0x1_0000_0000) >>> 0;
}

/** Distinct class keys currently in the party — the only classes a weapon/off-hand
 *  may drop for (a warrior-only party never sees bows/quivers/wands/tomes). Order
 *  follows roster order (deterministic). Empty ⇒ loot falls back to any launch class. */
function partyClassKeys(world: WorldState): string[] {
  const set = new Set<string>();
  for (const h of world.heroes) if (h.classKey !== undefined) set.add(h.classKey);
  return [...set];
}

/** Open one chest of `type` at stage `S`: ALWAYS drops its gear piece(s), PLUS an
 *  independent (rarer) gem roll on top — a gem is EXTRA loot, never a replacement —
 *  PLUS an independent zone-key roll. Boss/zone chests roll gems a touch more often
 *  (CHEST_CONFIG.gemChance: normal < stageBoss < zoneBoss). */
export function openChest(
  type: ChestType,
  S: number,
  rng: Rng,
  bonuses: Bonuses,
  allowedClasses?: string[],
): ChestOpenResult {
  const items: ItemInstance[] = [];
  const gems: GemInstance[] = [];
  // Gear: every chest yields its item(s).
  for (let i = 0; i < CHEST_CONFIG.itemsPerChest[type]; i++) {
    items.push(
      generateItem(
        { rollSeed: seedFrom(rng), stageIndex: S, chestType: type, generatorVersion: GENERATOR_VERSION },
        allowedClasses,
      ),
    );
  }
  // Gem: an independent EXTRA roll on top of the gear — its own chance, never displacing
  // the gear piece. Higher for boss/zone chests so they feel more rewarding.
  if (rng.chance(Math.min(1, CHEST_CONFIG.gemChance[type] * bonuses.gemDropMult))) {
    const tier = rollTier(S, TIER_CHEST_FACTOR[type], rng, 1) as GemTier; // T1–T8, no T0 gem
    gems.push(generateGem({ rollSeed: seedFrom(rng), stageIndex: S, generatorVersion: GENERATOR_VERSION }, tier));
  }

  let keys = 0;
  if (rng.chance(Math.min(1, CHEST_CONFIG.zoneKeyChance[type] * bonuses.zoneKeyMult))) keys = 1;

  return { items, gems, keys, keysByZone: {} };
}

// Empty open
function emptyResult(): ChestOpenResult {
  return { items: [], gems: [], keys: 0, keysByZone: {} };
}

/** Open one stack: roll each chest at its OWN dropStage (loot tier) and credit its key
 *  to the stack's drop zone. Empties the stack; mutates `merged` in place. */
function openStack(
  merged: ChestOpenResult,
  stack: ChestStack,
  rng: Rng,
  bonuses: Bonuses,
  allowedClasses: string[],
): void {
  const n = stack.count;
  stack.count = 0;
  const zone = worldOf(stack.dropStage);
  for (let i = 0; i < n; i++) {
    const r = openChest(stack.type, stack.dropStage, rng, bonuses, allowedClasses);
    merged.items.push(...r.items);
    merged.gems.push(...r.gems);
    if (r.keys > 0) {
      merged.keys += r.keys;
      merged.keysByZone[zone] = (merged.keysByZone[zone] ?? 0) + r.keys;
    }
  }
}

/** Open every stored chest of a single `type` (the per-popup open). Empties that
 *  type's stacks and returns the merged loot (keys credited by each chest's drop zone). */
export function openType(world: WorldState, type: ChestType, rng: Rng, bonuses: Bonuses): ChestOpenResult {
  const merged = emptyResult();
  const allowed = partyClassKeys(world);
  for (const stack of world.chests) {
    if (stack.type === type) openStack(merged, stack, rng, bonuses, allowed);
  }
  world.chests = world.chests.filter((c) => c.count > 0);
  return merged;
}

/** Open every stored chest (auto-open / Open All). Empties world.chests and returns
 *  the merged loot (keys credited by each chest's drop zone). */
export function openAll(world: WorldState, rng: Rng, bonuses: Bonuses): ChestOpenResult {
  const merged = emptyResult();
  const allowed = partyClassKeys(world);
  for (const stack of world.chests) openStack(merged, stack, rng, bonuses, allowed);
  world.chests = world.chests.filter((c) => c.count > 0);
  return merged;
}

import type { Rng } from './rng';
import { deriveSeed64, makeRng64 } from './rng';
import type { WorldState } from './world';
import type { ItemInstance } from './items';
import { generateItem, rollTier } from './loot';
import type { GemInstance, GemTier } from '@/data/gems';
import { generateGem } from './gems';
import type { ChestStack, ChestType } from '@/data/chests';
import { CHEST_CONFIG, AUTO_OPEN_BASE_INTERVAL_MS, AUTO_OPEN_FLOOR_MS, STAGE_KEY_DROP_CHANCE, chestCountOf } from '@/data/chests';
import { worldBossStageOf } from '@/data/difficulties';
import { GENERATOR_VERSION } from '@/data/lootTables';
import type { Bonuses } from './bonuses';

// Chest accrual (per-type caps halt accrual — no overflow) and opening → loot +
// tiered gems. Pets are NOT here (they drop on kill — sim/pets.ts). Each chest
// remembers the stage it dropped on, so on open its loot tier comes from that drop
// point — not from where/when the player opens it.

export interface ChestOpenResult {
  items: ItemInstance[];
  gems: GemInstance[];
  keys: Record<number, number>; // worldBossStage → challenge keys earned (stage-boss chests only)
}

// Counter-based loot derivation: instead of carrying an opaque PRNG cursor across saves,
// we persist `n` — the count of chests EVER opened. Each chest derives its own fresh
// 64-bit-seeded rng from (seed, n), then n advances. The stream never repeats in any
// practical play, and the Nth-ever drop is directly reproducible from (seed, n).
export interface LootDraw {
  seed: number; // the game seed (stable per game)
  n: number; // monotonic index of the next chest to open
}

/** Fresh rng for the next chest; advances the draw cursor. */
function nextChestRng(draw: LootDraw): Rng {
  const rng = makeRng64(deriveSeed64(draw.seed, draw.n));
  draw.n += 1;
  return rng;
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
  chanceMult = 1, // elites double their drop chance (ELITE_CHEST_MULT)
): boolean {
  if (!rng.chance(Math.min(1, chestDropChance(type, bonuses) * chanceMult))) return false;
  if (chestCountOf(world.chests, type) >= chestCapacity(type, bonuses)) return false; // full → no overflow
  addChest(world, type, world.globalStageIndex, 1);
  return true;
}

function seedFrom(rng: Rng): number {
  return Math.floor(rng.next() * 0x1_0000_0000) >>> 0;
}

/** Distinct class keys currently in the party — the only classes a weapon/off-hand
 *  may drop for (a knight-only party never sees bows/quivers/wands/tomes). Order
 *  follows roster order (deterministic). Empty ⇒ loot falls back to any launch class. */
function partyClassKeys(world: WorldState): string[] {
  const set = new Set<string>();
  for (const h of world.heroes) if (h.classKey !== undefined) set.add(h.classKey);
  return [...set];
}

/** Open one chest of `type` at stage `S`: ALWAYS drops its gear piece(s), PLUS an
 *  independent (rarer) gem roll on top — a gem is EXTRA loot, never a replacement.
 *  Boss/zone chests roll gems more often (CHEST_CONFIG.gemChance: stageBoss ×2,
 *  zoneBoss ×4 the normal chance). */
export function openChest(
  type: ChestType,
  S: number,
  rng: Rng,
  bonuses: Bonuses,
  allowedClasses?: string[],
): ChestOpenResult {
  const items: ItemInstance[] = [];
  const gems: GemInstance[] = [];
  const keys: Record<number, number> = {};
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
    // Gem tier uses the SAME per-difficulty tier distribution as ITEMS (full tierWeights,
    // minTier 0), so e.g. a Hell T5 drops at the same % for gems as for gear. Gems have no T0
    // (GemTier is 1–8), so a T0 roll folds up to T1 — its floor — leaving every T≥1 % identical.
    const tier = Math.max(1, rollTier(S, rng, 0)) as GemTier;
    gems.push(generateGem({ rollSeed: seedFrom(rng), stageIndex: S, generatorVersion: GENERATOR_VERSION }, tier));
  }
  // Challenge key: STAGE-BOSS chests only. Rolled AFTER the gem so the gear+gem stream is
  // unchanged. Credits the world boss of this chest's zone (worldBossStageOf its dropStage S).
  if (type === 'stageBoss' && rng.chance(STAGE_KEY_DROP_CHANCE)) {
    keys[worldBossStageOf(S)] = (keys[worldBossStageOf(S)] ?? 0) + 1;
  }

  return { items, gems, keys };
}

// Empty open
function emptyResult(): ChestOpenResult {
  return { items: [], gems: [], keys: {} };
}

/** Open one stack: roll each chest at its OWN dropStage (loot tier), each from its own
 *  derived rng (draw cursor advances per chest). Empties the stack; mutates `merged`. */
function openStack(
  merged: ChestOpenResult,
  stack: ChestStack,
  draw: LootDraw,
  bonuses: Bonuses,
  allowedClasses: string[],
): void {
  const n = stack.count;
  stack.count = 0;
  for (let i = 0; i < n; i++) {
    const r = openChest(stack.type, stack.dropStage, nextChestRng(draw), bonuses, allowedClasses);
    merged.items.push(...r.items);
    merged.gems.push(...r.gems);
    for (const [bossStage, count] of Object.entries(r.keys)) {
      merged.keys[Number(bossStage)] = (merged.keys[Number(bossStage)] ?? 0) + count;
    }
  }
}

/** Open every stored chest of a single `type` (the per-popup open). Empties that
 *  type's stacks and returns the merged loot; `draw` advances by the chests opened. */
export function openType(world: WorldState, type: ChestType, draw: LootDraw, bonuses: Bonuses): ChestOpenResult {
  const merged = emptyResult();
  const allowed = partyClassKeys(world);
  for (const stack of world.chests) {
    if (stack.type === type) openStack(merged, stack, draw, bonuses, allowed);
  }
  world.chests = world.chests.filter((c) => c.count > 0);
  return merged;
}

/** Open every stored chest (auto-open / Open All). Empties world.chests and returns
 *  the merged loot; `draw` advances by the chests opened. */
export function openAll(world: WorldState, draw: LootDraw, bonuses: Bonuses): ChestOpenResult {
  const merged = emptyResult();
  const allowed = partyClassKeys(world);
  for (const stack of world.chests) openStack(merged, stack, draw, bonuses, allowed);
  world.chests = world.chests.filter((c) => c.count > 0);
  return merged;
}

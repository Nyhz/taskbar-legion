import type { ItemInstance } from './items';
import { composeItem, rollStatValue, itemSubstatPool, type ItemOrigin } from './loot';
import { makeRng } from './rng';
import { SLOT_KEYS } from '@/data/itemSlots';
import type { StatKey } from '@/data/stats';
import type { ItemTier } from '@/data/tiers';
import { tierDef } from '@/data/tiers';
import type { GemInstance, GemTier } from '@/data/gems';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { ALCHEMY_BASE, ALCHEMY_TIER_MULT, SYNTH_DOUBLE_TIER_CHANCE } from '@/data/cube';

// The Cube's three recipes (all PURE + deterministic — no Math.random / Date):
//  • Synthesize: 9 same-tier items → 1 of the next tier, ilvl = MEDIAN of the inputs.
//  • Alchemy:    melt items → gold (per-item value by tier + ilvl).
//  • Transfigure: re-roll ONE affix into a different stat, paid with two gems.

export const CUBE_INPUT_COUNT = 9;

// ───────────────────────────── Synthesize ─────────────────────────────

export function canSynthesize(items: readonly ItemInstance[]): boolean {
  if (items.length !== CUBE_INPUT_COUNT) return false;
  const tier = items[0]?.tier;
  return tier !== undefined && tier < 8 && items.every((i) => i.tier === tier);
}

/** Lower median of a list (an actual member value, so the output ilvl is a real band
 *  drawn from the inputs rather than an interpolated number). */
function medianIlvl(items: readonly ItemInstance[]): number {
  const sorted = items.map((i) => i.ilvl).sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 1;
}

export function synthesize(items: readonly ItemInstance[], doubleTierChance: number = SYNTH_DOUBLE_TIER_CHANCE): ItemInstance | null {
  if (!canSynthesize(items)) return null;
  const inputTier = items[0]?.tier ?? 0;

  // Deterministic seed from the input ids (FNV-style mix).
  let h = 0x811c9dc5;
  for (const it of items) {
    for (let k = 0; k < it.id.length; k++) h = Math.imul(h ^ it.id.charCodeAt(k), 0x01000193) >>> 0;
  }
  const stageIndex = Math.max(...items.map((i) => i.origin.stageIndex));
  const rng = makeRng(h);
  // "Lucky" synthesis (base 5%, raised by the Transmuter's Fortune tech): jump TWO tiers
  // instead of one (clamped to the T8 cap). The Cube UI derives the gold glow from the
  // output landing +2 above the inputs.
  const outTier = Math.min(8, inputTier + (rng.chance(doubleTierChance) ? 2 : 1)) as ItemTier;
  const slot = rng.pick(SLOT_KEYS);
  const origin: ItemOrigin = { rollSeed: h, stageIndex, chestType: 'normal', generatorVersion: GENERATOR_VERSION };
  // Output ilvl is the MEDIAN of the inputs (not a fresh stage roll), so feeding the
  // cube higher-ilvl gear yields a higher-ilvl result.
  const out = composeItem(slot, outTier, origin, rng, medianIlvl(items));
  return out; // no binding — this game has no trading/bound gear (out.bound stays false)
}

// ── Gem synthesis: 9 same-tier gems → 1 of the next tier ──
export function canSynthesizeGems(gems: readonly GemInstance[]): boolean {
  if (gems.length !== CUBE_INPUT_COUNT) return false;
  const tier = gems[0]?.tier;
  return tier !== undefined && tier < 8 && gems.every((g) => g.tier === tier);
}

/** 9 same-tier gems → 1 gem of the next tier (5% lucky +2, same as items). The output
 *  COLOUR is a deterministic pick from the inputs. The minted id is assigned by the caller. */
export function synthesizeGems(gems: readonly GemInstance[], doubleTierChance: number = SYNTH_DOUBLE_TIER_CHANCE): GemInstance | null {
  if (!canSynthesizeGems(gems)) return null;
  const inputTier = gems[0]?.tier ?? 1;
  let h = 0x811c9dc5;
  for (const g of gems) {
    for (let k = 0; k < g.id.length; k++) h = Math.imul(h ^ g.id.charCodeAt(k), 0x01000193) >>> 0;
  }
  const rng = makeRng(h);
  const outTier = Math.min(8, inputTier + (rng.chance(doubleTierChance) ? 2 : 1)) as GemTier;
  const key = rng.pick(gems.map((g) => g.key)); // a colour drawn from the inputs
  const stageIndex = Math.max(...gems.map((g) => g.origin.stageIndex));
  return { id: '', key, tier: outTier, origin: { rollSeed: h, stageIndex, generatorVersion: GENERATOR_VERSION } };
}

// ───────────────────────────── Alchemy ─────────────────────────────

/** Gold an item melts into: exponential in tier, linear in ilvl. */
export function itemGoldValue(item: ItemInstance): number {
  return Math.round(ALCHEMY_BASE * ALCHEMY_TIER_MULT ** item.tier * item.ilvl);
}

export function alchemyTotal(items: readonly ItemInstance[]): number {
  return items.reduce((sum, i) => sum + itemGoldValue(i), 0);
}

// ───────────────────────────── Transfiguration ─────────────────────────────

/** A way to pay for a transfiguration: `count` gems of ANY colour, all at `tier`. */
export interface TransfigCost {
  tier: GemTier;
  count: number;
}

/** The accepted ways to pay for transfiguring `item`: ONE gem at the item's tier, OR TWO
 *  gems one tier below (any colours — type no longer matters). Gems exist only at T1+, so
 *  the same-tier option needs tier ≥ 1 and the cheaper 2-gem option needs tier ≥ 2. */
export function transfigCostOptions(item: ItemInstance): TransfigCost[] {
  const opts: TransfigCost[] = [];
  if (item.tier >= 1) opts.push({ tier: item.tier as GemTier, count: 1 });
  if (item.tier >= 2) opts.push({ tier: (item.tier - 1) as GemTier, count: 2 });
  return opts;
}

/** The pool of NEW affixes a transfiguration could roll for this item: the slot's
 *  valid substats minus the base affix and every affix the item already carries (so
 *  the result is always a genuinely different stat). */
export function transfigPool(item: ItemInstance): StatKey[] {
  const taken = new Set<StatKey>([...item.baseAffix.map((a) => a.key), ...item.stats.map((s) => s.key)]);
  return itemSubstatPool(item).filter((k) => !taken.has(k));
}

/** True if `item` may be transfigured paying exactly `gems` (consumed either way). The gems
 *  must match one of the accepted cost options — 1 same-tier gem, or 2 one-tier-below gems
 *  (any colours). */
export function canTransfigure(item: ItemInstance, gems: readonly GemInstance[]): boolean {
  if (item.transfigured === true) return false;
  if (item.stats.length === 0) return false; // no affix to alter
  if (transfigPool(item).length === 0) return false; // no different stat to roll into
  return transfigCostOptions(item).some(
    (o) => gems.length === o.count && gems.every((g) => g.tier === o.tier),
  );
}

/** The replacement affix a transfiguration of `item`'s affix #`affixIndex` would
 *  produce — deterministic from the item's birth seed + the slot, so previewing and
 *  committing always agree (and it can't be re-rolled for a better result). Returns
 *  null if there is no eligible new stat. */
export function transfigureRoll(item: ItemInstance, affixIndex: number): { key: StatKey; value: number } | null {
  const pool = transfigPool(item);
  if (pool.length === 0 || item.stats[affixIndex] === undefined) return null;
  const seed = (item.origin.rollSeed ^ Math.imul(affixIndex + 1, 0x9e3779b1)) >>> 0;
  const rng = makeRng(seed);
  const key = rng.pick(pool);
  const value = rollStatValue(key, tierDef(item.tier).statMultiplier, item.ilvl, rng);
  return { key, value };
}

import type { ItemInstance } from './items';
import { composeItem, rollStatValue, itemSubstatPool, type ItemOrigin } from './loot';
import { makeRng } from './rng';
import { SLOT_KEYS } from '@/data/itemSlots';
import type { StatKey } from '@/data/stats';
import type { ItemTier } from '@/data/tiers';
import { tierDef } from '@/data/tiers';
import type { GemInstance } from '@/data/gems';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { ALCHEMY_BASE, ALCHEMY_TIER_MULT, TRANSFIG_OFFENSIVE_GEMS, TRANSFIG_DEFENSIVE_GEMS } from '@/data/cube';

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

export function synthesize(items: readonly ItemInstance[]): ItemInstance | null {
  if (!canSynthesize(items)) return null;
  const inputTier = items[0]?.tier ?? 0;
  const outTier = (inputTier + 1) as ItemTier;

  // Deterministic seed from the input ids (FNV-style mix).
  let h = 0x811c9dc5;
  for (const it of items) {
    for (let k = 0; k < it.id.length; k++) h = Math.imul(h ^ it.id.charCodeAt(k), 0x01000193) >>> 0;
  }
  const stageIndex = Math.max(...items.map((i) => i.origin.stageIndex));
  const rng = makeRng(h);
  const slot = rng.pick(SLOT_KEYS);
  const origin: ItemOrigin = { rollSeed: h, stageIndex, chestType: 'normal', generatorVersion: GENERATOR_VERSION };
  // Output ilvl is the MEDIAN of the inputs (not a fresh stage roll), so feeding the
  // cube higher-ilvl gear yields a higher-ilvl result.
  const out = composeItem(slot, outTier, origin, rng, medianIlvl(items));
  out.bound = true; // synthesis BINDS the output (SPEC §12.4)
  return out;
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

export interface TransfigCost {
  tier: ItemTier;
  offensive: number; // # offensive-family gems required (at `tier`)
  defensive: number; // # defensive-family gems required (at `tier`)
}

/** The gem bill to transfigure `item`: one offensive- + one defensive-family gem,
 *  both at the item's own tier (slot-independent, so flex armor/jewelry is fine). */
export function transfigCost(item: ItemInstance): TransfigCost {
  return { tier: item.tier, offensive: 1, defensive: 1 };
}

function gemFamily(g: GemInstance): 'offensive' | 'defensive' | null {
  if (TRANSFIG_OFFENSIVE_GEMS.includes(g.key)) return 'offensive';
  if (TRANSFIG_DEFENSIVE_GEMS.includes(g.key)) return 'defensive';
  return null;
}

/** The pool of NEW affixes a transfiguration could roll for this item: the slot's
 *  valid substats minus the base affix and every affix the item already carries (so
 *  the result is always a genuinely different stat). */
export function transfigPool(item: ItemInstance): StatKey[] {
  const taken = new Set<StatKey>([...item.baseAffix.map((a) => a.key), ...item.stats.map((s) => s.key)]);
  return itemSubstatPool(item).filter((k) => !taken.has(k));
}

/** True if `item` may be transfigured paying exactly `gems` (consumed either way). */
export function canTransfigure(item: ItemInstance, gems: readonly GemInstance[]): boolean {
  if (item.transfigured === true) return false;
  if (item.stats.length === 0) return false; // no affix to alter
  if (transfigPool(item).length === 0) return false; // no different stat to roll into
  if (gems.length !== 2) return false;
  if (!gems.every((g) => g.tier === item.tier)) return false;
  const fams = gems.map(gemFamily);
  return fams.filter((f) => f === 'offensive').length === 1 && fams.filter((f) => f === 'defensive').length === 1;
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

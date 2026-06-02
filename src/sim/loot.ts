import type { AffixRoll, ItemInstance } from './items';
import type { Rng } from './rng';
import { makeRng } from './rng';
import { round2 } from './num';
import type { ItemTier } from '@/data/tiers';
import { TIERS, tierDef } from '@/data/tiers';
import type { SlotCategory, SlotKey } from '@/data/itemSlots';
import { SLOTS, SLOT_KEYS, weaponTypeFor } from '@/data/itemSlots';
import type { StatKey } from '@/data/stats';
import { STATS, FLEX_STATS } from '@/data/stats';
import { CLASS_KEYS } from '@/data/classes';
import type { ChestType } from '@/data/chests';
import { phi, EG_FLAT, GEAR_POWER, expectedLevel, worldOf } from '@/data/stageScaling';
import { RARITY_DEPTH_P, TIER_CHEST_FACTOR } from '@/data/lootTables';

// The deterministic loot generator (the SPEC §4.6 contract): generateItem(origin)
// reproduces an item byte-for-byte from its birth certificate. Tier is stage-gated
// and rare (PROGRESSION §13). Affix routing per AFFIXES.md.

export interface ItemOrigin {
  rollSeed: number;
  stageIndex: number;
  chestType: ChestType;
  generatorVersion: number;
}

/** Stage-gated, WORLD-DEPTH-scaled tier roll (scripts/sim-rarity.ts). Each tier's
 *  world-100 target weight (def.dropWeight) is scaled by R(world)^tier, where
 *  R = (world/100)^p × chestFactor — so deeper worlds (and richer chests) tilt toward
 *  higher tiers, with no plateau. `minTier` excludes low tiers (jewelry has no T0). */
export function rollTier(
  S: number,
  chestFactor: number,
  rng: Rng,
  minTier: ItemTier = 0,
): ItemTier {
  const world = worldOf(S);
  const r = Math.pow(Math.max(1, world) / 100, RARITY_DEPTH_P) * chestFactor;
  const weights: number[] = [];
  let total = 0;
  for (const def of TIERS) {
    let w = 0;
    if (def.tier >= minTier && S >= def.unlockStage) {
      w = def.dropWeight * Math.pow(r, def.tier);
    }
    weights[def.tier] = w;
    total += w;
  }
  if (total <= 0) return minTier;
  let roll = rng.next() * total;
  for (let t = 0; t < weights.length; t++) {
    roll -= weights[t] ?? 0;
    if (roll < 0) return t as ItemTier;
  }
  return minTier;
}

/** Generate an item purely from its origin. Same origin ⇒ deep-equal item.
 *  `allowedClasses` restricts which class a weapon/off-hand can be born for (the
 *  classes currently in the party); empty/undefined = any launch class. */
export function generateItem(origin: ItemOrigin, allowedClasses?: string[]): ItemInstance {
  const rng = makeRng(origin.rollSeed);
  const slot: SlotKey = rng.pick(SLOT_KEYS);
  const category = SLOTS[slot].category;
  const chestFactor = TIER_CHEST_FACTOR[origin.chestType];
  // Jewelry doesn't exist at T0 (no T0 base affix) — reject-and-reroll via minTier.
  const minTier: ItemTier = category === 'jewelry' ? 1 : 0;
  const tier = rollTier(origin.stageIndex, chestFactor, rng, minTier);
  return composeItem(slot, tier, origin, rng, undefined, undefined, allowedClasses);
}

/** Build the item body for a known slot+tier (used by generateItem and by tests
 *  that need a specific slot/tier). Affix values continue the given rng stream.
 *  Weapon/off-hand items roll a CLASS (→ their type) unless `forcedClass` is given. */
export function composeItem(
  slot: SlotKey,
  tier: ItemTier,
  origin: ItemOrigin,
  rng: Rng,
  forcedIlvl?: number,
  forcedClass?: string,
  classPool?: string[],
): ItemInstance {
  const S = origin.stageIndex;
  const category = SLOTS[slot].category;
  const def = tierDef(tier);

  // ilvl is rolled FIRST (centered on the stage's expected level, small upward tail)
  // because item power scales with ilvl now, not the drop stage. Drawn from the same
  // deterministic stream so generateItem(origin) stays reproducible. A caller may FORCE
  // the ilvl (Cube synthesis sets it to the median of its inputs).
  const itemLevel = forcedIlvl ?? rollItemLevel(S, rng);
  const mult = def.statMultiplier;

  // Route base affix(es) + substat pool by category (AFFIXES.md gear overhaul):
  //   • weapon/off-hand: CLASS-LOCKED type (Sword/Bow/Wand …) — tailored base + pool.
  //   • armor: MITIGATION base (armor / MR / 50-50 split) + fully-flexible substats.
  //   • jewelry: freestyle — base is ANY stat, substats from the full flex pool.
  let baseAffix: AffixRoll[];
  let pool: StatKey[];
  let classKey: string | undefined;
  if (category === 'weapon') {
    // Pool of classes this weapon/off-hand may be born for: the party's classes when
    // given (so a warrior-only party never drops bows/wands), else any launch class.
    const classes = classPool !== undefined && classPool.length > 0 ? classPool : WEAPON_CLASS_KEYS;
    classKey = forcedClass ?? rng.pick(classes);
    const wtype = weaponTypeFor(classKey, slot as 'weapon' | 'offhand');
    baseAffix = [{ key: wtype.base, value: rollStatValue(wtype.base, mult, itemLevel, rng) }];
    pool = wtype.pool;
  } else if (category === 'armor') {
    baseAffix = rollArmorBase(rng, mult, itemLevel);
    pool = FLEX_STATS;
  } else {
    const baseKey = rng.pick(FLEX_STATS); // jewelry: freestyle base
    baseAffix = [{ key: baseKey, value: rollStatValue(baseKey, mult, itemLevel, rng) }];
    pool = FLEX_STATS;
  }

  const baseKeys = new Set(baseAffix.map((a) => a.key));
  const subPool = pool.filter((k) => !baseKeys.has(k));
  const subKeys = pickDistinct(subPool, def.extraStats, rng);
  const stats = subKeys.map((key) => ({ key, value: rollStatValue(key, mult, itemLevel, rng) }));

  const sockets = Array.from({ length: def.sockets }, () => ({ gem: null }));

  return {
    id: `i${(origin.rollSeed >>> 0).toString(36)}`,
    slot,
    category,
    tier,
    ilvl: itemLevel,
    baseAffix,
    stats,
    sockets,
    origin,
    bound: false,
    ...(classKey !== undefined ? { classKey } : {}),
  };
}

// Classes a weapon/off-hand can be born for (exactly the 3 launch classes).
const WEAPON_CLASS_KEYS = CLASS_KEYS;

/** Armor's intrinsic = mitigation: ~40% pure armor, ~40% pure MR, ~20% a 50-50 split
 *  (half each). The split is a genuine DUAL base affix (two entries). */
function rollArmorBase(rng: Rng, mult: number, itemLevel: number): AffixRoll[] {
  const r = rng.next();
  if (r < 0.4) return [{ key: 'armor', value: rollStatValue('armor', mult, itemLevel, rng) }];
  if (r < 0.8) return [{ key: 'magicResist', value: rollStatValue('magicResist', mult, itemLevel, rng) }];
  const a = rollStatValue('armor', mult, itemLevel, rng);
  const m = rollStatValue('magicResist', mult, itemLevel, rng);
  return [
    { key: 'armor', value: round2(a / 2) },
    { key: 'magicResist', value: round2(m / 2) },
  ];
}

/** Roll an item's level from the drop stage: ~80% at the stage's expected level,
 *  ~15% a touch higher (+1..3), ~5% an aspirational drop (+4..8) you must grow into.
 *  ilvl is both the power anchor and the equip requirement (hero level ≥ ilvl). */
export function rollItemLevel(S: number, rng: Rng): number {
  const base = expectedLevel(S);
  const r = rng.next();
  const bonus = r > 0.95 ? 4 + rng.int(5) : r > 0.8 ? 1 + rng.int(3) : 0;
  return Math.max(1, base + bonus);
}

/** The substat pool an item draws from (gear overhaul, AFFIXES.md): weapon/off-hand →
 *  their class TYPE's tailored pool; armor + jewelry → the full flex pool. Used by loot
 *  and by the Cube's transfigure (which then filters out already-taken keys). */
export function itemSubstatPool(item: { category: SlotCategory; slot: SlotKey; classKey?: string }): StatKey[] {
  if (item.category === 'weapon' && item.classKey !== undefined) {
    return [...weaponTypeFor(item.classKey, item.slot as 'weapon' | 'offhand').pool];
  }
  return [...FLEX_STATS]; // armor + jewelry: fully flexible
}

// FLAT stats scale Φ^EG_FLAT of the item's LEVEL (so an ilvl-N item is always "an
// N-level item", whenever it dropped); PERCENT stats are bounded (§6), level-flat.
export function rollStatValue(key: StatKey, tierMult: number, itemLevel: number, rng: Rng): number {
  const band = STATS[key].rollPerIlvl;
  const r = rng.range(band.min, band.max);
  if (STATS[key].kind === 'percent') return round2(r * tierMult);
  return round2(r * tierMult * GEAR_POWER * phi(itemLevel) ** EG_FLAT);
}

// Pick `count` distinct keys from `pool` without replacement (Fisher–Yates prefix).
function pickDistinct(pool: StatKey[], count: number, rng: Rng): StatKey[] {
  const arr = [...pool];
  const n = Math.min(count, arr.length);
  for (let i = 0; i < n; i++) {
    const j = i + rng.int(arr.length - i);
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
  return arr.slice(0, n);
}

import type { AffixRoll, ItemInstance } from './items';
import type { Rng } from './rng';
import { makeRng } from './rng';
import { round2 } from './num';
import type { ItemTier } from '@/data/tiers';
import { tierDef } from '@/data/tiers';
import type { SlotCategory, SlotKey } from '@/data/itemSlots';
import { SLOTS, SLOT_KEYS, weaponTypeFor } from '@/data/itemSlots';
import type { StatKey } from '@/data/stats';
import { STATS, FLEX_STATS, JEWELRY_STATS } from '@/data/stats';
import { CLASS_KEYS } from '@/data/classes';
import type { ChestType } from '@/data/chests';
import { GEAR_POWER, ILVL_TAIL, PCT_SCALE, affixShare, powerAt } from '@/data/power';
import { difficultyOf } from '@/data/difficulties';
import { chestTierWeightsAt } from '@/data/chests';
import { PERFECT_STAT_CHANCE, PERFECT_STAT_BONUS } from '@/data/lootTables';

// The deterministic loot generator (the SPEC §4.6 contract): generateItem(origin)
// reproduces an item byte-for-byte from its birth certificate. Tier is stage-gated
// and rare (DIFFICULTY.md §13). Affix routing per AFFIXES.md.

export interface ItemOrigin {
  rollSeed: number;
  stageIndex: number;
  chestType: ChestType;
  generatorVersion: number;
}

/** Tier roll (DIFFICULTY.md §4): the drop table of the stage's WORLD — the per-world ladder
 *  (data/difficulties.tierWeightsAt): a difficulty climbs from the previous one's table to its own
 *  across its ten worlds. A BOSS chest lifts the two top rarities of that table (data/chests.chestTierWeightsAt:
 *  stage boss ×1.5, world boss ×3; user, 2026-11-16). `minTier` excludes low tiers (jewelry has no T0; the gem
 *  path passes 1). The new top tier of each difficulty reaches its 1 % only in the last world; tiers above the cap
 *  have weight 0. */
export function rollTier(S: number, rng: Rng, minTier: ItemTier = 0, chestType: ChestType = 'normal'): ItemTier {
  const def = difficultyOf(S);
  const weights = chestTierWeightsAt(S, chestType);
  const w: number[] = [];
  let total = 0;
  for (let t = 0; t < weights.length; t++) {
    const ww = t >= minTier ? (weights[t] ?? 0) : 0;
    w[t] = ww;
    total += ww;
  }
  // minTier above everything in pool (shouldn't happen for v1 slots) → clamp to the cap.
  if (total <= 0) return Math.min(minTier, def.tierCap) as ItemTier;
  let roll = rng.next() * total;
  for (let t = 0; t < w.length; t++) {
    roll -= w[t] ?? 0;
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
  // Jewelry doesn't exist at T0 (no T0 base affix) — reject-and-reroll via minTier.
  const minTier: ItemTier = category === 'jewelry' ? 1 : 0;
  const tier = rollTier(origin.stageIndex, rng, minTier, origin.chestType);
  return composeItem(slot, tier, origin, rng, undefined, undefined, allowedClasses);
}

/** Build the item body for a known slot+tier (used by generateItem and by tests
 *  that need a specific slot/tier). Affix values continue the given rng stream.
 *  Weapon/off-hand items roll a CLASS (→ their type) and armour rolls a CLASS (→ its family) unless
 *  `forcedClass` is given; jewelry has no class. */
export function composeItem(
  slot: SlotKey,
  tier: ItemTier,
  origin: ItemOrigin,
  rng: Rng,
  forcedIlvl?: number,
  forcedClass?: string,
  classPool?: string[],
  perfectChance: number = PERFECT_STAT_CHANCE,
): ItemInstance {
  const S = origin.stageIndex;
  const category = SLOTS[slot].category;
  const def = tierDef(tier);

  // ilvl is rolled FIRST (the drop stage, small upward tail) because item power follows the power curve of its
  // level (data/power). Drawn from the same deterministic stream so generateItem(origin) stays reproducible. A
  // caller may FORCE the ilvl (Cube synthesis sets it to the median of its inputs).
  const itemLevel = forcedIlvl ?? rollItemLevel(S, rng);
  const budget = def.statMultiplier; // the rarity's budget, split over the affixes (data/power affixShare)

  // Route base affix(es) + substat pool by category (AFFIXES.md gear overhaul):
  //   • weapon/off-hand: CLASS-LOCKED type (Sword/Bow/Wand …) — tailored base + pool.
  //   • armor: CLASS-LOCKED family (plate / leather / cloth) — MITIGATION base (armor / MR / 50-50 split,
  //     whatever the family) + fully-flexible substats.
  //   • jewelry: freestyle — base is ANY stat, substats from the full flex pool.
  // The keys are drawn first, then the values: a value's share of the budget depends on how many substats there are.
  let baseKeys: StatKey[];
  let split = false;
  let pool: StatKey[];
  let classKey: string | undefined;
  if (category === 'weapon') {
    // Pool of classes this item may be born for: the party's classes when given (so a
    // knight-only party never drops bows/wands — or leather and cloth), else any launch class.
    const classes = classPool !== undefined && classPool.length > 0 ? classPool : ITEM_CLASS_KEYS;
    classKey = forcedClass ?? rng.pick(classes);
    const wtype = weaponTypeFor(classKey, slot as 'weapon' | 'offhand');
    baseKeys = [wtype.base];
    pool = wtype.pool;
  } else if (category === 'armor') {
    // Armour is born into ONE class's family (plate / leather / cloth) from the same pool as weapons. The
    // family never decides the mitigation: the base stays armour / MR / split for every class.
    const classes = classPool !== undefined && classPool.length > 0 ? classPool : ITEM_CLASS_KEYS;
    classKey = forcedClass ?? rng.pick(classes);
    baseKeys = rollArmorBaseKeys(rng);
    split = baseKeys.length > 1;
    pool = FLEX_STATS;
  } else {
    baseKeys = [rng.pick(JEWELRY_STATS)]; // jewelry: freestyle base (scalers + crit + CDR)
    pool = JEWELRY_STATS;
  }

  const subPool = pool.filter((k) => !baseKeys.includes(k));
  const subKeys = pickDistinct(subPool, def.extraStats, rng);
  const baseShare = affixShare(true, subKeys.length);
  const subShare = affixShare(false, subKeys.length);
  // An armour/MR split base is one affix in two halves.
  const baseAffix: AffixRoll[] = baseKeys.map((key) => ({ key, value: rollStatValue(key, budget, itemLevel, split ? baseShare / 2 : baseShare, rng) }));
  const stats = subKeys.map((key) => ({ key, value: rollStatValue(key, budget, itemLevel, subShare, rng) }));

  // Perfect-stat pass — runs AFTER the normal substat rolls. Only inherent substats can be perfect.
  applyPerfectRolls(stats, budget, itemLevel, subShare, rng, perfectChance);

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

// Classes a weapon, off-hand or piece of armour can be born for (exactly the 3 launch classes).
const ITEM_CLASS_KEYS = CLASS_KEYS;

/** Armor's intrinsic = mitigation: ~40% pure armor, ~40% pure MR, ~20% a 50-50 split
 *  (half each). The split is a genuine DUAL base affix (two entries). */
function rollArmorBaseKeys(rng: Rng): StatKey[] {
  const r = rng.next();
  if (r < 0.4) return ['armor'];
  if (r < 0.8) return ['magicResist'];
  return ['armor', 'magicResist'];
}

/** Roll an item's level (a STAGE, data/power): the drop stage, ~15 % a little higher, ~5 % an aspirational piece.
 *  ilvl is the pure power anchor — there is no equip requirement (DIFFICULTY.md §0). */
export function rollItemLevel(S: number, rng: Rng): number {
  const r = rng.next();
  const t = ILVL_TAIL;
  const bonus = r > 1 - t.bigChance ? t.bigMin + rng.int(t.bigSpan) : r > 1 - t.bigChance - t.smallChance ? t.smallMin + rng.int(t.smallSpan) : 0;
  return Math.max(1, Math.round(S) + bonus);
}

/** The substat pool an item draws from (gear overhaul, AFFIXES.md): weapon/off-hand →
 *  their class TYPE's tailored pool; armor → scaler flex pool; jewelry → flex + crit/CDR.
 *  Used by loot and by the Cube's transfigure (which then filters out already-taken keys). */
export function itemSubstatPool(item: { category: SlotCategory; slot: SlotKey; classKey?: string }): StatKey[] {
  if (item.category === 'weapon' && item.classKey !== undefined) {
    return [...weaponTypeFor(item.classKey, item.slot as 'weapon' | 'offhand').pool];
  }
  return item.category === 'jewelry' ? [...JEWELRY_STATS] : [...FLEX_STATS];
}

/** One affix's value (docs/redesign/POWER_CURVE.md §2): its roll `r` (inside the stat's band) × the item's rarity
 *  `budget` × the affix's `share` of it × the scale — FLAT stats GEAR_POWER × P(item level), PERCENT stats
 *  PCT_SCALE (a percent is worth the same at every level). */
export function statValue(key: StatKey, budget: number, itemLevel: number, share: number, r: number): number {
  const scale = STATS[key].kind === 'percent' ? PCT_SCALE : GEAR_POWER * powerAt(itemLevel);
  return round2(r * budget * share * scale);
}

/** A rolled affix: a uniform draw inside the stat's band. */
export function rollStatValue(key: StatKey, budget: number, itemLevel: number, share: number, rng: Rng): number {
  const band = STATS[key].rollPerIlvl;
  return statValue(key, budget, itemLevel, share, rng.range(band.min, band.max));
}

/** The value a "perfect" roll of `key` produces: the HIGHEST normal roll (band.max) lifted by PERFECT_STAT_BONUS.
 *  Deterministic (no rng) — a perfect stat is always the same value for a given key/rarity/level/share. */
export function perfectStatValue(key: StatKey, budget: number, itemLevel: number, share: number): number {
  return statValue(key, budget, itemLevel, share, STATS[key].rollPerIlvl.max * (1 + PERFECT_STAT_BONUS));
}

/** The share of its item's budget one SUBSTAT of `item` gets (data/power affixShare). */
export function substatShare(item: { stats: readonly unknown[] }): number {
  return affixShare(false, item.stats.length);
}

/** Roll each item's "perfect" substats IN PLACE: while there is still a non-perfect substat
 *  and an rng.chance(chance) hit, upgrade one (random) remaining substat to its perfect value.
 *  Caps at one perfect per substat (so a T8's 4 substats yield at most 4 stars). The base
 *  affix is intentionally excluded. */
function applyPerfectRolls(stats: AffixRoll[], budget: number, itemLevel: number, share: number, rng: Rng, chance: number): void {
  const candidates = stats.map((_, i) => i); // substat indices not yet made perfect
  while (candidates.length > 0 && rng.chance(chance)) {
    const idx = candidates.splice(rng.int(candidates.length), 1)[0];
    if (idx === undefined) break;
    const s = stats[idx];
    if (s === undefined) continue;
    stats[idx] = { key: s.key, value: perfectStatValue(s.key, budget, itemLevel, share), perfect: true };
  }
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

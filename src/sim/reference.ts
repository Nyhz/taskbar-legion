// THE TYPICAL PARTY OF A ZONE (docs/redesign/POWER_CURVE.md §3). Every enemy number is sized against it
// (sim/enemyScale), so enemies follow the gear by construction: change an item formula, a rarity's budget or a
// class's stats and the enemies move with it; a talent or an ability (the party's own choices) moves only the
// party. Built WITHOUT a fight and without randomness: the Knight, Ranger and Priest at the zone's expected level,
// no talents, every slot filled (world 1 fills them a slot a stage) with an item of the zone's usual rarity at a
// mid roll, the affixes a player of that class keeps, its sockets full of gems of that rarity.

import type { ItemInstance } from './items';
import type { GemInstance, GemKey, GemTier } from '@/data/gems';
import { buildHeroCombatant, partyAuraMods, type HeroConfig } from './loadout';
import { PROBE_DEFAULT_BUILD, buildTalents, fieldedAbilities } from './builds';
import { liveStats } from './liveStats';
import { mixedMitigation } from './damageMix';
import { statValue } from './loot';
import type { EffectiveStats } from './stats';
import { SLOTS, weaponTypeFor, type SlotKey } from '@/data/itemSlots';
import { FLEX_STATS, JEWELRY_STATS, STATS, type StatKey } from '@/data/stats';
import { tierDef, type ItemTier } from '@/data/tiers';
import { tierWeightsAt } from '@/data/difficulties';
import { cadenceHitMult, heroSwingsPerSec } from '@/data/cadence';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { levelCurve, abilityDpsAllowance, REF_GEM_FILL, REF_ILVL_LAG, REF_TIER_QUANTILE, affixShare, refGearFill, refTierPosition, tierAtQuantile } from '@/data/power';

/** The share of an enemy hit the typical party's defences are measured against (bosses mix ~25 % magic). */
export const REF_MAGIC_SHARE = 0.25;

/** What a player of each class keeps on his gear, in order (the typical set takes the first that fit), the base he
 *  wants on a jewel and the gem he sockets. */
const KEEPS: Readonly<Record<string, { subs: readonly StatKey[]; jewelBase: StatKey; gem: GemKey }>> = {
  knight: { subs: ['health', 'armor', 'magicResist', 'block', 'attackDamage', 'critChance', 'multistrike', 'critDamage', 'attackSpeed'], jewelBase: 'health', gem: 'emerald' },
  ranger: { subs: ['attackDamage', 'critDamage', 'attackSpeed', 'critChance', 'multistrike', 'health', 'armor', 'magicResist'], jewelBase: 'attackDamage', gem: 'ruby' },
  priest: { subs: ['healPower', 'health', 'magicResist', 'critChance', 'attackDamage', 'armor', 'critDamage', 'cooldownReduction'], jewelBase: 'healPower', gem: 'topaz' },
};
/** The order a new game's slots fill in world 1. */
const FILL_ORDER: readonly SlotKey[] = ['weapon', 'chest', 'legs', 'helmet', 'offhand', 'boots', 'gloves', 'ring', 'amulet', 'trinket'];
const CLASSES = ['knight', 'ranger', 'priest'] as const;

/** A typical item: `slot` for `classKey` at rarity `tier` and level `ilvl`, mid rolls, gems of its rarity. */
export function typicalItem(slot: SlotKey, classKey: string, tier: ItemTier, ilvl: number, quality = 0.5, gemTier?: GemTier): ItemInstance {
  const keep = KEEPS[classKey] ?? KEEPS.knight!;
  const category = SLOTS[slot].category;
  const def = tierDef(tier);
  let baseKeys: StatKey[];
  let pool: readonly StatKey[];
  if (category === 'weapon') {
    const wtype = weaponTypeFor(classKey, slot as 'weapon' | 'offhand');
    baseKeys = [wtype.base];
    pool = wtype.pool;
  } else if (category === 'armor') {
    baseKeys = ['armor', 'magicResist']; // the split: the average of the three bases
    pool = FLEX_STATS;
  } else {
    baseKeys = [keep.jewelBase];
    pool = JEWELRY_STATS;
  }
  const subKeys = keep.subs.filter((k) => pool.includes(k) && !baseKeys.includes(k)).slice(0, def.extraStats);
  const roll = (key: StatKey): number => {
    const band = STATS[key].rollPerIlvl;
    return band.min + (band.max - band.min) * quality;
  };
  const baseShare = affixShare(true, subKeys.length) / baseKeys.length;
  const subShare = affixShare(false, subKeys.length);
  const origin = { rollSeed: 0, stageIndex: ilvl, chestType: 'normal' as const, generatorVersion: GENERATOR_VERSION };
  const gem = (): GemInstance => ({ id: 'ref', key: keep.gem, tier: gemTier ?? (Math.max(1, tier) as GemTier), origin: { rollSeed: 0, stageIndex: ilvl, generatorVersion: GENERATOR_VERSION } });
  return {
    id: `ref_${classKey}_${slot}`,
    slot,
    category,
    tier,
    ilvl,
    baseAffix: baseKeys.map((key) => ({ key, value: statValue(key, def.statMultiplier, ilvl, baseShare, roll(key)) })),
    stats: subKeys.map((key) => ({ key, value: statValue(key, def.statMultiplier, ilvl, subShare, roll(key)) })),
    sockets: Array.from({ length: def.sockets }, (_, i) => ({ gem: i < Math.round(def.sockets * REF_GEM_FILL) ? gem() : null })),
    origin,
    bound: false,
    ...(category === 'jewelry' ? {} : { classKey }),
  };
}

/** The usual rarity at global stage `S` (REF_TIER_QUANTILE of the zone's drops). */
export function typicalTier(S: number, jewel = false): ItemTier {
  return tierAtQuantile(tierWeightsAt(Math.max(1, Math.round(S))), REF_TIER_QUANTILE, jewel) as ItemTier;
}

/** The usual rarity at global stage `S` as a continuous position (data/power tierPositionAtQuantile). */
export function typicalTierPosition(S: number): number {
  return refTierPosition(S);
}

/** The typical hero of `classKey` at global stage `S`, as a config (no talents), its gear at rarity `tier` (by
 *  default the usual whole rarity; a jewel never below 1). */
export function typicalHero(classKey: string, S: number, tier: number = typicalTier(S)): HeroConfig {
  const ilvl = Math.max(1, Math.round(S) - REF_ILVL_LAG);
  const slots = FILL_ORDER.slice(0, Math.round(FILL_ORDER.length * refGearFill(S)));
  const equipment: Partial<Record<SlotKey, ItemInstance>> = {};
  for (const slot of slots) {
    const t = SLOTS[slot].category === 'jewelry' ? Math.max(1, tier) : tier;
    equipment[slot] = typicalItem(slot, classKey, t as ItemTier, ilvl);
  }
  // Its level is the CONTINUOUS one of the zone (data/power levelCurve): late in the game a whole level spans 15–20
  // stages, and a typical party that levelled in steps would make the enemies sized on it jump. Its talents are the
  // average player's (the default build) at that level: talents grow with the level, and a reference without them
  // would fall behind the players as the game goes on.
  const level = Math.max(1, levelCurve(S));
  const build = PROBE_DEFAULT_BUILD[classKey];
  const points = Math.floor(level);
  const talents = build === undefined ? {} : buildTalents(classKey, points, build);
  const activeAbilities = build === undefined ? [] : fieldedAbilities(classKey, points, build);
  return { id: `ref_${classKey}`, classKey, level, equipment, talents, activeAbilities };
}

/** A hero's average basic hit (crit expected, the cadence's per-hit share included) and basic damage a second. */
export function basicDamage(classKey: string, s: EffectiveStats): { hit: number; dps: number } {
  const crit = 1 + (Math.min(100, Math.max(0, s.critChance)) / 100) * (Math.max(0, s.critDamage) / 100);
  const hit = s.attackDamage * (1 + s.damageIncrease / 100) * cadenceHitMult(classKey, s.attackSpeed) * crit;
  const dps = hit * heroSwingsPerSec(classKey, s.attackSpeed) * (1 + Math.max(0, s.multistrike) / 100);
  return { hit, dps };
}

export interface ReferenceParty {
  /** The average basic hit of the party's hardest hitter. */
  topHit: number;
  /** The party's damage a second: its basic attacks × the ability allowance of the zone's level (data/power). */
  partyDps: number;
  /** The Knight's life and his effective life against a hit REF_MAGIC_SHARE magic. */
  knightLife: number;
  knightEhp: number;
  /** The weaker back-liner's life and effective life. */
  backLife: number;
  backEhp: number;
  /** The Knight's armour and magic resist (what on-level defence is). */
  knightArmor: number;
  knightMagicResist: number;
}

const memo = new Map<number, ReferenceParty>();

/** What any party of hero configs measures at global stage `S`, by the same arithmetic as the typical party (no
 *  fight): the progression probe's fast model compares a player's party with the typical one through it. A party
 *  without a Knight is measured on its first hero. */
export function measureParty(configs: readonly HeroConfig[], S: number): ReferenceParty {
  const auras = partyAuraMods(configs);
  const heroes = configs.map((cfg) => {
    const hero = buildHeroCombatant(cfg, auras);
    return { classKey: cfg.classKey, hero, stats: liveStats(hero) };
  });
  let topHit = 0;
  let dps = 0;
  for (const h of heroes) {
    const d = basicDamage(h.classKey, h.stats);
    topHit = Math.max(topHit, d.hit);
    dps += d.dps;
  }
  const ehp = (h: (typeof heroes)[number]): number => h.hero.maxHp / Math.max(0.05, 1 - mixedMitigation(h.stats.armor, h.stats.magicResist, REF_MAGIC_SHARE, S));
  const knight = heroes.find((h) => h.classKey === 'knight') ?? heroes[0]!;
  const others = heroes.filter((h) => h !== knight).sort((a, b) => a.hero.maxHp - b.hero.maxHp);
  const back = others[0] ?? knight;
  return {
    topHit,
    partyDps: dps * abilityDpsAllowance(Math.max(1, levelCurve(S))),
    knightLife: knight.hero.maxHp,
    knightEhp: ehp(knight),
    backLife: back.hero.maxHp,
    backEhp: ehp(back),
    knightArmor: knight.stats.armor,
    knightMagicResist: knight.stats.magicResist,
  };
}

/** The typical party at global stage `S` with its gear at whole rarity `tier`. */
function partyAt(S: number, tier: number): ReferenceParty {
  return measureParty(CLASSES.map((c) => typicalHero(c, S, tier)), S);
}

/** The typical party at global stage `S` (memoised per whole stage — pure and deterministic): its gear's rarity
 *  slides between the two whole rarities around the zone's usual one, so the party grows smoothly world by world. */
export function referenceParty(S: number): ReferenceParty {
  const key = Math.max(1, Math.round(S));
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const pos = typicalTierPosition(key);
  const lo = partyAt(key, Math.floor(pos));
  const f = pos - Math.floor(pos);
  let ref = lo;
  if (f > 1e-9) {
    const hi = partyAt(key, Math.ceil(pos));
    const mix = (a: number, b: number): number => a + (b - a) * f;
    ref = {
      topHit: mix(lo.topHit, hi.topHit),
      partyDps: mix(lo.partyDps, hi.partyDps),
      knightLife: mix(lo.knightLife, hi.knightLife),
      knightEhp: mix(lo.knightEhp, hi.knightEhp),
      backLife: mix(lo.backLife, hi.backLife),
      backEhp: mix(lo.backEhp, hi.backEhp),
      knightArmor: mix(lo.knightArmor, hi.knightArmor),
      knightMagicResist: mix(lo.knightMagicResist, hi.knightMagicResist),
    };
  }
  memo.set(key, ref);
  return ref;
}

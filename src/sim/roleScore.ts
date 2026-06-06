import { aggregate, type EffectiveStats, type StatMod } from './stats';
import { heroBaseStats, equipmentMods, talentPassiveMods } from './loadout';
import type { ItemInstance } from './items';
import type { SlotKey } from '@/data/itemSlots';
import { mitigation } from '@/data/stageScaling';

// Single-number role proxies so an item swap can be summarised as "how much DPS / Tanking /
// Healing does this net me?". These are deliberately RELATIVE measures (only their ratio
// before/after a swap is shown), so any constant base factors cancel — we only need each
// proxy to be MONOTONIC in the stats that actually drive that role in combat.ts.

export interface RoleScores {
  dps: number; // sustained auto-attack damage/sec proxy
  tank: number; // effective HP proxy (survivability vs this stage's mix of phys/magic)
  heal: number; // healing-output proxy (scales with healPower, crit, cast cadence)
}

export type RoleKey = keyof RoleScores;
export const ROLE_LABEL: Record<RoleKey, string> = { dps: 'DPS', tank: 'Tanking', heal: 'Healing' };

// Which role-impact rows are worth showing for a class — we hide the roles a class never
// actually performs (knight/ranger don't heal; priest isn't a damage dealer) so the summary
// only surfaces what that hero is for. Unknown classes fall back to all three.
export function visibleRoles(classKey: string): RoleKey[] {
  switch (classKey) {
    case 'knight':
    case 'ranger':
      return ['dps', 'tank'];
    case 'priest':
      return ['tank', 'heal'];
    default:
      return ['dps', 'tank', 'heal'];
  }
}

/** DPS = perHit · critMult · multistrikeMult · attacks/sec (mirrors heroAttack in combat.ts). */
export function dpsScore(s: EffectiveStats): number {
  const perHit = s.attackDamage * (1 + s.damageIncrease / 100);
  const critMult = 1 + (Math.min(100, Math.max(0, s.critChance)) / 100) * (Math.max(0, s.critDamage) / 100);
  const msMult = 1 + Math.max(0, s.multistrike) / 100;
  return perHit * critMult * msMult * Math.max(0.05, s.attackSpeed);
}

/** Effective HP: health divided by the fraction of damage that gets through armor/MR (averaged
 *  over both schools), block (halves a blocked hit), and flat damage reduction. */
export function tankScore(s: EffectiveStats, stage: number): number {
  const physMit = mitigation(Math.max(0, s.armor), stage);
  const magMit = mitigation(Math.max(0, s.magicResist), stage);
  const avgMit = (physMit + magMit) / 2;
  const blockAvg = (0.5 * Math.min(100, Math.max(0, s.block))) / 100; // block halves the hits it lands on
  const dr = Math.min(0.9, Math.max(0, s.damageReduction) / 100);
  const taken = (1 - avgMit) * (1 - blockAvg) * (1 - dr);
  return Math.max(0, s.health) / Math.max(0.01, taken);
}

/** Healing output proxy: heal power, crit (heals can crit), and cast cadence (CDR → more casts). */
export function healScore(s: EffectiveStats): number {
  const power = 1 + Math.max(0, s.healPower) / 100;
  const critMult = 1 + (Math.min(100, Math.max(0, s.critChance)) / 100) * (Math.max(0, s.critDamage) / 100);
  const castRate = 1 / Math.max(0.1, 1 - Math.min(0.9, Math.max(0, s.cooldownReduction) / 100));
  return power * critMult * castRate;
}

export function roleScores(s: EffectiveStats, stage: number): RoleScores {
  return { dps: dpsScore(s), tank: tankScore(s, stage), heal: healScore(s) };
}

/** Percentage change in each role proxy from swapping `swapItem` into `swapSlot` of the hero's
 *  current loadout. Positive = gain, negative = loss. Passive sources only (gear + talents +
 *  tech/pet `extraMods`) — transient combat effects are excluded so the comparison is stable. */
/** Strip every socketed gem from an item (sockets kept, emptied) — used by the gem-free
 *  comparison so two base items can be weighed by their own stats alone. */
function withoutGems(item: ItemInstance): ItemInstance {
  if (item.sockets.every((so) => so.gem === null)) return item;
  return { ...item, sockets: item.sockets.map(() => ({ gem: null })) };
}

export function roleDeltaPct(args: {
  classKey: string;
  level: number;
  equipment: Partial<Record<SlotKey, ItemInstance>>;
  swapSlot: SlotKey;
  swapItem: ItemInstance;
  talents: Record<string, number>;
  extraMods: readonly StatMod[];
  stage: number;
  /** Ignore socketed gems on BOTH the equipped set and the swap item (Shift-hover) so the
   *  comparison reflects the base items' own potential, gems aside. */
  ignoreGems?: boolean;
}): RoleScores {
  const { classKey, level, equipment, swapSlot, swapItem, talents, extraMods, stage, ignoreGems } = args;
  const equip = ignoreGems !== true
    ? equipment
    : (Object.fromEntries(
        Object.entries(equipment).map(([k, v]) => [k, v === undefined ? undefined : withoutGems(v)]),
      ) as Partial<Record<SlotKey, ItemInstance>>);
  const swap = ignoreGems === true ? withoutGems(swapItem) : swapItem;
  const base = heroBaseStats(classKey, level);
  const passive = [...talentPassiveMods(classKey, talents), ...extraMods];
  const before = roleScores(aggregate(base, [...equipmentMods(equip), ...passive]), stage);
  const after = roleScores(aggregate(base, [...equipmentMods({ ...equip, [swapSlot]: swap }), ...passive]), stage);
  const pct = (b: number, a: number): number => (b <= 0 ? (a > 0 ? 100 : 0) : ((a - b) / b) * 100);
  return { dps: pct(before.dps, after.dps), tank: pct(before.tank, after.tank), heal: pct(before.heal, after.heal) };
}

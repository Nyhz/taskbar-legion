import type { ItemInstance } from '@/sim/items';
import { format } from '@/sim/num';
import { STATS, type StatKey } from '@/data/stats';
import { tryArmorFamilyFor, tryWeaponTypeFor } from '@/data/itemSlots';
import { getLanguage } from '@/i18n/core';
import { armorFamilyName, slotLabel, weaponTypeName } from '@/i18n/names';

// What an item says about itself, in words and numbers (no React). Numbers follow the language: Spanish writes a
// decimal comma and a space before the percent sign.

function localNumber(text: string): string {
  return getLanguage() === 'es' ? text.replace('.', ',') : text;
}

/** A stat's amount without sign: "802", "1.24K", "2.6%" (Spanish: "2,6 %"). */
export function statAmount(key: StatKey, value: number): string {
  const magnitude = Math.abs(value);
  if (STATS[key].kind !== 'percent') return localNumber(format(magnitude));
  const digits = localNumber(magnitude.toFixed(magnitude < 10 ? 1 : 0));
  return getLanguage() === 'es' ? `${digits} %` : `${digits}%`;
}

/** A stat an item grants: "+802", "+2.6%". */
export function statGain(key: StatKey, value: number): string {
  return `+${statAmount(key, value)}`;
}

/** A difference against the worn piece: "+178", "−4.2%". */
export function statDelta(key: StatKey, delta: number): string {
  return `${delta > 0 ? '+' : '−'}${statAmount(key, delta)}`;
}

/** A signed percentage with one decimal (a role's net change): "+3.8%", "−0.6%". */
export function signedPercent(pct: number): string {
  const digits = localNumber(Math.abs(pct).toFixed(1));
  return `${pct > 0 ? '+' : '−'}${digits}${getLanguage() === 'es' ? ' %' : '%'}`;
}

/** A signed whole number: "+11", "−3". */
export function signed(n: number): string {
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}`;
}

/** What the piece is: a weapon / off-hand says its class TYPE (Sword, Bow…), anything else its slot. */
export function itemKindName(item: ItemInstance): string {
  if (item.category === 'weapon' && item.classKey !== undefined) {
    const type = tryWeaponTypeFor(item.classKey, item.slot as 'weapon' | 'offhand');
    if (type !== undefined) return weaponTypeName(type.key); // a stale / unknown class falls through to the slot
  }
  return slotLabel(item.slot);
}

/** The armour family of a piece (Plate, Leather, Cloth), or undefined for anything that is not armour of a
 *  known class. */
export function itemFamilyName(item: ItemInstance): string | undefined {
  if (item.category !== 'armor' || item.classKey === undefined) return undefined;
  const family = tryArmorFamilyFor(item.classKey);
  return family === undefined ? undefined : armorFamilyName(family.key);
}

/** The item's OWN stat total — base affix + rolled substats. Socketed gems are listed apart. */
export function ownStats(item: ItemInstance): Map<StatKey, number> {
  const total = new Map<StatKey, number>();
  for (const roll of [...item.baseAffix, ...item.stats])
    total.set(roll.key, (total.get(roll.key) ?? 0) + roll.value);
  return total;
}

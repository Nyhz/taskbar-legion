// Names of game things in the current language. data/ writes English and knows nothing about languages; the
// interface asks here instead of reading `.name` / `.label` straight from a data table.
import { classDef } from '@/data/classes';
import type { ChestType } from '@/data/chests';
import { difficultyDef } from '@/data/difficulties';
import type { DifficultyKey } from '@/data/difficulties';
import { GEMS } from '@/data/gems';
import type { GemKey } from '@/data/gems';
import { ARMOR_FAMILIES, SLOTS, WEAPON_TYPES } from '@/data/itemSlots';
import type { ArmorFamilyKey, SlotKey } from '@/data/itemSlots';
import { petDef } from '@/data/pets';
import { STATS } from '@/data/stats';
import type { StatKey } from '@/data/stats';
import { techNode } from '@/data/techTree';
import type { TechCategory } from '@/data/techTree';
import { tierDef } from '@/data/tiers';
import type { ItemTier } from '@/data/tiers';
import classesEs from '@/data/i18n/es/classes.json';
import difficultiesEs from '@/data/i18n/es/difficulties.json';
import gemsEs from '@/data/i18n/es/gems.json';
import petsEs from '@/data/i18n/es/pets.json';
import slotsEs from '@/data/i18n/es/slots.json';
import statsEs from '@/data/i18n/es/stats.json';
import techEs from '@/data/i18n/es/tech.json';
import tiersEs from '@/data/i18n/es/tiers.json';
import { getLanguage, t } from './core';
import type { PlainTextKey } from './core';
import { dataKey } from './dataTexts';
import type { DataGroup } from './dataTexts';

export interface DataTextEntry {
  en: string; // the English it was translated from: the test compares it with what data/ says today
  es: string;
}

export const DATA_DICTIONARIES: Readonly<Record<DataGroup, Readonly<Record<string, DataTextEntry | undefined>>>> = {
  stats: statsEs,
  tiers: tiersEs,
  slots: slotsEs,
  gems: gemsEs,
  classes: classesEs,
  difficulties: difficultiesEs,
  tech: techEs,
  pets: petsEs,
};

/** A data text in the current language: `english` as data wrote it, or its Spanish from the group's dictionary. */
export function dataText(group: DataGroup, key: string, english: string): string {
  if (getLanguage() === 'en') return english;
  return DATA_DICTIONARIES[group][key]?.es ?? english;
}

export function statLabel(stat: StatKey): string {
  return dataText('stats', stat, STATS[stat].label);
}

export function tierName(tier: ItemTier): string {
  return dataText('tiers', String(tier), tierDef(tier).name);
}

export function slotLabel(slot: SlotKey): string {
  return dataText('slots', dataKey.slot(slot), SLOTS[slot].label);
}

/** The name of a weapon / off-hand type (`sword`, `tome`…); an unknown key comes back as it is. */
export function weaponTypeName(type: string): string {
  const def = WEAPON_TYPES[type];
  return def === undefined ? type : dataText('slots', dataKey.weaponType(type), def.name);
}

/** The name of an armour family (`plate`, `leather`, `cloth`): what a class's armour is made of. */
export function armorFamilyName(family: ArmorFamilyKey): string {
  return dataText('slots', dataKey.armorFamily(family), ARMOR_FAMILIES[family].name);
}

export function gemName(gem: GemKey): string {
  return dataText('gems', gem, GEMS[gem].name);
}

export function className(classKey: string): string {
  return dataText('classes', classKey, classDef(classKey).name);
}

export function difficultyName(key: DifficultyKey): string {
  return dataText('difficulties', key, difficultyDef(key).name);
}

export function techName(nodeKey: string): string {
  return dataText('tech', dataKey.techName(nodeKey), techNode(nodeKey).name);
}

export function techDescription(nodeKey: string): string {
  return dataText('tech', dataKey.techDescription(nodeKey), techNode(nodeKey).description);
}

export function techCategoryName(category: TechCategory): string {
  return dataText('tech', dataKey.techCategory(category), category);
}

export function petName(petKey: string): string {
  return dataText('pets', petKey, petDef(petKey).name);
}

// Chest kinds have no name in data/ (only keys), so theirs are ordinary catalogue texts.
const CHEST_NAME: Readonly<Record<ChestType, PlainTextKey>> = {
  normal: 'chests.normal',
  stageBoss: 'chests.stageBoss',
  zoneBoss: 'chests.zoneBoss',
};

export function chestName(type: ChestType): string {
  return t(CHEST_NAME[type]);
}

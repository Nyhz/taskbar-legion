// Names of game things in the current language. data/ writes English and knows nothing about languages; the
// interface asks here instead of reading `.name` / `.label` straight from a data table.
import { tryAbilityDef } from '@/data/abilities';
import { classDef } from '@/data/classes';
import type { ChestType } from '@/data/chests';
import { difficultyDef } from '@/data/difficulties';
import type { DifficultyKey } from '@/data/difficulties';
import { EFFECTS } from '@/data/effects';
import { GEMS } from '@/data/gems';
import type { GemKey } from '@/data/gems';
import { ARMOR_FAMILIES, SLOTS, WEAPON_TYPES } from '@/data/itemSlots';
import type { ArmorFamilyKey, SlotKey } from '@/data/itemSlots';
import { petDef } from '@/data/pets';
import { STATS } from '@/data/stats';
import type { StatKey } from '@/data/stats';
import { TALENT_TREES, tryTalentNode } from '@/data/talents';
import { techNode } from '@/data/techTree';
import type { TechCategory } from '@/data/techTree';
import { tierDef } from '@/data/tiers';
import type { ItemTier } from '@/data/tiers';
import { ULTIMATES } from '@/data/ultimates';
import abilitiesEs from '@/data/i18n/es/abilities.json';
import classesEs from '@/data/i18n/es/classes.json';
import difficultiesEs from '@/data/i18n/es/difficulties.json';
import effectsEs from '@/data/i18n/es/effects.json';
import gemsEs from '@/data/i18n/es/gems.json';
import petsEs from '@/data/i18n/es/pets.json';
import slotsEs from '@/data/i18n/es/slots.json';
import statsEs from '@/data/i18n/es/stats.json';
import talentsEs from '@/data/i18n/es/talents.json';
import techEs from '@/data/i18n/es/tech.json';
import { allCreatures, tryWorldDef } from '@/data/worlds';
import { CREATURE_LORE } from '@/data/bestiaryLore';
import tiersEs from '@/data/i18n/es/tiers.json';
import worldsEs from '@/data/i18n/es/worlds.json';
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
  worlds: worldsEs,
  slots: slotsEs,
  gems: gemsEs,
  classes: classesEs,
  difficulties: difficultiesEs,
  tech: techEs,
  pets: petsEs,
  abilities: abilitiesEs,
  talents: talentsEs,
  effects: effectsEs,
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

/** The name of world `index` (1–10) of a difficulty. An unknown number falls back to the number itself. */
export function worldName(index: number): string {
  const world = tryWorldDef(index);
  return world === undefined ? String(index) : dataText('worlds', dataKey.world(index), world.name);
}

/** The name of a creature by its figure key (see data/worlds). Unknown keys come back as they are. */
export function creatureName(key: string): string {
  const found = allCreatures().find((c) => c.key === key);
  return found === undefined ? key : dataText('worlds', dataKey.creature(key), found.name);
}

/** The bestiary's line for a creature (data/bestiaryLore), or '' when it has none. */
export function creatureLore(key: string): string {
  const line = CREATURE_LORE[key];
  return line === undefined ? '' : dataText('worlds', dataKey.creatureLore(key), line);
}

// ── The class kits (docs/redesign/CLASSES.md). Names are provisional in both languages. ──

/** The name of a hero ability. An unknown key (a stale one in a save) comes back as it is. */
export function abilityName(abilityKey: string): string {
  const def = tryAbilityDef(abilityKey);
  return def === undefined ? abilityKey : dataText('abilities', dataKey.abilityName(abilityKey), def.name);
}

/** What a hero ability does, in one line. Empty for an unknown key. */
export function abilityDescription(abilityKey: string): string {
  const def = tryAbilityDef(abilityKey);
  return def === undefined ? '' : dataText('abilities', dataKey.abilityDescription(abilityKey), def.desc);
}

/** The name of a class's ultimate, or '' when the class has none. */
export function ultimateName(classKey: string): string {
  const ult = ULTIMATES[classKey];
  return ult === undefined ? '' : dataText('abilities', dataKey.abilityName(ult.key), ult.name);
}

export function ultimateDescription(classKey: string): string {
  const ult = ULTIMATES[classKey];
  return ult === undefined ? '' : dataText('abilities', dataKey.abilityDescription(ult.key), ult.desc);
}

/** The name of a talent node: an ability node is named by its ability, a stat passive by its stat, a role
 *  talent, a modifier or a capstone by its own name. An unknown key comes back as it is. */
export function talentNodeName(classKey: string, nodeKey: string): string {
  const node = tryTalentNode(classKey, nodeKey);
  if (node === undefined) return nodeKey;
  if (node.abilityKey !== undefined) return abilityName(node.abilityKey);
  if (node.passive !== undefined) return statLabel(node.passive.stat);
  return dataText('talents', dataKey.talentName(nodeKey), node.name);
}

/** What a role talent, a modifier or a capstone does, or undefined for a node without words of its own. */
export function talentNodeDescription(classKey: string, nodeKey: string): string | undefined {
  const desc = tryTalentNode(classKey, nodeKey)?.desc;
  return desc === undefined ? undefined : dataText('talents', dataKey.talentDescription(nodeKey), desc);
}

/** The name of one of a class's two branches. An unknown key comes back as it is. */
export function talentBranchName(classKey: string, branchKey: string): string {
  const branch = TALENT_TREES[classKey]?.branches.find((b) => b.key === branchKey);
  return branch === undefined ? branchKey : dataText('talents', dataKey.talentBranch(classKey, branchKey), branch.name);
}

/** The name of an effect (a buff or a debuff on a combatant). An unknown key comes back as it is. */
export function effectName(effectKey: string): string {
  const def = EFFECTS[effectKey];
  return def === undefined ? effectKey : dataText('effects', effectKey, def.name);
}

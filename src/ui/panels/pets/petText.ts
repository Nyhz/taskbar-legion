import { getLanguage, t, type PlainTextKey } from '@/i18n';
import { format } from '@/sim/num';
import type { PetObjectiveKind } from '@/data/pets';
import type { PetBonusView, PetBonusWhat } from './petsLayout';

// How the pets wing words a bonus: the amount ("+15 %", "+2", "−90 s"), what it raises, the pet's objective
// (what it counts and how far it is) and its line of lore.

const WHAT: Readonly<Record<PetBonusWhat, PlainTextKey>> = {
  gold: 'pets.bonusGold',
  xp: 'pets.bonusXp',
  chestDrop: 'pets.bonusChestDrop',
  storeNormal: 'pets.bonusStoreNormal',
  storeStageBoss: 'pets.bonusStoreStageBoss',
  storeZoneBoss: 'pets.bonusStoreZoneBoss',
  away: 'pets.bonusAway',
};

// PROVISIONAL lines (written for the mock-up; the content bible may replace them).
const LORE: Readonly<Record<string, PlainTextKey>> = {
  coin_sprite: 'pets.loreCoinSprite',
  scholar_owl: 'pets.loreScholarOwl',
  pack_mule: 'pets.lorePackMule',
  lucky_cat: 'pets.loreLuckyCat',
  time_imp: 'pets.loreTimeImp',
  hoarder: 'pets.loreHoarder',
};

export function bonusAmount(view: PetBonusView): string {
  if (view.unit === 'percent') return t('pets.valuePercent', { n: view.amount });
  if (view.unit === 'hours') return t('pets.valueHours', { n: view.amount });
  return t('pets.valueCount', { n: view.amount });
}

export function bonusName(view: PetBonusView): string {
  return t(WHAT[view.what]);
}

/** A pet's line of lore, or undefined for a pet without one. */
export function petLore(petKey: string): string | undefined {
  const key = LORE[petKey];
  return key === undefined ? undefined : t(key);
}

const OBJECTIVE: Readonly<Record<PetObjectiveKind, PlainTextKey>> = {
  goldEarned: 'pets.objGold',
  xpEarned: 'pets.objXp',
  commonChestsOpened: 'pets.objCommonChests',
  chestsFound: 'pets.objChestsFound',
  timePlayed: 'pets.objTime',
  bossesDefeated: 'pets.objBosses',
};

/** What a pet's objective counts, in words ("Gold earned"). */
export function objectiveName(kind: PetObjectiveKind): string {
  return t(OBJECTIVE[kind]);
}

const HOUR_MS = 3_600_000;
const decimal = (text: string): string => (getLanguage() === 'es' ? text.replace('.', ',') : text);

/** An amount of an objective: play time in hours ("4.5 h", "120 h"), anything else as a short number ("1.25M"). */
export function objectiveAmount(kind: PetObjectiveKind, n: number): string {
  if (kind !== 'timePlayed') return decimal(format(Math.floor(n)));
  const hours = n / HOUR_MS;
  // Floored, never rounded up: "20 h" must not show before the 20 hours are done.
  return t('pets.hours', { n: decimal(hours < 10 ? (Math.floor(hours * 10) / 10).toFixed(1) : String(Math.floor(hours))) });
}

/** "have / goal" of an objective. */
export function objectiveProgress(kind: PetObjectiveKind, have: number, goal: number): string {
  return t('pets.progressOf', { have: objectiveAmount(kind, Math.min(have, goal)), goal: objectiveAmount(kind, goal) });
}

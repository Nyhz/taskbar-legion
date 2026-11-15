import { getLanguage, t, type TextKey } from '@/i18n';
import type { PetBonusView, PetBonusWhat } from './petsLayout';

// How the pets wing words a bonus: the amount ("+15 %", "+2", "−90 s"), what it raises, and the pet's line of lore.

const WHAT: Readonly<Record<PetBonusWhat, TextKey>> = {
  gold: 'pets.bonusGold',
  xp: 'pets.bonusXp',
  chestDrop: 'pets.bonusChestDrop',
  storeNormal: 'pets.bonusStoreNormal',
  storeStageBoss: 'pets.bonusStoreStageBoss',
  storeZoneBoss: 'pets.bonusStoreZoneBoss',
  autoOpen: 'pets.bonusAutoOpen',
};

// PROVISIONAL lines (written for the mock-up; the content bible may replace them).
const LORE: Readonly<Record<string, TextKey>> = {
  coin_sprite: 'pets.loreCoinSprite',
  scholar_owl: 'pets.loreScholarOwl',
  pack_mule: 'pets.lorePackMule',
  lucky_cat: 'pets.loreLuckyCat',
  time_imp: 'pets.loreTimeImp',
  hoarder: 'pets.loreHoarder',
};

export function bonusAmount(view: PetBonusView): string {
  if (view.unit === 'percent') return t('pets.valuePercent', { n: view.amount });
  if (view.unit === 'seconds') return t('pets.valueSeconds', { n: view.amount });
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

/** 50000 → "50,000" / "50 000" (Spanish groups with a space). */
export function grouped(n: number): string {
  const sep = getLanguage() === 'es' ? ' ' : ',';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

import { PET_KEYS, type PetBonus } from '@/data/pets';
import { WINDOW_FRAME_ART, WINDOW_SHADOW_ART, WING_ART_WIDTH } from '../panelLayout';

// The pets wing: its measures in art pixels and the pure bits of what it shows. Pure (no React, no store).
// Stacked for the wing's 154 px: the head, the companion in its niche, its name and its rank line (pips and the
// bar towards the next rank), then the collection on plinths.

/** Pets across the shelf, and one pet's cell (the creature on its plinth, its bonus under it). */
export const PET_SHELF_COLS = 3;
export const PET_CELL_ART = { width: 48, height: 57 };
export const PET_SHELF_GAP_ART = { column: 5, row: 2 };

const HEAD_ART = 20; // the head row (22, pulled up 2 by the kit)
const NICHE_ART = 5 + 116; // the gap above the niche, and the niche
const NAME_ART = 5 + 12; // the companion's name under it
const RANK_ART = 3 + 11; // its rank line: pips and the bar towards the next rank
const SHELF_TOP_ART = 7;

/** Rows of the shelf for `count` pets. */
export function petShelfRows(count: number): number {
  return Math.ceil(Math.max(0, count) / PET_SHELF_COLS);
}

/** The wing's box (frame and shadow included) for a collection of `count` pets. */
export function petsWingArt(count: number): { width: number; height: number } {
  const rows = petShelfRows(count);
  const shelf = rows * PET_CELL_ART.height + Math.max(0, rows - 1) * PET_SHELF_GAP_ART.row;
  return {
    width: WING_ART_WIDTH,
    height: HEAD_ART + NICHE_ART + NAME_ART + RANK_ART + SHELF_TOP_ART + shelf + WINDOW_FRAME_ART + WINDOW_SHADOW_ART,
  };
}

/** The box in its tallest state — every pet the game has: what the panel layer fits the scale to. */
export const PETS_WING_ART = petsWingArt(PET_KEYS.length);

/** What a pet's bonus is, for the interface: its sign, what it raises and how the amount is written. */
export type PetBonusWhat =
  | 'gold'
  | 'xp'
  | 'chestDrop'
  | 'storeNormal'
  | 'storeStageBoss'
  | 'storeZoneBoss'
  | 'away';

export interface PetBonusView {
  sign: string;
  what: PetBonusWhat;
  unit: 'percent' | 'count' | 'hours';
  amount: number;
}

const STORE: Record<'normal' | 'stageBoss' | 'zoneBoss', { sign: string; what: PetBonusWhat }> = {
  normal: { sign: 'pet_sign_store', what: 'storeNormal' },
  stageBoss: { sign: 'pet_sign_store_boss', what: 'storeStageBoss' },
  zoneBoss: { sign: 'pet_sign_store_boss', what: 'storeZoneBoss' },
};

export function petBonusView(bonus: PetBonus): PetBonusView {
  switch (bonus.kind) {
    case 'goldMult':
      return { sign: 'ui_gold', what: 'gold', unit: 'percent', amount: Math.round(bonus.value * 100) };
    case 'xpMult':
      return { sign: 'ui_xp', what: 'xp', unit: 'percent', amount: Math.round(bonus.value * 100) };
    case 'chestDropMult':
      return {
        sign: 'pet_sign_chest',
        what: 'chestDrop',
        unit: 'percent',
        amount: Math.round(bonus.value * 100),
      };
    case 'chestStorage':
      return { ...STORE[bonus.type], unit: 'count', amount: bonus.value };
    case 'awayHours':
      return { sign: 'pet_sign_timer', what: 'away', unit: 'hours', amount: bonus.value };
  }
}

/** The pet shown in the niche: the chosen one while it is owned, else the first one found, else none. The choice
 *  is cosmetic — every owned pet gives its bonus. */
export function companionOf(owned: readonly string[], selected: string | null): string | null {
  if (selected !== null && owned.includes(selected)) return selected;
  return owned[0] ?? null;
}

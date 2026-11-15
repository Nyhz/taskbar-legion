import { describe, expect, it } from 'vitest';
import { PET_KEYS, PETS } from '@/data/pets';
import { WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';
import {
  PETS_WING_ART,
  PET_CELL_ART,
  PET_SHELF_COLS,
  PET_SHELF_GAP_ART,
  companionOf,
  petBonusView,
  petShelfRows,
  petsWingArt,
} from '@/ui/panels/pets/petsLayout';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const art = (stem: string): boolean => existsSync(resolve(__dirname, '../../src/assets/ui', `${stem}.png`));

describe('pets wing layout', () => {
  it('is as wide as every wing and fits above the strip with every pet of the game', () => {
    expect(PETS_WING_ART.width).toBe(WING_ART_WIDTH);
    expect(PETS_WING_ART.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
    expect(PETS_WING_ART).toEqual(petsWingArt(PET_KEYS.length));
  });

  it('the shelf is three across, fits the wing content and grows by rows', () => {
    const shelfWidth = PET_SHELF_COLS * PET_CELL_ART.width + (PET_SHELF_COLS - 1) * PET_SHELF_GAP_ART.column;
    expect(shelfWidth).toBeLessThanOrEqual(154);
    expect(petShelfRows(0)).toBe(0);
    expect(petShelfRows(1)).toBe(1);
    expect(petShelfRows(6)).toBe(2);
    expect(petShelfRows(7)).toBe(3);
    expect(petsWingArt(9).height - petsWingArt(6).height).toBe(PET_CELL_ART.height + PET_SHELF_GAP_ART.row);
  });

  it('every pet has its creature, its silhouette and a sign for its bonus', () => {
    for (const key of PET_KEYS) {
      const def = PETS[key];
      if (def === undefined) throw new Error(key);
      expect(art(`pet_${def.sprite}`), `pet_${def.sprite}`).toBe(true);
      expect(art(`pet_${def.sprite}_dark`), `pet_${def.sprite}_dark`).toBe(true);
      for (const bonus of def.ranks) expect(art(petBonusView(bonus).sign), key).toBe(true);
    }
    expect(art('pet_plinth') && art('pet_plinth_on') && art('pet_sign_paw') && art('ui_alcove')).toBe(true);
  });

  it('words each kind of bonus with the right unit and amount', () => {
    expect(petBonusView({ kind: 'goldMult', value: 0.15 })).toMatchObject({
      what: 'gold',
      unit: 'percent',
      amount: 15,
    });
    expect(petBonusView({ kind: 'xpMult', value: 0.15 })).toMatchObject({
      what: 'xp',
      unit: 'percent',
      amount: 15,
    });
    expect(petBonusView({ kind: 'chestDropMult', value: 0.12 })).toMatchObject({
      what: 'chestDrop',
      amount: 12,
    });
    expect(petBonusView({ kind: 'chestStorage', type: 'normal', value: 2 })).toMatchObject({
      what: 'storeNormal',
      unit: 'count',
      amount: 2,
    });
    expect(petBonusView({ kind: 'chestStorage', type: 'stageBoss', value: 1 })).toMatchObject({
      what: 'storeStageBoss',
      amount: 1,
    });
    expect(petBonusView({ kind: 'awayHours', value: 10 })).toMatchObject({
      what: 'away',
      unit: 'hours',
      amount: 10,
    });
  });

  it('the companion is the chosen pet while owned, else the first found, else none', () => {
    expect(companionOf([], null)).toBeNull();
    expect(companionOf([], 'lucky_cat')).toBeNull();
    expect(companionOf(['scholar_owl', 'lucky_cat'], 'lucky_cat')).toBe('lucky_cat');
    expect(companionOf(['scholar_owl', 'lucky_cat'], null)).toBe('scholar_owl');
    expect(companionOf(['scholar_owl'], 'hoarder')).toBe('scholar_owl'); // a stale choice falls back
  });
});

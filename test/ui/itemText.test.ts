import { afterEach, describe, expect, it } from 'vitest';
import { composeItem, type ItemOrigin } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { setLanguage } from '@/i18n/core';
import {
  itemFamilyName,
  itemKindName,
  ownStats,
  signed,
  signedPercent,
  statAmount,
  statDelta,
  statGain,
} from '@/ui/panels/items/itemText';

const origin = (seed: number): ItemOrigin => ({
  rollSeed: seed,
  stageIndex: 60,
  chestType: 'normal',
  generatorVersion: GENERATOR_VERSION,
});
const make = (
  slot: Parameters<typeof composeItem>[0],
  tier: Parameters<typeof composeItem>[1],
  seed: number,
  cls?: string,
) => composeItem(slot, tier, origin(seed), makeRng(seed), undefined, cls);

afterEach(() => setLanguage('en'));

describe('item texts', () => {
  it('writes numbers the way the language does', () => {
    setLanguage('en');
    expect(statGain('armor', 802)).toBe('+802');
    expect(statGain('critChance', 2.64)).toBe('+2.6%');
    expect(statGain('critChance', 24.5)).toBe('+25%'); // one decimal under 10, none from there (as the game always did)
    expect(statDelta('block', -4.2)).toBe('−4.2%');
    expect(statDelta('armor', 178)).toBe('+178');
    expect(signedPercent(3.84)).toBe('+3.8%');
    expect(signed(-3)).toBe('−3');
    setLanguage('es');
    expect(statGain('critChance', 2.64)).toBe('+2,6 %');
    expect(statDelta('block', -4.2)).toBe('−4,2 %');
    expect(signedPercent(-0.61)).toBe('−0,6 %');
    expect(statAmount('armor', -802)).toBe('802'); // an amount carries no sign
  });

  it('names a piece by its weapon type or its slot, in the current language', () => {
    expect(itemKindName(make('weapon', 3, 1, 'knight'))).toBe('Sword');
    expect(itemKindName(make('offhand', 3, 2, 'ranger'))).toBe('Quiver');
    expect(itemKindName(make('helmet', 3, 3, 'priest'))).toBe('Helmet');
    expect(itemKindName(make('ring', 3, 4))).toBe('Ring');
    setLanguage('es');
    expect(itemKindName(make('weapon', 3, 1, 'knight'))).toBe('Espada');
    expect(itemKindName(make('helmet', 3, 3, 'priest'))).toBe('Yelmo');
  });

  it('says the armour family of the class a piece belongs to, and nothing for the rest', () => {
    expect(itemFamilyName(make('chest', 3, 5, 'knight'))).toBe('Plate');
    expect(itemFamilyName(make('chest', 3, 6, 'ranger'))).toBe('Leather');
    expect(itemFamilyName(make('chest', 3, 7, 'priest'))).toBe('Cloth');
    expect(itemFamilyName(make('weapon', 3, 8, 'knight'))).toBeUndefined();
    expect(itemFamilyName(make('ring', 3, 9))).toBeUndefined();
    expect(itemFamilyName({ ...make('chest', 3, 10, 'knight'), classKey: 'nobody' })).toBeUndefined(); // a stale key must not throw
    setLanguage('es');
    expect(itemFamilyName(make('chest', 3, 5, 'knight'))).toBe('Placas');
  });

  it("totals an item's own stats (base + substats), never its gems", () => {
    const item = make('chest', 8, 11, 'knight');
    const total = ownStats(item);
    for (const roll of [...item.baseAffix, ...item.stats])
      expect(total.get(roll.key)).toBeGreaterThanOrEqual(roll.value);
    expect(total.size).toBe(new Set([...item.baseAffix, ...item.stats].map((r) => r.key)).size);
  });
});

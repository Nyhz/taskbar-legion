import { describe, expect, it } from 'vitest';
import { DATA_GROUPS, visibleDataTexts } from '@/i18n/dataTexts';
import { DATA_DICTIONARIES } from '@/i18n/names';
import { numbersOf } from './_helpers';

// Data keeps writing English; every visible data text of a registered group must have its Spanish in
// src/data/i18n/es/<group>.json, translated from the English that data declares TODAY (REDESIGN §8).

describe('data text dictionaries', () => {
  const texts = visibleDataTexts();

  for (const group of DATA_GROUPS) {
    describe(group, () => {
      const dictionary = DATA_DICTIONARIES[group];

      it('has a translation for every visible text', () => {
        const missing = Object.keys(texts[group]).filter((key) => (dictionary[key]?.es ?? '').trim() === '');
        expect(missing).toEqual([]);
      });

      it('was translated from the current English', () => {
        const stale = Object.entries(texts[group])
          .filter(([key, english]) => dictionary[key] !== undefined && dictionary[key]?.en !== english)
          .map(([key, english]) => `${key}: data says "${english}", dictionary was translated from "${dictionary[key]?.en ?? ''}"`);
        expect(stale).toEqual([]);
      });

      it('holds no entry that data no longer declares', () => {
        const orphans = Object.keys(dictionary).filter((key) => !(key in texts[group]));
        expect(orphans).toEqual([]);
      });

      it('keeps the numbers of the English', () => {
        for (const [key, entry] of Object.entries(dictionary)) {
          if (entry !== undefined) expect(numbersOf(entry.es), `${group}/${key}`).toEqual(numbersOf(entry.en));
        }
      });
    });
  }
});

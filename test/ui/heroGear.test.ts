import { describe, expect, it } from 'vitest';
import { GEAR_OVER, GEAR_UNDER, averageItemLevel, gearQuality, usualItemLevel } from '@/ui/panels/hero/gearQuality';
import { dollStats, statText } from '@/ui/panels/hero/heroStats';
import { SLOT_KEYS } from '@/data/itemSlots';

describe('hero window: how the worn gear reads', () => {
  it('averages over ALL ten slots, an empty slot counting as 0', () => {
    expect(averageItemLevel({})).toBe(0);
    expect(averageItemLevel({ helmet: { ilvl: 10 } })).toBeCloseTo(10 / SLOT_KEYS.length);
    const full = Object.fromEntries(SLOT_KEYS.map((slot) => [slot, { ilvl: 40 }]));
    expect(averageItemLevel(full)).toBe(40);
  });

  it('judges the gear by its power against what is usually worn at the stage (item levels are stages)', () => {
    const stage = 120;
    const usual = usualItemLevel(stage);
    expect(gearQuality(0, stage)).toBe('under'); // naked is always under-geared
    expect(gearQuality(usual, stage)).toBe('even');
    expect(gearQuality(usual + 6, stage)).toBe('over'); // +6 stages ≈ +13 % power
    expect(gearQuality(usual - 11, stage)).toBe('under'); // −11 stages ≈ −20 % power
    expect(GEAR_OVER).toBeGreaterThan(1);
    expect(GEAR_UNDER).toBeLessThan(1);
  });

  it('shows ten stats beside the doll: heal power for the healer, multistrike for the others', () => {
    for (const cls of ['knight', 'ranger', 'priest']) {
      const { offence, defence } = dollStats(cls);
      expect(offence.length + defence.length).toBe(10);
      expect(new Set([...offence, ...defence]).size).toBe(10);
    }
    expect(dollStats('priest').offence).toContain('healPower');
    expect(dollStats('knight').offence).toContain('multistrike');
  });

  it('writes a percent with one decimal at most and a flat number shortened', () => {
    expect(statText('critChance', 19.14)).toBe('19.1 %');
    expect(statText('block', 13)).toBe('13 %');
    expect(statText('health', 661.4)).toBe('661');
  });
});

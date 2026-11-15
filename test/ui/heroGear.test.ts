import { describe, expect, it } from 'vitest';
import { GEAR_OVER, GEAR_UNDER, averageItemLevel, gearQuality } from '@/ui/panels/hero/gearQuality';
import { dollStats, statText } from '@/ui/panels/hero/heroStats';
import { SLOT_KEYS } from '@/data/itemSlots';
import { expectedLevel } from '@/data/stageScaling';

describe('hero window: how the worn gear reads', () => {
  it('averages over ALL ten slots, an empty slot counting as 0', () => {
    expect(averageItemLevel({})).toBe(0);
    expect(averageItemLevel({ helmet: { ilvl: 10 } })).toBeCloseTo(10 / SLOT_KEYS.length);
    const full = Object.fromEntries(SLOT_KEYS.map((slot) => [slot, { ilvl: 40 }]));
    expect(averageItemLevel(full)).toBe(40);
  });

  it('judges the gear against the level the stage loot is centred on, with a ±10 % band', () => {
    const stage = 120;
    const level = Math.max(1, expectedLevel(stage));
    expect(gearQuality(0, stage)).toBe('under'); // naked is always under-geared
    expect(gearQuality(level, stage)).toBe('even');
    expect(gearQuality(level * (GEAR_OVER + 0.01), stage)).toBe('over');
    expect(gearQuality(level * (GEAR_UNDER - 0.01), stage)).toBe('under');
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

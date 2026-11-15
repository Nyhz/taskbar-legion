import { describe, expect, it } from 'vitest';
import { DEFENSIVE_STATS, OFFENSIVE_STATS, type StatKey } from '@/data/stats';
import { SHEET_ACCOUNT_ART_HEIGHT, SHEET_MAX_STAT_ROWS, sheetColumns } from '@/ui/panels/hero/sheetLayout';
import { SHEET_WING_ART, TALENTS_WING_ART } from '@/ui/panels/hero/wingLayout';
import { WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';

const REST: StatKey[] = ['damageReduction', 'cooldownReduction', 'healPower'];

describe('sheet wing layout (two columns)', () => {
  it('keeps offence on the left and defence on the right, every stat exactly once', () => {
    const [left, right] = sheetColumns(OFFENSIVE_STATS, DEFENSIVE_STATS, REST);
    expect(left.slice(0, OFFENSIVE_STATS.length)).toEqual(OFFENSIVE_STATS);
    expect(right.slice(0, DEFENSIVE_STATS.length)).toEqual(DEFENSIVE_STATS);
    expect([...left, ...right].sort()).toEqual([...OFFENSIVE_STATS, ...DEFENSIVE_STATS, ...REST].sort());
  });

  it('puts the other figures under the shorter column, so no column outgrows the declared maximum', () => {
    expect(sheetColumns(['attackDamage'], ['armor', 'health', 'block'], REST).map((c) => c.length)).toEqual([
      4, 3,
    ]);
    expect(sheetColumns([], [], ['cooldownReduction', 'healPower'])).toEqual([
      ['cooldownReduction'],
      ['healPower'],
    ]);
    for (let o = 0; o <= OFFENSIVE_STATS.length; o++) {
      for (let d = 0; d <= DEFENSIVE_STATS.length; d++) {
        const columns = sheetColumns(OFFENSIVE_STATS.slice(0, o), DEFENSIVE_STATS.slice(0, d), REST);
        for (const column of columns) expect(column.length).toBeLessThanOrEqual(SHEET_MAX_STAT_ROWS);
      }
    }
  });

  it('the sheet and the talents wings are one wing wide and no taller than a wing may be', () => {
    expect(SHEET_ACCOUNT_ART_HEIGHT).toBe(76); // seven figures, four to a line
    for (const wing of [SHEET_WING_ART, TALENTS_WING_ART]) {
      expect(wing.width).toBe(WING_ART_WIDTH);
      expect(wing.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '@/data/achievements';
import { WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';
import { CODEX_WING_ART, MEDALS_PER_ROW, MEDAL_PITCH_ART, medalOf, roman, seriesOf } from '@/ui/panels/codex/codexLayout';
import { worldCast } from '@/ui/panels/codex/BestiaryView';
import { allCreatures } from '@/data/worlds';
import { CREATURE_LORE } from '@/data/bestiaryLore';

describe('codex wing', () => {
  it('is a wing: its width, no taller than the tallest wing', () => {
    expect(CODEX_WING_ART.width).toBe(WING_ART_WIDTH);
    expect(CODEX_WING_ART.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
    expect(MEDALS_PER_ROW * MEDAL_PITCH_ART).toBeLessThanOrEqual(154);
  });

  it('shows every achievement once, in its category and series', () => {
    const shown = ACHIEVEMENT_CATEGORIES.flatMap((c) => seriesOf(c).flatMap((s) => s.steps.map((a) => a.key)));
    expect(shown.sort()).toEqual(ACHIEVEMENTS.map((a) => a.key).sort());
  });

  it('medals climb bronze → silver → gold up a series; unreached is locked', () => {
    expect(medalOf(0, 9, true)).toBe('bronze');
    expect(medalOf(4, 9, true)).toBe('silver');
    expect(medalOf(8, 9, true)).toBe('gold');
    expect(medalOf(8, 9, false)).toBe('locked');
    expect(roman(1)).toBe('I');
    expect(roman(14)).toBe('XIV');
    expect(roman(50)).toBe('L');
  });

  it('the bestiary shows six creatures a world, and every creature has its line', () => {
    for (let w = 1; w <= 10; w++) expect(worldCast(w)).toHaveLength(6);
    for (const c of allCreatures()) expect(CREATURE_LORE[c.key], c.key).toBeTruthy();
  });
});

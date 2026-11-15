import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { EFFECTS } from '@/data/effects';
import { ULTIMATES } from '@/data/ultimates';
import { EFFECT_LOOKS } from '@/game/render/abilityFx';
import {
  BARS, CHIP, ENDING_MS, FOE_BAR_FADE_MS, FOE_BAR_STAY_MS, GHOST_HOLD_MS, HERO_HUD_CX, HERO_HUD_WIDTH, MAX_EFFECT_CHIPS, SIGN,
  abilityChips, barSegments, effectChips, effectSign, foeBarAlpha, heroHudCx, heroHudLayout, miniSign, newGhost, rowLeft, rowWidth,
  shadeRows, stackBars, stepGhost, ultimateChip,
} from '@/game/render/stripHud';

const ART = new Set(
  readdirSync(fileURLToPath(new URL('../../src/assets/ui', import.meta.url)))
    .filter((f) => f.startsWith('hud_s_'))
    .map((f) => f.replace(/\.png$/, '')),
);
const heroAbilities = Object.keys(ABILITIES).filter((k) => CLASS_KEYS.some((c) => k.startsWith(`${c}_`)));

describe('a bar of the strip HUD', () => {
  it('fills whole pixels and never shows a living fighter empty', () => {
    expect(barSegments(24, 1)).toEqual({ life: 24, ghost: 0, shieldX: 0, shieldW: 0 });
    expect(barSegments(24, 0.5).life).toBe(12);
    expect(barSegments(24, 0.004).life).toBe(1);
    expect(barSegments(24, 0).life).toBe(0);
  });

  it('shows what was just lost right after the life', () => {
    expect(barSegments(24, 0.5, 0.75)).toMatchObject({ life: 12, ghost: 6 });
    expect(barSegments(24, 0.5, 0.2).ghost).toBe(0); // a ghost under the life is nothing
  });

  it('stands a shield after the life, or over the bar\'s right end when the two do not fit', () => {
    expect(barSegments(24, 0.5, 0, 0.25)).toMatchObject({ shieldX: 12, shieldW: 6 });
    expect(barSegments(24, 1, 0, 0.25)).toMatchObject({ shieldX: 18, shieldW: 6 });
    expect(barSegments(24, 0.9, 0, 5)).toMatchObject({ shieldX: 0, shieldW: 24 });
  });

  it('holds the lost slice, then drains it; a heal snaps it up', () => {
    let g = stepGhost(newGhost(1), 0.6, 16); // a hit
    expect(g.ghost).toBe(1);
    g = stepGhost(g, 0.6, GHOST_HOLD_MS / 2); // still held
    expect(g.ghost).toBe(1);
    g = stepGhost(g, 0.6, GHOST_HOLD_MS / 2 + 50); // the hold runs out: it starts draining
    expect(g.ghost).toBeLessThan(1);
    expect(g.ghost).toBeGreaterThan(0.6);
    g = stepGhost(g, 0.6, 5000);
    expect(g.ghost).toBe(0.6);
    expect(stepGhost(g, 0.9, 16).ghost).toBe(0.9);
  });

  it('every casing, fill and chip the code names has its art', () => {
    for (const spec of Object.values(BARS)) expect(ART, spec.casing).toContain(spec.casing);
    for (const stem of ['hud_s_bar_hero_low', 'hud_s_bar_hero_notch', 'hud_s_fill_life', 'hud_s_fill_low', 'hud_s_fill_ghost', 'hud_s_fill_shield',
      'hud_s_fill_respawn', 'hud_s_fill_foe', 'hud_s_fill_cast', 'hud_s_fill_cast_wound', 'hud_s_m_respawn']) expect(ART, stem).toContain(stem);
    for (const frame of ['buff', 'debuff', 'ready', 'wait', 'charge']) expect(ART).toContain(`hud_s_chip_${frame}`);
    for (let n = 1; n <= 9; n++) expect(ART).toContain(`hud_s_more_${n}`);
  });
});

describe('the chips of the effects on a hero', () => {
  const fx = (defKey: string, remainingMs: number, totalMs: number): { defKey: string; remainingMs: number; totalMs: number } => ({ defKey, remainingMs, totalMs });

  it('every hero ability and ultimate has a mini sign', () => {
    for (const key of [...heroAbilities, ...Object.values(ULTIMATES).map((u) => u.key)]) {
      expect(ART, `${key} → hud_s_m_${miniSign(key)}`).toContain(`hud_s_m_${miniSign(key)}`);
    }
  });

  it('every effect that has a lasting look, and every effect in the data, gets a sign that exists', () => {
    for (const key of [...Object.keys(EFFECT_LOOKS), ...Object.keys(EFFECTS)]) expect(ART, key).toContain(`hud_s_m_${effectSign(key)}`);
    expect(effectSign('an_effect_from_an_old_save')).toBe('buff');
    expect(effectSign('debuff_mortal_wound')).toBe('wound');
  });

  it('is one chip per ability, timed by its longest effect, debuffs first', () => {
    const { chips, more } = effectChips([
      fx('buff_battlecry_ad', 2000, 8000),
      fx('buff_battlecry_crit', 6000, 8000),
      fx('debuff_mortal_wound', 8000, 8000),
    ]);
    expect(more).toBe(0);
    expect(chips.map((c) => [c.sign, c.frame])).toEqual([['wound', 'debuff'], ['battle_cry', 'buff']]);
    expect(chips[1]?.shade).toBe(shadeRows(0.25));
    expect(chips[0]?.shade).toBe(0);
  });

  it('leaves the shield to the life bar and instants out', () => {
    expect(effectChips([fx('fx_shield', 3000, 4000), fx('fx_damage', 0, 0)]).chips).toEqual([]);
  });

  it('caps the row and counts the rest', () => {
    const many = [fx('buff_guard_block', 5000, 6000), fx('buff_battlecry_ad', 5000, 8000), fx('buff_bloodlust_as', 5000, 8000), fx('buff_enrage_as', 5000, 10000), fx('fx_hot', 5000, 6000)];
    const { chips, more } = effectChips(many);
    expect(chips).toHaveLength(MAX_EFFECT_CHIPS - 1);
    expect(more).toBe(3);
    expect(effectChips(many.slice(0, 3)).more).toBe(0); // exactly a full row: no "+N"
  });

  it('marks an effect that is about to end, and shades whole rows only', () => {
    expect(effectChips([fx('fx_hot', ENDING_MS - 1, 6000)]).chips[0]?.ending).toBe(true);
    expect(effectChips([fx('fx_hot', 5000, 6000)]).chips[0]?.ending).toBe(false);
    for (const gone of [0, 0.2, 0.5, 0.99, 1, 3]) {
      expect(Number.isInteger(shadeRows(gone))).toBe(true);
      expect(shadeRows(gone)).toBeLessThanOrEqual(SIGN);
    }
  });
});

describe('the chips of a hero\'s abilities', () => {
  const ability = (key: string, toCast?: number): { def: { key: string; charge?: { toCast: number } } } => ({ def: toCast === undefined ? { key } : { key, charge: { toCast } } });

  it('shows ready, recharging and charging by hits', () => {
    const chips = abilityChips({
      abilities: [ability('knight_guard'), ability('ranger_aimedshot', 10)],
      cooldowns: { knight_guard: 6000 },
      cooldownTotals: { knight_guard: 12000 },
      charges: { ranger_aimedshot: 5 },
    });
    expect(chips.map((c) => [c.sign, c.frame])).toEqual([['stone_skin', 'wait'], ['aimed_shot', 'charge']]);
    expect(chips[0]?.shade).toBe(shadeRows(0.5));
    expect(chips[1]?.shade).toBe(shadeRows(0.5));
    const ready = abilityChips({ abilities: [ability('knight_guard'), ability('ranger_aimedshot', 10)], cooldowns: {}, charges: { ranger_aimedshot: 10 } });
    expect(ready.map((c) => [c.frame, c.shade])).toEqual([['ready', 0], ['ready', 0]]);
  });

  it('never looks ready while a little is left, and shows two at most', () => {
    const chips = abilityChips({ abilities: [ability('knight_guard'), ability('knight_bulwark'), ability('knight_battlecry')], cooldowns: { knight_guard: 50 }, cooldownTotals: { knight_guard: 12000 } });
    expect(chips).toHaveLength(2);
    expect(chips[0]).toMatchObject({ frame: 'wait', shade: 1 });
  });
});

describe('an enemy\'s bar', () => {
  it('shows only while it is hurt and something hit it lately; an elite\'s always', () => {
    expect(foeBarAlpha({ elite: false, frac: 1, sinceHitMs: 0 })).toBe(0);
    expect(foeBarAlpha({ elite: false, frac: 0.5, sinceHitMs: 100 })).toBe(1);
    expect(foeBarAlpha({ elite: false, frac: 0.5, sinceHitMs: FOE_BAR_STAY_MS + FOE_BAR_FADE_MS / 2 })).toBeCloseTo(0.5);
    expect(foeBarAlpha({ elite: false, frac: 0.5, sinceHitMs: 60_000 })).toBe(0);
    expect(foeBarAlpha({ elite: true, frac: 1, sinceHitMs: 60_000 })).toBe(1);
  });

  it('a pack on one spot shows a few stacked bars, never a ladder; an elite keeps its place', () => {
    const foe = { x: 100, y: -30, w: BARS.foe.w, h: BARS.foe.h };
    const lifts = stackBars([{ x: 102, y: -60, w: BARS.elite.w, h: BARS.elite.h + 7, elite: true }, foe, { ...foe, x: 101 }, { ...foe, x: 99 }, { ...foe, x: 100 }, { ...foe, x: 100 }]);
    expect(lifts[0]).toBe(0); // the elite, placed first
    expect(lifts[1]).toBe(0);
    expect(lifts[2]).toBe(BARS.foe.h + 1);
    expect(lifts.filter((l) => l === null).length).toBeGreaterThan(0); // the rest have no room
    const common = lifts.slice(1).filter((l): l is number => l !== null);
    expect(new Set(common).size).toBe(common.length); // no two common bars at the same height
    expect(common.length).toBeLessThanOrEqual(3);
    expect(stackBars([foe, { ...foe, x: 100 + BARS.foe.w + 2 }])).toEqual([0, 0]); // side by side: nobody moves
  });
});

describe('the chip of a hero\'s ultimate', () => {
  const ult = (classKey: string): { key: string; effect: (typeof ULTIMATES)[string]['effect'] } => {
    const def = ULTIMATES[classKey];
    if (def === undefined) throw new Error(`no ultimate for ${classKey}`);
    return { key: def.key, effect: def.effect };
  };

  it('is absent until the hero has his ultimate', () => {
    expect(ultimateChip({}, false)).toBeNull();
  });

  it('Last Stand is ready while its charge is up and spent once used, whatever the boss does', () => {
    expect(ultimateChip({ ult: ult('knight'), ultCharge: 1 }, true)).toMatchObject({ sign: 'last_stand', frame: 'ready', shade: 0 });
    expect(ultimateChip({ ult: ult('knight'), ultCharge: 0 }, false)).toMatchObject({ sign: 'last_stand', frame: 'wait', shade: SIGN });
  });

  it('the two that fire when a boss joins are ready until it does, then spent until it is gone', () => {
    expect(ultimateChip({ ult: ult('ranger') }, false)).toMatchObject({ sign: 'hunters_mark', frame: 'ready' });
    expect(ultimateChip({ ult: ult('ranger') }, true)).toMatchObject({ sign: 'hunters_mark', frame: 'wait', shade: SIGN });
    expect(ultimateChip({ ult: ult('priest') }, false)).toMatchObject({ sign: 'battle_enrage', frame: 'ready' });
    expect(ultimateChip({ ult: ult('priest') }, true)?.frame).toBe('wait');
  });
});

describe('where a hero\'s HUD sits', () => {
  it('fits between two heroes 40 px apart', () => {
    expect(HERO_HUD_WIDTH).toBeLessThan(40);
    expect(rowWidth(MAX_EFFECT_CHIPS)).toBeLessThan(40);
    expect(rowWidth(3)).toBeLessThan(40); // two abilities and the ultimate
  });

  it('every piece is odd-wide and centred on the same line, on whole pixels', () => {
    const lay = heroHudLayout();
    expect(BARS.hero.w % 2).toBe(1);
    expect(lay.bar.x).toBe(-(BARS.hero.w - 1) / 2); // the bar's middle pixel is x = 0
    for (const n of [1, 2, 3]) {
      expect(rowWidth(n) % 2).toBe(1);
      expect(rowLeft(n)).toBe(-(rowWidth(n) - 1) / 2);
      expect(Number.isInteger(rowLeft(n))).toBe(true);
    }
    expect(rowLeft(0)).toBe(0);
  });

  it('each class has its own centre line, a few pixels ahead of its root', () => {
    for (const classKey of CLASS_KEYS) {
      expect(HERO_HUD_CX[classKey], classKey).toBeDefined();
      expect(heroHudCx(classKey)).toBeGreaterThanOrEqual(1);
      expect(heroHudCx(classKey)).toBeLessThanOrEqual(8);
    }
    expect(heroHudCx('knight')).toBeGreaterThan(heroHudCx('ranger')); // he fights in a wide forward stance
    expect(Number.isInteger(heroHudCx('a class from the future'))).toBe(true);
  });

  it('puts the effect row over the bar and the bar over the head, a pixel apart; the abilities under the feet', () => {
    const lay = heroHudLayout();
    expect(lay.bar.y + BARS.hero.h).toBeLessThan(0);
    expect(lay.effectsY + CHIP).toBe(lay.bar.y - 1);
    expect(lay.top).toBe(-lay.effectsY);
    expect(lay.cooldowns.y).toBeGreaterThan(0);
  });
});

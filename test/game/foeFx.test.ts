import { describe, expect, it } from 'vitest';
import { ENEMY_KINDS, SUPPORT_AURA_KEYS, SUPPORT_KIND, TRAIT_TUNING } from '@/data/enemies';
import { WORLDS } from '@/data/worlds';
import { AREA_BLOWS, FOE_SHOT } from '@/game/render/enemyFx';
import { creatureRole, figureMeta, worldSupportFigureKey } from '@/game/render/figureData';
import { fxMeta } from '@/game/render/fxData';
import {
  AURA_SIGNS, AURA_SIGN_STEP, BRUTE_FIGURE_SCALE, CHARGED_SHOT, CHARGE_HIT_FX, FOCUS_RETICLE_FX, FOE_CUES, ROLE_FIGURE, auraSignOffsets, auraSigns,
} from '@/game/render/foeFx';

// How the wave enemies' kinds, traits and auras are shown (render/foeFx): data and its art, no Pixi.

describe('the four kinds and the support, by figure', () => {
  it('each kind is always the same figure of its world: beast, melee fighter (the brute a size up), ranged', () => {
    const drawn = (key: string): string => {
      const kind = [...ENEMY_KINDS, SUPPORT_KIND].find((k) => k.key === key)!;
      return creatureRole({ id: 'e1_0_0', range: kind.range, enemyMagic: kind.magic, enemyRole: kind.role });
    };
    expect(drawn('beast')).toBe('beast');
    expect(drawn('grunt')).toBe('melee');
    expect(drawn('brute')).toBe('melee');
    expect(drawn('archer')).toBe('ranged');
    expect(drawn('support')).toBe('ranged');
    // Whatever its id: the kind decides, not a coin.
    for (let i = 0; i < 50; i++) expect(creatureRole({ id: `e7_${i}_${i % 5}`, range: 55, enemyRole: 'beast' })).toBe('beast');
    for (const role of Object.keys(ROLE_FIGURE)) expect(['beast', 'melee', 'ranged']).toContain(ROLE_FIGURE[role as keyof typeof ROLE_FIGURE]);
    expect(BRUTE_FIGURE_SCALE).toBeGreaterThan(1);
    expect(BRUTE_FIGURE_SCALE).toBeLessThan(1.25); // smaller than an elite's size: a big one, not a champion
  });

  it("a world's own support figure is used only once it is exported; until then the ranged creature stands in", () => {
    for (const world of WORLDS) {
      const key = worldSupportFigureKey(world.index);
      if (world.support === undefined) expect(key).toBeUndefined();
      else expect(key === undefined || figureMeta(key) !== undefined).toBe(true);
    }
  });
});

describe('traits: brief flashes', () => {
  it('every cue of the simulation has a one-shot that exists and ends', () => {
    expect(Object.keys(FOE_CUES).sort()).toEqual(['guard', 'lastBreath', 'supportDown']);
    for (const [key, cue] of Object.entries(FOE_CUES)) {
      const meta = fxMeta(cue.fx);
      expect(meta, `${key}: ${cue.fx}`).toBeDefined();
      expect(meta?.loop, `${key}: ${cue.fx} is a flash, not something that stays`).toBe(false);
      const ms = (meta?.ms ?? []).reduce((a, b) => a + b, 0);
      expect(ms).toBeLessThan(500);
    }
  });

  it('the charged shot is the same arrow, lit: a flat one and one frame per pitch for the lofted one', () => {
    expect(fxMeta(CHARGED_SHOT.fx)?.loop).toBe(true);
    expect(fxMeta(CHARGED_SHOT.arc)?.n).toBe(fxMeta(FOE_SHOT.ranged.arc ?? '')?.n);
  });

  it("a beast's charge bursts once on the hero, with art that exists", () => {
    expect(fxMeta(CHARGE_HIT_FX)?.loop).toBe(false);
    expect(CHARGE_HIT_FX).not.toBe(FOE_SHOT.ranged.land); // its own burst, not the mark a shot leaves
  });

  it('there is one reticle, and it loops', () => {
    expect(fxMeta(FOCUS_RETICLE_FX)?.loop).toBe(true);
  });

  it("Temblor's blow has its own look: the ground splits under each hero", () => {
    const blow = AREA_BLOWS[TRAIT_TUNING.tremor.ability];
    expect(blow).toBeDefined();
    expect(blow?.jolt).not.toBe(AREA_BLOWS[TRAIT_TUNING.tremor.replaces]?.jolt);
    expect(fxMeta(blow?.jolt ?? '')?.loop).toBe(false);
  });
});

describe("the support's aura signs", () => {
  it('every aura has a small sign of its own', () => {
    const signs = SUPPORT_AURA_KEYS.map((k) => AURA_SIGNS[k]);
    expect(new Set(signs).size).toBe(SUPPORT_AURA_KEYS.length);
    for (const fx of signs) {
      const meta = fxMeta(fx);
      expect(meta, fx).toBeDefined();
      expect(meta?.w).toBeLessThanOrEqual(AURA_SIGN_STEP);
      expect(meta?.h).toBeLessThanOrEqual(9);
    }
    expect(auraSigns(['fury', 'aegis'])).toEqual([AURA_SIGNS.fury, AURA_SIGNS.aegis]);
    expect(auraSigns(['gone'])).toEqual([]);
    expect(auraSigns(undefined)).toEqual([]);
  });

  it('they sit in one centred row, up to five, without overlapping', () => {
    expect(auraSignOffsets(0)).toEqual([]);
    expect(auraSignOffsets(1)).toEqual([0]);
    expect(auraSignOffsets(2)).toEqual([Math.round(-0.5 * AURA_SIGN_STEP), Math.round(0.5 * AURA_SIGN_STEP)]);
    const five = auraSignOffsets(5);
    expect(five).toHaveLength(5);
    expect(five[2]).toBe(0);
    for (let i = 1; i < five.length; i++) expect((five[i] ?? 0) - (five[i - 1] ?? 0)).toBeGreaterThanOrEqual(AURA_SIGN_STEP - 1);
    expect(auraSignOffsets(9)).toHaveLength(5);
  });
});

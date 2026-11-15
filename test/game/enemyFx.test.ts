import { describe, expect, it } from 'vitest';
import { ABILITIES, WHOLE_PARTY } from '@/data/abilities';
import { EFFECT_LOOKS, hasOwnLook, wornLooks } from '@/game/render/abilityFx';
import { categorize } from '@/game/render/effectAuras';
import { AREA_BLOWS, FOE_SHOT, WARN_HOT_FROM, areaBlow, burstOffsets, shotGoesOver, warnTiles, waveReachMs } from '@/game/render/enemyFx';
import { fxMeta } from '@/game/render/fxData';

describe("the enemies' shots", () => {
  it('an archer and a caster each fly their own shot, with a landing', () => {
    for (const [style, shot] of Object.entries(FOE_SHOT)) {
      expect(fxMeta(shot.fx)?.loop, `${style}: ${shot.fx}`).toBe(true);
      expect(fxMeta(shot.land)?.loop, `${style}: ${shot.land}`).toBe(false);
      if (shot.arc !== undefined) expect(fxMeta(shot.arc)?.n ?? 0, `${style}: ${shot.arc} has a frame per pitch`).toBeGreaterThanOrEqual(5);
    }
    expect(FOE_SHOT.ranged.arc).toBeDefined(); // the shot that goes over the front line
  });

  it('a shot at a hero behind the front one goes over him; a shot at the front hero flies level', () => {
    expect(shotGoesOver(100, 100)).toBe(false);
    expect(shotGoesOver(97, 100)).toBe(false); // the front hero himself, a pixel or two off
    expect(shotGoesOver(80, 100)).toBe(true);
    expect(shotGoesOver(100, Number.NEGATIVE_INFINITY)).toBe(false); // nobody in front
  });
});

describe('area blows', () => {
  it('every enemy ability that reaches the whole party has a look, and nothing else does', () => {
    const reaching = Object.values(ABILITIES).filter((a) => a.power?.splashRadius === WHOLE_PARTY).map((a) => a.key).sort();
    expect(Object.keys(AREA_BLOWS).sort()).toEqual(reaching);
    expect(areaBlow('boss_slam')).toBeDefined();
    expect(areaBlow('enemy_bolt')).toBeUndefined();
    expect(areaBlow(undefined)).toBeUndefined();
  });

  it('a blow with a cast time warns on the ground while it is wound up; an instant one cannot', () => {
    for (const [key, blow] of Object.entries(AREA_BLOWS)) {
      const cast = ABILITIES[key]?.castTimeMs ?? 0;
      expect(blow.warn !== undefined, `${key} warns`).toBe(cast > 0);
      if (blow.warn !== undefined) {
        expect(fxMeta(blow.warn.fx)?.loop, blow.warn.fx).toBe(true);
        expect(fxMeta(blow.warn.hot)?.loop, blow.warn.hot).toBe(true);
      }
      if (blow.origin !== undefined) expect(fxMeta(blow.origin)?.loop, blow.origin).toBe(false);
      expect(fxMeta(blow.jolt)?.loop, blow.jolt).toBe(false);
      if (blow.wave.kind === 'bursts') expect(fxMeta(blow.wave.fx)?.loop, blow.wave.fx).toBe(false);
      else {
        expect(fxMeta(blow.wave.fx)?.loop, blow.wave.fx).toBe(true);
        expect(fxMeta(blow.wave.trail)?.loop, blow.wave.trail).toBe(false);
      }
      expect(blow.speed).toBeGreaterThan(0);
    }
  });

  it('the warning grows from the foe back through the party and covers all of it well before the blow', () => {
    expect(warnTiles(88, 22, 0)).toBe(1);
    expect(warnTiles(88, 22, 0.3)).toBe(2);
    expect(warnTiles(88, 22, 0.6)).toBe(4);
    expect(warnTiles(88, 22, 1)).toBe(4);
    expect(warnTiles(0, 22, 1)).toBe(1); // a solo hero: one tile under him
    let last = 0;
    for (let p = 0; p <= 1.001; p += 0.05) {
      const n = warnTiles(120, 22, p);
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(WARN_HOT_FROM).toBeGreaterThan(0.5);
    expect(WARN_HOT_FROM).toBeLessThan(1);
  });

  it('the wave reaches the heroes behind later than the front one, within a readable beat', () => {
    for (const blow of Object.values(AREA_BLOWS)) {
      expect(waveReachMs(blow, 0)).toBe(0);
      expect(waveReachMs(blow, -5)).toBe(0);
      expect(waveReachMs(blow, 40)).toBeGreaterThan(waveReachMs(blow, 20));
      // A full party is about 50 px deep: the last hero is reached in well under half a second.
      expect(waveReachMs(blow, 50)).toBeLessThan(450);
    }
  });

  it('bursts go off at even steps from the start of the stretch to its end', () => {
    expect(burstOffsets(0, 17)).toEqual([0]);
    expect(burstOffsets(40, 17)).toEqual([0, 17, 34]);
    expect(burstOffsets(-10, 17)).toEqual([0]);
  });
});

describe("the world bosses' kit", () => {
  it('Frenzy burns along the boss\'s feet and Mortal Wound stays open on the hero: both through the looks table', () => {
    for (const key of ['buff_boss_frenzy', 'debuff_mortal_wound']) {
      expect(EFFECT_LOOKS[key], key).toBeDefined();
      expect(hasOwnLook(key)).toBe(true);
      expect(categorize({ defKey: key, sourceId: 'x', remainingMs: 1, stacks: 1, value: 1 })).toBeNull();
    }
    const boss = wornLooks([{ defKey: 'buff_boss_frenzy', sourceId: 'boss', remainingMs: 3000, totalMs: 6000 }], { id: 'boss' });
    expect(boss.slots.get('feet')?.look.tile).toBe(true); // it repeats along a boss a hundred pixels wide
    const tank = wornLooks([{ defKey: 'debuff_mortal_wound', sourceId: 'boss', remainingMs: 3000, totalMs: 8000 }], { id: 'h1', classKey: 'knight' });
    expect(tank.slots.get('mark')?.look.fx).toBe('mortal_wound');
  });
});

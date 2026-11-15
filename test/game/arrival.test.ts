import { describe, expect, it } from 'vitest';
import { ARRIVAL_FX_KEYS, DEPART_FX, arrivalBody, arrivalFx, arrivalMs, departBody, type ArrivalIdea } from '@/game/render/arrival';
import { fxMeta, fxTotalMs } from '@/game/render/fxData';
import { CLASS_KEYS } from '@/data/classes';

const IDEAS: ArrivalIdea[] = ['A', 'B'];

describe('a hero arriving', () => {
  it('names only effects the atlas has, one-shots all of them', () => {
    for (const key of [...ARRIVAL_FX_KEYS, ...DEPART_FX.under, ...DEPART_FX.over]) {
      const meta = fxMeta(key);
      expect(meta, key).toBeDefined();
      expect(meta?.loop, key).toBe(false);
    }
  });

  it('has effects for every class in both ideas', () => {
    for (const idea of IDEAS) {
      for (const classKey of CLASS_KEYS) {
        const fx = arrivalFx(idea, classKey);
        expect(fx.under.length + fx.over.length).toBeGreaterThan(0);
        for (const key of [...fx.under, ...fx.over]) expect(fxMeta(key), `${idea} ${classKey} ${key}`).toBeDefined();
      }
    }
    // Idea B's sigil is the class's own.
    expect(new Set(CLASS_KEYS.map((c) => arrivalFx('B', c).under[0])).size).toBe(CLASS_KEYS.length);
  });

  it('lasts as long as its effects play', () => {
    for (const idea of IDEAS) {
      const fx = arrivalFx(idea, 'knight');
      for (const key of [...fx.under, ...fx.over]) {
        const meta = fxMeta(key);
        if (meta !== undefined) expect(fxTotalMs(meta), `${idea} ${key}`).toBe(arrivalMs(idea));
      }
    }
  });

  it('is not drawn while it waits for its turn, shows up white, cools, and ends as itself with its HUD', () => {
    for (const idea of IDEAS) {
      expect(arrivalBody(idea, -200)).toEqual({ alpha: 0, white: 0, hud: false, done: false });
      expect(arrivalBody(idea, 0).alpha).toBe(0);
      let sawWhite = false;
      let hudAt = -1;
      let lastWhite = 2;
      for (let ms = 0; ms < arrivalMs(idea); ms += 20) {
        const look = arrivalBody(idea, ms);
        if (look.alpha > 0 && look.white > 0.5) sawWhite = true;
        if (sawWhite && look.alpha >= 1) {
          expect(look.white, `${idea} ${ms}`).toBeLessThanOrEqual(lastWhite + 1e-9); // it only cools
          lastWhite = look.white;
        }
        if (look.hud && hudAt < 0) hudAt = ms;
      }
      expect(sawWhite, idea).toBe(true);
      expect(hudAt, idea).toBeGreaterThan(arrivalMs(idea) / 2); // the bars wait for the hero to be there
      expect(arrivalBody(idea, arrivalMs(idea))).toEqual({ alpha: 1, white: 0, hud: true, done: true });
    }
  });

  it('idea A shows the hero the instant the shaft touches down (its third frame)', () => {
    const meta = fxMeta('arrive_a_back');
    const touch = (meta?.ms[0] ?? 0) + (meta?.ms[1] ?? 0);
    expect(arrivalBody('A', touch - 1).alpha).toBe(0);
    expect(arrivalBody('A', touch)).toMatchObject({ alpha: 1, white: 1 });
  });
});

describe('a hero leaving for another world', () => {
  it('goes white, is gone when the shaft hits, and stays gone', () => {
    expect(departBody(0)).toMatchObject({ alpha: 1, white: 0, hud: false });
    expect(departBody(60).white).toBeGreaterThan(0.5);
    expect(departBody(200)).toMatchObject({ alpha: 0, done: false });
    expect(departBody(5000)).toMatchObject({ alpha: 0, done: true });
  });
});

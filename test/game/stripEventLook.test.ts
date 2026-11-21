import { describe, expect, it } from 'vitest';
import { merchantPlace, merchantStanding, runawayPlace } from '@/game/render/stripEventLook';
import { MERCHANT_WALK_MS, RUNAWAY_PATH } from '@/game/render/stripEventTiming';
import { eventMeta, EVENT_FIGURES } from '@/game/render/eventData';
import { STRIP_EVENT_KINDS, MERCHANT, RUNAWAY } from '@/data/stripEvents';

// Where the strip events stand and what they play (render/stripEventLook), and that every event has its figure.

describe('strip event look', () => {
  it('the runaway chest comes in past the right edge and runs to and fro, hopping, then springs away near the left', () => {
    const W = 600;
    const start = runawayPlace(0, RUNAWAY.ms, W);
    expect(start.x).toBeGreaterThan(W);
    expect(start.facing).toBe(-1);
    // Its crossings: sampled finely, it changes way RUNAWAY_PATH.passes − 1 times, and stays on the strip.
    let turns = 0;
    let way = 0;
    let hops = 0;
    for (let ms = 0; ms < RUNAWAY.ms - RUNAWAY.escapeMs; ms += 50) {
      const at = runawayPlace(ms, RUNAWAY.ms, W);
      const next = runawayPlace(ms + 50, RUNAWAY.ms, W);
      const d = Math.sign(next.x - at.x);
      if (d !== 0 && way !== 0 && d !== way) turns += 1;
      if (d !== 0) way = d;
      if ((at.lift ?? 0) > 0 && (runawayPlace(ms - 50, RUNAWAY.ms, W).lift ?? 0) === 0) hops += 1;
      if (ms > 15_000) expect(at.x).toBeLessThanOrEqual(W); // in sight once it has come in
      expect(at.clip).toBe('run');
    }
    expect(turns).toBe(RUNAWAY_PATH.passes - 1);
    expect(hops).toBeGreaterThan(20); // it hops all the way
    // Nobody caught it: near the left edge it stops, taunts and springs away, fading out.
    const end = runawayPlace(RUNAWAY.ms, RUNAWAY.ms, W);
    expect(end.clip).toBe('escape');
    expect(end.alpha ?? 1).toBeCloseTo(0);
    const taunt = runawayPlace(RUNAWAY.ms - RUNAWAY.escapeMs + 100, RUNAWAY.ms, W);
    expect(taunt).toMatchObject({ clip: 'escape', alpha: 1 });
    expect(taunt.x).toBe(end.x);
  });

  it('a chest sent away springs off from where it was', () => {
    const W = 600;
    const there = runawayPlace(30_000, RUNAWAY.ms, W);
    const leaving = runawayPlace(30_500, RUNAWAY.ms, W, 30_000);
    expect(leaving.clip).toBe('escape');
    expect(leaving.x).toBe(there.x);
    expect(runawayPlace(30_000 + RUNAWAY.escapeMs, RUNAWAY.ms, W, 30_000).alpha ?? 1).toBeCloseTo(0);
  });

  it('a merchant sent away walks out from his place at once', () => {
    const stand = 120;
    expect(merchantStanding(20_000, MERCHANT.ms, 20_000)).toBe(false);
    const out = merchantPlace(20_000 + MERCHANT_WALK_MS / 2, MERCHANT.ms, stand, 20_000);
    expect(out).toMatchObject({ clip: 'walk', facing: -1 });
    expect(out.x).toBeLessThan(stand);
    expect(merchantPlace(20_000 + MERCHANT_WALK_MS, MERCHANT.ms, stand, 20_000).x).toBeLessThan(0);
  });

  it('the merchant walks in from the left, stands, and walks back out at the end of his stay', () => {
    const stand = 120;
    expect(merchantPlace(0, MERCHANT.ms, stand).x).toBeLessThan(0);
    expect(merchantPlace(MERCHANT_WALK_MS / 2, MERCHANT.ms, stand)).toMatchObject({ clip: 'walk', facing: 1 });
    expect(merchantPlace(MERCHANT.ms / 2, MERCHANT.ms, stand)).toEqual({ x: stand, clip: 'idle', facing: 1 });
    expect(merchantPlace(MERCHANT.ms - 10, MERCHANT.ms, stand)).toMatchObject({ clip: 'walk', facing: -1 });
    expect(merchantPlace(MERCHANT.ms, MERCHANT.ms, stand).x).toBeLessThan(0);
    expect(merchantStanding(MERCHANT.ms / 2, MERCHANT.ms)).toBe(true);
    expect(merchantStanding(100, MERCHANT.ms)).toBe(false);
  });

  it('every event has a figure with the clips the strip plays', () => {
    expect([...EVENT_FIGURES].sort()).toEqual([...STRIP_EVENT_KINDS].sort());
    const runaway = eventMeta('runaway');
    const merchant = eventMeta('merchant');
    for (const clip of ['run', 'caught', 'escape']) expect(runaway?.anims[clip]).toBeDefined();
    for (const clip of ['walk', 'idle', 'wave', 'thanks']) expect(merchant?.anims[clip]).toBeDefined();
    expect(runaway?.anims.run?.loop).toBe(true);
    expect(runaway?.anims.caught?.loop).toBe(false);
  });
});

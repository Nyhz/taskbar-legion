import { describe, expect, it } from 'vitest';
import { merchantPlace, merchantStanding, runawayPlace } from '@/game/render/stripEventLook';
import { MERCHANT_WALK_MS } from '@/game/render/stripEventTiming';
import { eventMeta, EVENT_FIGURES } from '@/game/render/eventData';
import { STRIP_EVENT_KINDS, MERCHANT, RUNAWAY } from '@/data/stripEvents';

// Where the strip events stand and what they play (render/stripEventLook), and that every event has its figure.

describe('strip event look', () => {
  it('the runaway chest crosses from past the right edge, facing left, and springs away near the left one', () => {
    const start = runawayPlace(0, RUNAWAY.ms, 600);
    const mid = runawayPlace(RUNAWAY.ms / 2, RUNAWAY.ms, 600);
    const end = runawayPlace(RUNAWAY.ms, RUNAWAY.ms, 600);
    expect(start.x).toBeGreaterThan(600);
    expect(mid.x).toBeLessThan(start.x);
    expect(mid.facing).toBe(-1);
    expect(mid.clip).toBe('run');
    // Nobody caught it: near the left edge it stops, taunts and springs away, fading out.
    expect(end.clip).toBe('escape');
    expect(end.alpha ?? 1).toBeCloseTo(0);
    const taunt = runawayPlace(RUNAWAY.ms * 0.92, RUNAWAY.ms, 600);
    expect(taunt).toMatchObject({ clip: 'escape', alpha: 1 });
    expect(taunt.x).toBe(end.x);
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

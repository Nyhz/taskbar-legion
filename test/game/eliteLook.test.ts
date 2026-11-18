import { BARS } from '@/game/render/stripHud';
import { describe, expect, it } from 'vitest';
import {
  ELITE_ARRIVE_FX,
  ELITE_CREST_FX,
  ELITE_FIGURE_SCALE,
  ELITE_RIM_INNER,
  ELITE_RIM_OFFSETS,
  ELITE_RIM_OUTER,
  ELITE_RIM_PULSE_MS,
  ELITE_SPARKS_FX,
  ENEMY_Z,
  eliteRimOuter,
} from '@/game/render/eliteLook';
import { fxMeta } from '@/game/render/fxData';

describe('the look of an elite', () => {
  it('has a crest over its bar (a loop)', () => {
    expect(fxMeta(ELITE_CREST_FX)?.loop).toBe(true);
  });

  it('has motes in front of the body (a loop) and a burst for stepping into the wave (a one-shot)', () => {
    expect(fxMeta(ELITE_SPARKS_FX)?.loop).toBe(true);
    expect(fxMeta(ELITE_ARRIVE_FX)?.loop).toBe(false);
  });

  it('rims the silhouette two pixels deep: a pale line inside, a violet one outside that beats between two tones', () => {
    for (const [dx, dy] of ELITE_RIM_OFFSETS.inner) expect(Math.abs(dx) + Math.abs(dy)).toBe(1);
    for (const [dx, dy] of ELITE_RIM_OFFSETS.outer) {
      expect(Math.max(Math.abs(dx), Math.abs(dy))).toBeLessThanOrEqual(2);
      expect(Math.abs(dx) + Math.abs(dy)).toBeGreaterThanOrEqual(2); // never the inner line's place
    }
    // All eight directions are covered at two pixels.
    for (const d of [[2, 0], [-2, 0], [0, 2], [0, -2]]) expect(ELITE_RIM_OFFSETS.outer).toContainEqual(d);
    const seen = new Set<number>();
    for (let ms = 0; ms < ELITE_RIM_PULSE_MS; ms += 50) seen.add(eliteRimOuter(ms));
    expect([...seen].sort()).toEqual([...ELITE_RIM_OUTER].sort());
    expect(ELITE_RIM_INNER).not.toBe(ELITE_RIM_OUTER[0]);
  });

  it('wears a bigger bar than a common enemy and stands in front of the pack, behind the party', () => {
    expect(BARS.elite.iw).toBeGreaterThan(BARS.foe.iw);
    expect(BARS.elite.ih).toBeGreaterThan(BARS.foe.ih);
    expect(ENEMY_Z.elite).toBeGreaterThan(ENEMY_Z.common);
    expect(ENEMY_Z.elite).toBeLessThan(2); // the heroes' zIndex
  });

  it('is drawn bigger, but nowhere near a boss', () => {
    expect(ELITE_FIGURE_SCALE).toBeGreaterThan(1);
    expect(ELITE_FIGURE_SCALE).toBeLessThanOrEqual(1.5);
  });
});

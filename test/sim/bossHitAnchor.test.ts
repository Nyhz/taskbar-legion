import { describe, it, expect } from 'vitest';
import {
  BOSS_THREAT_PCT, STAGE_BOSS_THREAT_SHARE, ZONE_BOSS_HIT_TUNE, STAGE_BOSS_HIT_TUNE, ZONE_BOSS_DMG_MULT, BOSS_DMG_MULT,
  enemyDamage, zoneBossHit, stageBossHit,
} from '@/data/stageScaling';
import { globalStageOf } from '@/data/difficulties';

// Round 6 (2026-11-16): what a boss deals the FRONT hero is a fixed table, one entry per world, anchored to the probe's
// average Knight (scripts/boss-hit-tune.ts): the world boss takes BOSS_THREAT_PCT % of his life a second after his
// armour and magic resist, a stage boss STAGE_BOSS_THREAT_SHARE of that. World 1 keeps the formula (the bootstrap).

const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

describe('the boss-hit anchor', () => {
  it('has one entry per world for the world boss and the stage bosses, all positive', () => {
    expect(ZONE_BOSS_HIT_TUNE).toHaveLength(50);
    expect(STAGE_BOSS_HIT_TUNE).toHaveLength(50);
    for (const v of [...ZONE_BOSS_HIT_TUNE, ...STAGE_BOSS_HIT_TUNE]) expect(v).toBeGreaterThan(0);
  });

  it('presses harder with every difficulty, and a stage boss less than its world boss', () => {
    for (let i = 1; i < BOSS_THREAT_PCT.length; i++) expect(BOSS_THREAT_PCT[i]).toBeGreaterThan(BOSS_THREAT_PCT[i - 1] ?? 0);
    expect(STAGE_BOSS_THREAT_SHARE).toBeGreaterThan(0);
    expect(STAGE_BOSS_THREAT_SHARE).toBeLessThan(1);
    // The tank's life grows across the game, so the hit that takes the same share of it grows too: each difficulty's
    // walls hit harder than the one before (median of its worlds), and its last wall harder than its first.
    for (let d = 1; d < 5; d++) {
      const own = ZONE_BOSS_HIT_TUNE.slice(d * 10, d * 10 + 10);
      const prev = ZONE_BOSS_HIT_TUNE.slice((d - 1) * 10, d * 10);
      expect(median(own), `difficulty ${d}`).toBeGreaterThan(median(prev));
      expect(own[9] ?? 0).toBeGreaterThan(own[0] ?? 0);
    }
    for (let w = 2; w <= 50; w++) expect(STAGE_BOSS_HIT_TUNE[w - 1] ?? 0, `world ${w}`).toBeLessThan(ZONE_BOSS_HIT_TUNE[w - 1] ?? 0);
  });

  it('is what a boss hits the front hero for from world 2; world 1 keeps the formula', () => {
    expect(zoneBossHit(globalStageOf(1, 4, 10))).toBe(ZONE_BOSS_HIT_TUNE[13]);
    expect(stageBossHit(globalStageOf(3, 7, 5))).toBe(STAGE_BOSS_HIT_TUNE[36]);
    expect(zoneBossHit(10)).toBeCloseTo(enemyDamage(10) * ZONE_BOSS_DMG_MULT, 9);
    expect(stageBossHit(5)).toBeCloseTo(enemyDamage(5) * BOSS_DMG_MULT, 9);
  });
});

import { describe, it, expect } from 'vitest';
import {
  g,
  phi,
  enemyHp,
  enemyDamage,
  goldPerKill,
  xpPerKill,
  expectedLevel,
  totalExpToReach,
} from '@/data/stageScaling';

describe('stage scaling (PROGRESSION canonical)', () => {
  it('g(S) is strictly increasing → accelerating difficulty', () => {
    for (let S = 1; S < 500; S++) expect(g(S + 1)).toBeGreaterThan(g(S));
    expect(g(50)).toBeGreaterThan(g(1));
  });

  it('Φ(S) is strictly increasing (monotonic)', () => {
    for (let S = 1; S < 500; S++) expect(phi(S + 1)).toBeGreaterThan(phi(S));
  });

  it('enemy stats, income, and expected level are monotonic in S', () => {
    for (let S = 1; S < 400; S++) {
      expect(enemyHp(S + 1)).toBeGreaterThan(enemyHp(S));
      expect(enemyDamage(S + 1)).toBeGreaterThan(enemyDamage(S));
      expect(goldPerKill(S + 1)).toBeGreaterThanOrEqual(goldPerKill(S));
      expect(xpPerKill(S + 1)).toBeGreaterThanOrEqual(xpPerKill(S));
      expect(expectedLevel(S + 1)).toBeGreaterThanOrEqual(expectedLevel(S));
    }
  });

  it('matches §12 worked-example numbers (within tolerance)', () => {
    expect(phi(10)).toBeCloseTo(3.27, 1);
    expect(enemyHp(10)).toBeCloseTo(131, 0);
    expect(enemyHp(50)).toBeCloseTo(33000, -3); // ~33K
    expect(phi(100)).toBeCloseTo(2.88e6, -5);
    // expectedLevel: 1:1 through world 1, then sub-linear (level lags stage).
    expect(expectedLevel(10)).toBe(10);
    expect(expectedLevel(1)).toBe(1);
    expect(expectedLevel(20)).toBeGreaterThan(10); // still climbing
    expect(expectedLevel(20)).toBeLessThan(20); // but lagging the raw stage now
    expect(goldPerKill(10)).toBe(8); // base 3 (tight gold, PROGRESSION §8): round(3·Φ(10)^0.85)
    expect(g(1)).toBeCloseTo(1.121, 2);
    expect(g(50)).toBeCloseTo(1.163, 2);
  });

  it('XP curve: cheap early, steep tail, hard-capped at L120', () => {
    // Re-paced curve: 0.5·L^3.5 + 4.4^(L-39). Cheap polynomial early so a fresh party
    // levels into its kit fast; steep tail (the 4.4^L term) turns the climb to the cap
    // into the months-long grind that tracks the deep, wall-gated worlds.
    expect(totalExpToReach(10)).toBeGreaterThan(1_000); // cheap early (~1.6K)
    expect(totalExpToReach(10)).toBeLessThan(3_000);
    expect(totalExpToReach(36)).toBeGreaterThan(100_000); // tail still negligible (~140K)
    expect(totalExpToReach(36)).toBeLessThan(200_000);
    expect(totalExpToReach(60)).toBeGreaterThan(1e13); // tail dominating (~3.3e13)
    // every level costs strictly more than the last, and the hard cap holds past L120.
    expect(totalExpToReach(120)).toBeGreaterThan(totalExpToReach(119));
    expect(totalExpToReach(121)).toBe(totalExpToReach(120)); // capped at MAX_LEVEL
  });
});

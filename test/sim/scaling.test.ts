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
import { MAX_GLOBAL_STAGE } from '@/data/difficulties';

// FINITE model (DIFFICULTY.md): Φ is a BOUNDED polynomial over G∈[1..500]. Difficulty
// "accelerates" in ABSOLUTE per-stage increments (the curve is convex), while the per-stage
// RATIO g(S) gently DECREASES toward 1 (the bounded-polynomial signature — NOT the old
// exponential's increasing ratio). The real time-gate is the gear treadmill + the X-10
// world-boss walls, not a runaway ratio.

describe('finite stage scaling', () => {
  it('Φ(S) is strictly increasing and BOUNDED across the 500-stage game', () => {
    for (let S = 1; S < MAX_GLOBAL_STAGE; S++) expect(phi(S + 1)).toBeGreaterThan(phi(S));
    expect(phi(MAX_GLOBAL_STAGE)).toBeLessThan(20); // polynomial — stays readable, never e42
  });

  it('difficulty accelerates in absolute increments (convex); ratio gently eases', () => {
    // ABSOLUTE per-stage HP jump grows with depth (50→51 is a bigger raw jump than 1→2)…
    expect(enemyHp(51) - enemyHp(50)).toBeGreaterThan(enemyHp(2) - enemyHp(1));
    // …while the RATIO decreases toward 1 (the polynomial, not the old exponential).
    expect(g(400)).toBeLessThan(g(50));
    expect(g(50)).toBeGreaterThan(1);
  });

  it('enemy stats, income, and expected level are monotonic in S', () => {
    for (let S = 1; S < MAX_GLOBAL_STAGE; S++) {
      expect(enemyHp(S + 1)).toBeGreaterThan(enemyHp(S));
      expect(enemyDamage(S + 1)).toBeGreaterThan(enemyDamage(S));
      expect(goldPerKill(S + 1)).toBeGreaterThanOrEqual(goldPerKill(S));
      expect(xpPerKill(S + 1)).toBeGreaterThanOrEqual(xpPerKill(S));
      expect(expectedLevel(S + 1)).toBeGreaterThanOrEqual(expectedLevel(S));
    }
  });

  it('expectedLevel maps the 500 stages to ~L1..L115 (the spine bands)', () => {
    expect(expectedLevel(1)).toBe(1);
    expect(expectedLevel(100)).toBeGreaterThan(28); // ~Normal complete
    expect(expectedLevel(100)).toBeLessThan(48);
    expect(expectedLevel(300)).toBeGreaterThan(70); // ~Inferno complete
    expect(expectedLevel(500)).toBeGreaterThanOrEqual(110); // ~Torment 10-10
    expect(expectedLevel(500)).toBeLessThanOrEqual(120);
  });

  it('XP curve: smooth polynomial, no exponential brick, hard-capped at L120', () => {
    expect(totalExpToReach(10)).toBeGreaterThan(1_000); // cheap early
    expect(totalExpToReach(10)).toBeLessThan(5_000);
    expect(totalExpToReach(30)).toBeGreaterThan(50_000); // ult-unlock band is reachable
    // L115 is a large but FINITE target (the long deep farm), not an exponential wall.
    expect(totalExpToReach(115)).toBeGreaterThan(1e7);
    expect(totalExpToReach(115)).toBeLessThan(1e8);
    // strictly increasing, hard-capped at MAX_LEVEL.
    expect(totalExpToReach(120)).toBeGreaterThan(totalExpToReach(119));
    expect(totalExpToReach(121)).toBe(totalExpToReach(120));
  });
});

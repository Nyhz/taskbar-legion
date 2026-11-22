import { describe, it, expect } from 'vitest';
import { phi, goldPerKill, xpPerKill, expectedLevel, totalExpToReach } from '@/data/stageScaling';
import { enemyDamage, enemyHp } from '@/sim/enemyScale';
import { MAX_GLOBAL_STAGE } from '@/data/difficulties';

// Φ (the economy's curve: gold and XP a kill) is a BOUNDED polynomial over G∈[1..500]; the POWER curve (items,
// heroes, enemies) is data/power P(S) — test/sim/powerCurve.test.ts.

describe('finite stage scaling', () => {
  it('Φ(S) is strictly increasing and BOUNDED across the 500-stage game', () => {
    for (let S = 1; S < MAX_GLOBAL_STAGE; S++) expect(phi(S + 1)).toBeGreaterThan(phi(S));
    expect(phi(MAX_GLOBAL_STAGE)).toBeLessThan(20); // polynomial — stays readable, never e42
  });

  it('enemy stats, income, and expected level are monotonic in S', () => {
    for (let S = 1; S < MAX_GLOBAL_STAGE; S++) {
      // (From 1-5: in 1-2 … 1-4 the typical party wears only a weapon, and a first uncommon one splits its budget.)
      if (S >= 5) expect(enemyHp(S + 1)).toBeGreaterThan(enemyHp(S));
      // An enemy's plain hit is sized to the typical back line's effective life: it may ease a little while world 1
      // fills the typical gear in (its defence comes before its life), never more.
      expect(enemyDamage(S + 1)).toBeGreaterThan(enemyDamage(S) * 0.85);
      expect(goldPerKill(S + 1)).toBeGreaterThanOrEqual(goldPerKill(S));
      expect(xpPerKill(S + 1)).toBeGreaterThanOrEqual(xpPerKill(S));
      expect(expectedLevel(S + 1)).toBeGreaterThanOrEqual(expectedLevel(S));
    }
  });

  it('an enemy\'s plain hit grows world after world', () => {
    for (let w = 2; w < 50; w++) expect(enemyDamage(w * 10 + 5)).toBeGreaterThan(enemyDamage(w * 10 - 5)); // world 1 fills its gear in
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

// The 2026-11-15 retune (DIFFICULTY.md §8): the 3-month game.
describe('the retuned curves', () => {
  it('levels last the whole game: the middle costs several times the old curve, the cap is for the end', () => {
    const old = (L: number): number => 0.7 * Math.pow(L, 3.5);
    expect(totalExpToReach(1)).toBe(0);
    expect(totalExpToReach(12) / old(12)).toBeLessThan(1.5); // the opening is as cheap as it was
    expect(totalExpToReach(50) / old(50)).toBeGreaterThan(2.5);
    expect(totalExpToReach(88) / old(88)).toBeGreaterThan(3.5);
    expect(totalExpToReach(120)).toBeGreaterThan(5e7); // the cap is for the very end of the game
    for (let L = 1; L < 120; L++) expect(totalExpToReach(L + 1)).toBeGreaterThan(totalExpToReach(L));
  });
});

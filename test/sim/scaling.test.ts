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
  zoneBossHp,
  WORLD_WALL_MULT,
  earlyDmgRamp,
  EARLY_DMG_RAMP_END,
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
    // ABSOLUTE HP jumps grow with depth (a world deep in the game steps up by far more than an early one)…
    expect(enemyHp(451) - enemyHp(441)).toBeGreaterThan(enemyHp(31) - enemyHp(21));
    // …while the RATIO decreases toward 1 (the polynomial, not the old exponential).
    expect(g(400)).toBeLessThan(g(50));
    expect(g(50)).toBeGreaterThan(1);
  });

  it('enemy stats, income, and expected level are monotonic in S', () => {
    for (let S = 1; S < MAX_GLOBAL_STAGE; S++) {
      expect(enemyHp(S + 1)).toBeGreaterThanOrEqual(enemyHp(S)); // flat inside a world, a step at each new one (the anchor tables)
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

// The 2026-11-15 retune (DIFFICULTY.md §8): the 3-month game.
describe('the retuned curves', () => {
  it('every world-boss wall is tougher than the one before inside its difficulty, and a difficulty opens near the last', () => {
    // The ladder (rounds 4c–4e, 2026-11-16): a difficulty's world 1 asks the same share of nearly the same ceiling as
    // the previous world 10 (it starts where the last one ended), so measured asks may open it a little below it.
    for (let w = 2; w <= 50; w++) {
      if (w % 10 === 1) expect(zoneBossHp(w * 10) / zoneBossHp((w - 1) * 10), `world ${w}`).toBeGreaterThan(0.85);
      else expect(zoneBossHp(w * 10), `world ${w}`).toBeGreaterThan(zoneBossHp((w - 1) * 10));
    }
    expect(WORLD_WALL_MULT).toHaveLength(50);
  });

  it('the opening is gentle: enemy damage starts low and is whole only several worlds in', () => {
    expect(earlyDmgRamp(1)).toBeLessThan(0.4);
    expect(earlyDmgRamp(10)).toBeLessThan(0.5);
    expect(earlyDmgRamp(EARLY_DMG_RAMP_END)).toBe(1);
    expect(EARLY_DMG_RAMP_END).toBeGreaterThanOrEqual(40);
  });

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

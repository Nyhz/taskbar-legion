import { describe, it, expect } from 'vitest';
import { GreedyRunner, TICK_MS } from './harness';

// A lightweight smoke gate that proves the sim runs fully headless over many
// stages with sane curves (no NaN/zero/runaway). The full report (curves +
// frozen B + drop counts) lives in scripts/sim-smoke.ts.

describe('smoke', () => {
  it('runs many stages headless with sane curves', () => {
    const r = new GreedyRunner({ seed: 1, openChests: true });
    r.run(900_000, 140);
    // Level-gated progression, now with deliberately TIGHT/SLOW pacing (xp/gold income
    // bases cut — PROGRESSION §8): ~900k ticks (~25h sim) reaches the high-20s on this
    // seed. The floor proves the sim runs many stages headless without stalling or
    // producing NaN/zero curves (budget re-anchored from 400k for the slower curve).
    expect(r.stage).toBeGreaterThanOrEqual(25);
    expect(r.partySize).toBeGreaterThanOrEqual(1);
    expect(r.goldTotal).toBeGreaterThan(0);
    expect(Number.isFinite(r.goldTotal)).toBe(true);
    for (const lvl of r.heroLevels) expect(lvl).toBeGreaterThan(1);

    const norm = r.clears.filter((c) => c.stage % 10 !== 9 && c.stage % 10 !== 0);
    expect(norm.length).toBeGreaterThan(40);
    for (const c of norm) {
      const s = (c.ticks * TICK_MS) / 1000;
      expect(s).toBeGreaterThan(0);
      expect(Number.isFinite(s)).toBe(true);
    }
  });
});

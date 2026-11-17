// What the ON-GEAR PARTY did at every tuning point when the anchor tables were last tuned — the probe's average
// player (median of the tuner's seeds), written by `scripts/tune-pacing.ts`. test/sim/anchors.test.ts holds the
// enemy tables of data/stageScaling.ts against it, so a change to the tables (or to what an enemy's life is made
// of) that takes a grunt out of its 2–3 hits or a stage boss out of its 5–10 seconds fails a test. When HERO
// power changes (classes, gear, levels), re-run the tuner: it rewrites the tables and this reference together.
// A point is a stage of world 1 (points 0–8), or a world from the second on (10–58); point 9 is 1-10, the world
// boss's stage, which has no trash and no stage boss of its own.
// Round 12 (2026-11-17): rescaled with the anchor tables for the swing-timer fix and the cadence curve — the top hit
// × the hardest hitter's per-hit multiplier, the boss DPS × the party's gain from the fixed timer (scratchpad r12).

/** The stage each tuning point is measured at: 1-1 … 1-9 one by one, then every world's X-5. */
export function anchorStage(point: number): number {
  return point <= 9 ? point + 1 : (point - 9) * 10 + 5;
}

/** Mean damage of one BASIC attack of the party's hardest hitter. */
export const REFERENCE_TOP_HIT: readonly number[] = [
  12.6, 21.9, 24.3, 28, 29.6, 33.8, 36.8, 40.2, 38.6, 38.6,
  42.6, 51.6, 165, 206, 301, 317, 334, 349, 345, 399,
  666, 948, 1470, 1680, 1930, 2460, 2510, 2870, 3170, 3490,
  4410, 4600, 4950, 5660, 6610, 8010, 9040, 9650, 11700, 14200,
  15800, 19900, 22700, 26300, 30600, 35700, 46400, 48900, 57400, 74500,
  77200, 90900, 122000, 159000, 219000, 265000, 295000, 307000, 365000,
];

/** Damage per second the party put into the stage boss. */
export const REFERENCE_BOSS_DPS: readonly number[] = [
  12.7, 21.7, 23.7, 28.4, 71.7, 83, 92.8, 124, 135, 135,
  152, 189, 506, 702, 890, 994, 1030, 1040, 1160, 1330,
  2300, 4490, 5990, 7510, 8310, 8890, 9080, 10500, 13200, 14300,
  15500, 17300, 20900, 21300, 32000, 33300, 41200, 49000, 58600, 65900,
  72400, 94400, 112000, 145000, 150000, 181000, 238000, 274000, 285000, 430000,
  433000, 420000, 470000, 648000, 739000, 575000, 597000, 703000, 799000,
];

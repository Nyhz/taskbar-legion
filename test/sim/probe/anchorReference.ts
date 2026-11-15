// What the ON-GEAR PARTY did at every tuning point when the anchor tables were last tuned — the probe's average
// player (median of the tuner's seeds), written by `scripts/tune-pacing.ts`. test/sim/anchors.test.ts holds the
// enemy tables of data/stageScaling.ts against it, so a change to the tables (or to what an enemy's life is made
// of) that takes a grunt out of its 2–3 hits or a stage boss out of its 5–10 seconds fails a test. When HERO
// power changes (classes, gear, levels), re-run the tuner: it rewrites the tables and this reference together.
// A point is a stage of world 1 (points 0–8), or a world from the second on (10–58); point 9 is 1-10, the world
// boss's stage, which has no trash and no stage boss of its own.

/** The stage each tuning point is measured at: 1-1 … 1-9 one by one, then every world's X-5. */
export function anchorStage(point: number): number {
  return point <= 9 ? point + 1 : (point - 9) * 10 + 5;
}

/** Mean damage of one BASIC attack of the party's hardest hitter. */
export const REFERENCE_TOP_HIT: readonly number[] = [
  12.6, 21.9, 24.3, 28.0, 29.6, 33.8, 36.8, 40.2, 38.6, 38.6,
  42.6, 51.4, 163, 204, 297, 313, 329, 343, 339, 390,
  647, 921, 1430, 1630, 1820, 2320, 2360, 2670, 2920, 3130,
  3920, 4020, 4280, 4830, 5590, 6160, 6950, 7560, 9150, 11100,
  12300, 13700, 15600, 18200, 21300, 24900, 29900, 31100, 35800, 41500,
  43000, 47300, 50000, 59900, 67200, 76300, 85000, 90600, 108000,
];

/** Damage per second the party put into the stage boss. */
export const REFERENCE_BOSS_DPS: readonly number[] = [
  11.9, 20.3, 22.2, 26.6, 67.2, 77.8, 87.0, 116, 127, 127,
  142, 176, 472, 653, 836, 933, 966, 984, 1090, 1250,
  2100, 4090, 5430, 6810, 7650, 8430, 8610, 9820, 12000, 13000,
  13900, 15900, 18200, 19600, 27900, 29000, 35900, 44200, 52800, 59400,
  65100, 84900, 101000, 139000, 143000, 173000, 204000, 230000, 235000, 300000,
  302000, 302000, 338000, 423000, 483000, 553000, 574000, 676000, 780000,
];

// What each wall asks against the fixed reference party (test/sim/probe/referenceAsk), recorded by
// `RL_WRITE=1 npx vite-node scripts/reference-ladder.ts` (round 13). test/sim/ladder.test.ts holds it strictly rising and
// spot-checks it against a fresh measure, so a change to the walls or to hero power that leaves it stale fails a test.
/** % of the reference party's 60 s of damage each wall asks, world 1 … 50. */
export const REFERENCE_ASK: readonly number[] = [
  4.278, 4.316, 4.345, 4.436, 6.423, 6.495, 6.573, 6.626, 7.128, 7.173,
  11.64, 11.75, 11.93, 13.75, 16.6, 17.47, 17.63, 17.81, 18, 18.92,
  32.01, 35.55, 38.69, 42.84, 46.62, 49.6, 51.73, 54.5, 55.07, 67.72,
  96.22, 101.1, 102.3, 105.7, 107.3, 119, 120.1, 121.4, 122.6, 123.8,
  148, 149.4, 150.7, 152.1, 153.7, 155.2, 156.6, 160.9, 162.6, 164.2,
];

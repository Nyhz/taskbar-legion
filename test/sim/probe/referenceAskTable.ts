// What each wall asks against the fixed reference party (test/sim/probe/referenceAsk), recorded by
// `RL_WRITE=1 npx vite-node scripts/reference-ladder.ts` (round 13). test/sim/ladder.test.ts holds it strictly rising and
// spot-checks it against a fresh measure, so a change to the walls or to hero power that leaves it stale fails a test.
/** % of the reference party's 60 s of damage each wall asks, world 1 … 50. */
export const REFERENCE_ASK: readonly number[] = [
  4.273, 4.316, 4.345, 4.436, 6.423, 6.495, 6.573, 6.626, 7.128, 7.172,
  7.243, 7.346, 7.457, 8.371, 10.37, 10.91, 11.02, 11.13, 11.24, 11.73,
  11.91, 12.03, 12.15, 12.27, 12.41, 18.18, 19.24, 20.27, 20.48, 25.14,
  25.4, 25.67, 26.59, 27.87, 28.3, 31.38, 32.41, 34.77, 35.91, 37,
  57.27, 57.84, 66.49, 74.55, 79.19, 82.3, 84.07, 87.36, 88.25, 89.11,
];

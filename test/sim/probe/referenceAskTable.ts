// What each wall asks against the fixed reference party (test/sim/probe/referenceAsk), recorded by
// `RL_WRITE=1 npx vite-node scripts/reference-ladder.ts` (round 13). test/sim/ladder.test.ts holds it strictly rising and
// spot-checks it against a fresh measure, so a change to the walls or to hero power that leaves it stale fails a test.
/** % of the reference party's 60 s of damage each wall asks, world 1 … 50. */
export const REFERENCE_ASK: readonly number[] = [
  4.381, 4.468, 4.492, 4.508, 6.642, 6.682, 6.751, 6.887, 7.321, 7.399,
  11.89, 12.15, 12.4, 13.47, 16.19, 17.73, 17.86, 17.97, 18.26, 19.2,
  35.44, 36.74, 39.07, 43.24, 47.05, 49.45, 52.54, 55.69, 55.88, 58.31,
  96.35, 108.1, 108.4, 110, 113, 121, 122.1, 122.7, 125, 125.8,
  149.4, 150.6, 152.3, 153.8, 154.5, 155.2, 158, 162.8, 164.3, 165,
];

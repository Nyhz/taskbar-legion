// REPORT ONLY since round 22 (2026-11-21: the ladder is now the walls' LIFE, test/sim/ladder.test.ts). What each wall asks against the fixed reference party (test/sim/probe/referenceAsk), recorded by
// `RL_WRITE=1 npx vite-node scripts/reference-ladder.ts` (round 13). No test holds it any more; it is a report.
/** % of the reference party's 60 s of damage each wall asks, world 1 … 50. */
export const REFERENCE_ASK: readonly number[] = [
  4.381, 4.468, 4.489, 4.489, 6.623, 6.822, 6.784, 6.851, 7.3, 7.35,
  11.77, 12.15, 12.41, 13.41, 16.21, 17.51, 17.75, 17.96, 18.13, 19.02,
  23.27, 22.6, 19.57, 22.86, 23.02, 28.71, 34.68, 40.88, 47.68, 56.39,
  74.8, 93.89, 84.73, 100.3, 108.4, 124.8, 133.7, 144.3, 155.8, 173.3,
  194.2, 158.2, 117.6, 102.6, 100.1, 108.8, 115.1, 123, 125.5, 138.5,
];

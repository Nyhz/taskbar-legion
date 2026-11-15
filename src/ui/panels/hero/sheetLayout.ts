import { DEFENSIVE_STATS, OFFENSIVE_STATS, type StatKey } from '@/data/stats';

// The sheet wing's layout — pure, no React. The wing is narrow (six cells), so the stats stand in TWO columns:
// offence on the left, defence on the right, and each of the remaining figures (damage reduction, cooldown
// reduction, heal power) under whichever column is shorter. Under them, the account's seven figures four to a line.

/** The two columns: `offense` and `defense` as given, then every `rest` stat under the shorter one (the left on
 *  a tie), so the columns never differ by more than the difference they started with. */
export function sheetColumns(
  offense: readonly StatKey[],
  defense: readonly StatKey[],
  rest: readonly StatKey[],
): [StatKey[], StatKey[]] {
  const left = [...offense];
  const right = [...defense];
  for (const stat of rest) (right.length < left.length ? right : left).push(stat);
  return [left, right];
}

/** The figures that are neither offence nor defence, placed under the shorter column. */
export const SHEET_REST_STATS: readonly StatKey[] = ['damageReduction', 'cooldownReduction', 'healPower'];

/** The rows of the taller column: every stat is always listed (at 0 when the hero has none), so this is fixed. */
export const SHEET_MAX_STAT_ROWS = Math.max(
  ...sheetColumns(OFFENSIVE_STATS, DEFENSIVE_STATS, SHEET_REST_STATS).map((column) => column.length),
);
/** A stat row (kit `StatRow`). */
export const SHEET_STAT_ROW_ART = 18;

/** The account's figures: a 24 px sign with its value under it, four to a line. */
export const SHEET_ACCOUNT_FIGURES = 7;
export const SHEET_ACCOUNT_COLS = 4;
export const SHEET_ACCOUNT_ROW_ART = 38;
export const SHEET_ACCOUNT_ART_HEIGHT =
  Math.ceil(SHEET_ACCOUNT_FIGURES / SHEET_ACCOUNT_COLS) * SHEET_ACCOUNT_ROW_ART;

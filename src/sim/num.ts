// The numeric seam (PROGRESSION §10). Route Φ-derived unbounded quantities
// (enemyHP/dmg, flat stat values, gold, XP, costs) through these helpers so a
// big-number type (e.g. break_infinity.js) can be dropped in later behind one
// module. v1 uses plain `number` (finite to ~stage 2800); be honest in UI copy.

export const add = (a: number, b: number): number => a + b;
export const mul = (a: number, b: number): number => a * b;
export const pow = (a: number, b: number): number => a ** b;
export const cmp = (a: number, b: number): number => (a < b ? -1 : a > b ? 1 : 0);

/** Round to 2 decimals so stat rolls are stable/deterministic (SPEC §4.6). */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Big-number formatter: 1.24K / 3.4M / 9.1B … then scientific (1.2e45). */
export function format(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (n < 0) return `-${format(-n)}`;
  if (n < 1000) {
    return Number.isInteger(n) ? String(n) : n < 10 ? n.toFixed(1) : String(Math.round(n));
  }
  const tier = Math.floor(Math.log10(n) / 3);
  const suffix = SUFFIXES[tier];
  if (suffix !== undefined) {
    const scaled = n / 1000 ** tier;
    const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    return `${scaled.toFixed(decimals)}${suffix}`;
  }
  return n.toExponential(2).replace('e+', 'e');
}

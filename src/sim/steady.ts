import type { Combatant } from './world';

// STEADY ROLLS (round 7, 2026-11-16; user: «que no todo dependa de la suerte… cambiar triggers para que sean menos
// luck based»). A hero's chances — a blocked blow, a critical hit or heal, a second strike — rolled with dice made the
// same party at the same wall win one fight and lose the next: a wall whose life sat within ±6 % of what the party
// could take in a minute was a coin toss (scripts/luck-diag.ts). They are kept as a running meter instead: each
// chance adds its % to the hero's meter for that roll, and the roll comes up every time the meter passes 100 (then
// 100 is taken off). Over a fight the hero blocks and crits exactly as often as the stat says — evenly, not in
// streaks — and nothing is drawn from the rng. (An enemy's own chances stay dice.)

/** Where a fresh meter starts: half-way, so the first roll comes after about half the usual wait. */
export const STEADY_START = 50;

export type SteadyRoll = 'block' | 'healCrit' | 'crit' | 'multi' | 'backShot';

/** A roll at `pct` % for `c`, kept on its meter `key`: true when the meter passes 100. A chance of 0 or less never
 *  comes up and leaves the meter as it was; 100 or more always does. */
export function steadyRoll(c: Combatant, key: SteadyRoll, pct: number): boolean {
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  const meters = (c.steady ??= {});
  const next = (meters[key] ?? STEADY_START) + pct;
  if (next >= 100) {
    meters[key] = next - 100;
    return true;
  }
  meters[key] = next;
  return false;
}

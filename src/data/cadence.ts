// THE CADENCE CURVE (round 12, 2026-11-17; user: «curva suave»). A hero's attack speed is how much he would swing; the
// curve is how much he does. Up to his class's base speed every point is a swing; past it the swings grow less and
// less toward the class's pace, and what the curve does not give in swings comes back as damage on each hit — the
// damage a second from attack speed is exactly what it was (per-hit multiplier = raw speed / swings). No threshold,
// no cap: each point of speed still adds swings, fewer each time, and the rest as damage.
//
//   swings(raw) = raw                                                  raw ≤ start
//   swings(raw) = start + (pace − start) · (1 − e^(−ease · (raw − start) / (pace − start)))   raw > start
//
// `ease` is the slope just past the start (1 would be the speed itself; 0.7 eases in). The Ranger's numbers are the
// preview the user approved: 1.5/s → 1.5, 3/s → ≈ 2.3, 5/s → ≈ 2.7, 10/s → ≈ 3.0. The Knight and the Priest (the user
// did not say): the same shape from their own base speed toward lower paces, the Ranger clearly the fastest.
// Foes and bosses swing at their raw speed (0.6–1.3 a second, below any curve's start).

export interface CadenceCurve {
  /** Where the curve starts bending: the class's base attack speed. */
  start: number;
  /** What the swings tend to. */
  pace: number;
  /** The slope just past the start (0 < ease ≤ 1). */
  ease: number;
}

export const CADENCE: Readonly<Record<string, CadenceCurve>> = {
  ranger: { start: 1.5, pace: 3.0, ease: 0.7 },
  knight: { start: 1.4, pace: 2.2, ease: 0.7 },
  priest: { start: 1.0, pace: 2.0, ease: 0.7 },
};

/** The swings a second a hero of `classKey` takes at a raw attack speed of `raw` (no curve for an unknown class). */
export function heroSwingsPerSec(classKey: string | undefined, raw: number): number {
  const c = classKey === undefined ? undefined : CADENCE[classKey];
  if (c === undefined || raw <= c.start) return raw;
  const room = c.pace - c.start;
  return c.start + room * (1 - Math.exp((-c.ease * (raw - c.start)) / room));
}

/** What each hit is multiplied by so the damage a second from `raw` speed is unchanged (1 below the curve's start). */
export function cadenceHitMult(classKey: string | undefined, raw: number): number {
  const swings = heroSwingsPerSec(classKey, raw);
  return swings > 0 ? raw / swings : 1;
}

import { MERCHANT, RUNAWAY } from '@/data/stripEvents';

/** How long the wandering merchant takes to walk in from the strip's left edge to his place (and back out). */
export const MERCHANT_WALK_MS = MERCHANT.walkMs;
/** How far behind the party's rearmost hero (screen art px) the merchant stops. */
export const MERCHANT_BEHIND_PARTY = 46;
/** …but never nearer the left edge than this. */
export const MERCHANT_MIN_X = 34;
/** The tap area round a figure, beyond its drawn box (art px): the chest is small and quick. */
export const EVENT_HIT_PAD = { runaway: 7, merchant: 3 } as const;

/** The runaway chest nobody catches: at the end of its stay it stops at `x` (art px from the strip's left edge,
 *  behind the party) and plays its escape over its last RUNAWAY.escapeMs, fading out from `fadeFrom` of it on. */
export const RUNAWAY_ESCAPE = { x: 44, ms: RUNAWAY.escapeMs, fadeFrom: 0.6 } as const;

/** Its runs to and fro (user, 2026-11-21: «que pasara varias veces… que diera algún salto o tuviera algún efecto así
 *  simpático»): it comes in past the right edge and crosses the strip `passes` times — an odd number, so the last
 *  run ends at the left, where it escapes — turning `turnMargin` art px short of the right edge. At each turn it
 *  stops for `turnMs` and gives a double hop of `turnHopPx`; on its runs it hops `hopPx` high for `hopMs` every
 *  `hopEveryMs`. */
export const RUNAWAY_PATH = {
  passes: 5,
  turnMargin: 40,
  turnMs: 700,
  turnHopPx: 7,
  hopEveryMs: 2_100,
  hopMs: 420,
  hopPx: 5,
} as const;

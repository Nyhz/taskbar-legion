/** How long the wandering merchant takes to walk in from the strip's left edge to his place (and back out). */
export const MERCHANT_WALK_MS = 3200;
/** How far behind the party's rearmost hero (screen art px) the merchant stops. */
export const MERCHANT_BEHIND_PARTY = 46;
/** …but never nearer the left edge than this. */
export const MERCHANT_MIN_X = 34;
/** The tap area round a figure, beyond its drawn box (art px): the chest is small and quick. */
export const EVENT_HIT_PAD = { runaway: 7, merchant: 3 } as const;

/** The runaway chest nobody catches: it stops at `x` (art px from the strip's left edge, behind the party) and plays
 *  its escape over the last `share` of its stay (~1.2 s of 12), fading out from `fadeFrom` of the escape on. */
export const RUNAWAY_ESCAPE = { x: 44, share: 0.1, fadeFrom: 0.6 } as const;

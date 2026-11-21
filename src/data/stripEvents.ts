import type { ChestType } from './chests';

// STRIP EVENTS (user, 2026-11-21: «Sí, esto me gusta, profundicemos»): something turns up on the strip now and then
// and is there for a moment; whoever is looking can tap it. They reward attention the way lost chests punish its
// lack. Live play only — never away-time, never the balance probe (the average player it measures does not catch
// them). Deterministic: drawn from the save's seed and the event's number, apart from the combat stream.
// No keys, ever (user: the walls keep their pace).

/** Whether the live game runs the events (on since the strip draws them and the merchant has his window). */
export const STRIP_EVENTS_LIVE = true;

export type StripEventKind = 'runaway' | 'merchant';

export const STRIP_EVENT_KINDS: readonly StripEventKind[] = ['runaway', 'merchant'];

/** Time between two events, in ms of live play: uniform in [MIN, MAX] (user: «cada ~12 min»). */
export const STRIP_EVENT_GAP_MS = { min: 8 * 60_000, max: 16 * 60_000 } as const;

/** The RUNAWAY CHEST: a chest on legs crosses the strip right to left. Tapped, it joins the storage (lost if the
 *  storage of its type is full — the usual rule); missed, it is gone. */
export const RUNAWAY = {
  ms: 12_000, // how long it takes to cross
  /** Which chest it is (weights). */
  chestWeights: { normal: 85, stageBoss: 15, zoneBoss: 0 } satisfies Record<ChestType, number>,
} as const;

/** The WANDERING MERCHANT: a cart stops behind the party for a while and sells a few things for gold — gear rolled
 *  as a stage-boss chest of the stage would roll it, and a gem — each once. A gold sink for the attentive. */
export const MERCHANT = {
  ms: 45_000, // how long the cart stays
  items: 2,
  gems: 1,
  /** Price = this × what the piece melts into at the Cube (sim/cube itemGoldValue). */
  priceMult: 4,
  /** A gem is priced like a gear piece of its tier at the item level of the stage, times this. */
  gemPriceShare: 0.6,
} as const;

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

/** Three events in four are the runaway chest (user, 2026-11-21: «el cofre 3 de cada 4»): in every block of
 *  STRIP_EVENT_BLOCK events exactly MERCHANTS_PER_BLOCK is the merchant, at a place drawn from the save's seed. */
export const STRIP_EVENT_BLOCK = 4;
export const MERCHANTS_PER_BLOCK = 1;

/** Time between two events, in ms of live play: uniform in [MIN, MAX] (user: «cada ~12 min»). */
export const STRIP_EVENT_GAP_MS = { min: 8 * 60_000, max: 16 * 60_000 } as const;

/** The RUNAWAY CHEST: a chest on legs runs to and fro across the strip, hopping as it goes (user, 2026-11-21: «que
 *  pasara varias veces, que se mantuviera en pantalla al menos 1 minuto completo, que diera algún salto»). Tapped, it
 *  joins the storage (lost if the storage of its type is full — the usual rule); missed, it taunts and springs away. */
export const RUNAWAY = {
  ms: 64_000, // its whole stay: five crossings (game/render/stripEventTiming RUNAWAY_PASSES) and its escape (was 12 s, one crossing)
  escapeMs: 1_200, // the taunt and the leap away at the end of its stay — or wherever it is when it has to go
  /** Which chest it is (weights). */
  chestWeights: { normal: 85, stageBoss: 15, zoneBoss: 0 } satisfies Record<ChestType, number>,
} as const;

/** The WANDERING MERCHANT: a cart stops behind the party for a while and sells a few things for gold — gear rolled
 *  as a stage-boss chest of the stage would roll it, and a gem — each once. A gold sink for the attentive. */
export const MERCHANT = {
  ms: 66_400, // his whole stay: a minute standing (user, 2026-11-21: «al menos 1 minuto»; was 45 s in all) and his walk in and out
  walkMs: 3_200, // the walk in from the strip's left edge to his place, and back out
  items: 2,
  gems: 1,
  /** Price = this × what the piece melts into at the Cube (sim/cube itemGoldValue). */
  priceMult: 4,
  /** A gem is priced like a gear piece of its tier at the item level of the stage, times this. */
  gemPriceShare: 0.6,
} as const;

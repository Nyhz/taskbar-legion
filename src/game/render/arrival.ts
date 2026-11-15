import { ARRIVE_STAGGER_MS } from '@/data/field';

// How a hero COMES BACK onto the strip, and how a party leaves it (no Pixi here — pure, unit-tested): after a
// defeat, when a fallen hero revives in the middle of a fight, when a recruit joins, and on arriving in a new
// world. Two ideas were drawn (tools/assets/pipeline/fx/flow.py); ARRIVAL_CHOICE picks the one the game plays.
//
//   A — the column: a shaft of light slams down on the hero's place; the hero stands in it white-hot and takes
//       its colours back as the shaft thins away upwards.
//   B — the embers: a sigil of the class's colour opens on the ground, embers wind up from it and close on the
//       body, which gathers out of them.
//
// Each is a pair of one-shot effects (behind the figure / in front of it) and a short script for the FIGURE
// itself: when it shows, how white it is, when its overhead HUD comes back.

export type ArrivalIdea = 'A' | 'B';

/** The arrival the game plays (the lab shows both). */
export const ARRIVAL_CHOICE: ArrivalIdea = 'A';

export interface ArrivalFx {
  /** One-shots behind the figure and in front of it, started together when the arrival starts. */
  under: readonly string[];
  over: readonly string[];
}

interface Script {
  totalMs: number;
  /** The figure is not drawn before this. */
  showAtMs: number;
  /** It fades in over this long from `showAtMs` (0 = it is simply there). */
  fadeInMs: number;
  /** It is white-hot (`white` at its peak) until here, then cools to its own colours by `coolAtMs`. */
  whiteUntilMs: number;
  coolAtMs: number;
  white: number;
  /** The life bar, pips and cooldowns come back here. */
  hudAtMs: number;
}

// A: the shaft touches down 80 ms in (flow.py A_MS: frames 0–1 are the thread coming down).
const SCRIPT: Readonly<Record<ArrivalIdea, Script>> = {
  A: { totalMs: 860, showAtMs: 80, fadeInMs: 0, whiteUntilMs: 250, coolAtMs: 600, white: 1, hudAtMs: 620 },
  B: { totalMs: 960, showAtMs: 240, fadeInMs: 400, whiteUntilMs: 520, coolAtMs: 820, white: 0.85, hudAtMs: 760 },
};

const SIGIL_CLASSES: ReadonlySet<string> = new Set(['knight', 'ranger', 'priest']);

/** The effects of an arrival for a hero of `classKey`. */
export function arrivalFx(idea: ArrivalIdea, classKey: string): ArrivalFx {
  if (idea === 'A') return { under: ['arrive_a_back'], over: ['arrive_a_front'] };
  return { under: [`arrive_b_sigil_${SIGIL_CLASSES.has(classKey) ? classKey : 'knight'}`], over: ['arrive_b_embers'] };
}

/** Every effect key an arrival or a departure can play (the atlas test checks they all exist). */
export const ARRIVAL_FX_KEYS: readonly string[] = [
  ...arrivalFx('A', 'knight').under,
  ...arrivalFx('A', 'knight').over,
  ...[...SIGIL_CLASSES].map((c) => arrivalFx('B', c).under[0] ?? ''),
  ...arrivalFx('B', 'knight').over,
];

export interface BodyLook {
  /** The figure's opacity, 0–1. */
  alpha: number;
  /** How far it is washed to white, 0–1. */
  white: number;
  /** Whether its overhead HUD (life bar, pips, cooldowns) shows. */
  hud: boolean;
  /** The script has played out: the hero is simply on the field again (or, for a departure, gone). */
  done: boolean;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** The figure `ms` into its arrival (`ms` < 0: still waiting for its turn — not drawn). */
export function arrivalBody(idea: ArrivalIdea, ms: number): BodyLook {
  const s = SCRIPT[idea];
  if (ms < s.showAtMs) return { alpha: 0, white: 0, hud: false, done: false };
  if (ms >= s.totalMs) return { alpha: 1, white: 0, hud: true, done: true };
  const alpha = s.fadeInMs <= 0 ? 1 : clamp01((ms - s.showAtMs) / s.fadeInMs);
  const cool = clamp01((ms - s.whiteUntilMs) / Math.max(1, s.coolAtMs - s.whiteUntilMs));
  return { alpha, white: s.white * (1 - cool), hud: ms >= s.hudAtMs, done: false };
}

export function arrivalMs(idea: ArrivalIdea): number {
  return SCRIPT[idea].totalMs;
}

/** A hero LEAVING (the party is taken to another world): the same shaft comes down on it — it goes white as the
 *  thread descends and is gone when the shaft hits. Always idea A's effects: a departure is not a rebirth. */
export const DEPART_FX: ArrivalFx = arrivalFx('A', 'knight');
const DEPART_GONE_AT_MS = 110;

export function departBody(ms: number): BodyLook {
  if (ms >= DEPART_GONE_AT_MS) return { alpha: 0, white: 0, hud: false, done: ms >= SCRIPT.A.totalMs };
  return { alpha: 1, white: clamp01(ms / 80), hud: false, done: false };
}

/** When the `index`-th hero of a returning party starts arriving (0 = the front one): one after another. */
export function arrivalDelayMs(index: number): number {
  return Math.max(0, index) * ARRIVE_STAGGER_MS;
}

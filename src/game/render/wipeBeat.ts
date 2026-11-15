import { WIPE_ARRIVE_AT_MS, WIPE_BLACK_MS, WIPE_DEAD_MS, WIPE_FADE_MS, WIPE_PHRASE_FADE_MS, WIPE_RETREAT_AT_MS } from '@/data/field';

// Painting the party's defeat (sim `world.wipeMs`, data/field WIPE_*) — no Pixi here, pure and unit-tested. The
// beats never overlap: the fallen party → the fade to black → the phrase alone on black → the fade back to the
// (already retreated) stage, empty → the stage's sign → the heroes arriving. The simulation owns the clock; this
// says what the strip shows at each moment of it.

/** What the heroes are doing: lying where they fell, gone from the field, or back and arriving. */
export type WipeParty = 'fallen' | 'gone' | 'back';

export interface WipeLook {
  /** Blackout over the whole strip, 0–1. */
  black: number;
  /** The phrase's opacity, 0–1: only ever above 0 while the strip is fully black. */
  phrase: number;
  party: WipeParty;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** The strip `ms` into the defeat. */
export function wipeLook(ms: number): WipeLook {
  const party: WipeParty = ms < WIPE_RETREAT_AT_MS ? 'fallen' : ms < WIPE_ARRIVE_AT_MS ? 'gone' : 'back';
  const blackFrom = WIPE_DEAD_MS + WIPE_FADE_MS; // fully black from here…
  const blackTo = blackFrom + WIPE_BLACK_MS; // …to here
  let black = 0;
  if (ms >= WIPE_DEAD_MS && ms < blackFrom) black = (ms - WIPE_DEAD_MS) / WIPE_FADE_MS;
  else if (ms >= blackFrom && ms < blackTo) black = 1;
  else if (ms >= blackTo && ms < blackTo + WIPE_FADE_MS) black = 1 - (ms - blackTo) / WIPE_FADE_MS;
  // The phrase comes up once the black is full and is gone before it lifts.
  const phrase = ms < blackFrom || ms >= blackTo ? 0 : clamp01(Math.min((ms - blackFrom) / WIPE_PHRASE_FADE_MS, (blackTo - ms) / WIPE_PHRASE_FADE_MS));
  return { black: clamp01(black), phrase, party };
}

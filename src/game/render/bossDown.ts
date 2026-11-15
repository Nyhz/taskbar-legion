import { BOSS_DOWN_FADE_MS } from '@/data/field';

// Painting the beat a fallen world boss gets (sim `world.bossDown`, data/field BOSS_DOWN_MS) — no Pixi here,
// pure and unit-tested. The boss falls and lies in ITS world; when the win leads on to another world the strip
// fades to black over the END of the beat, so the world changes unseen and the teleport that follows starts
// from black instead of snapping the backdrop under the party's feet.

/** The strip's peak blackness (the teleport sequence peaks at the same value, so the hand-over is seamless). */
export const BOSS_DOWN_BLACK = 0.9;

/** Blackout alpha `ms` into a beat of `totalMs`: none until the last BOSS_DOWN_FADE_MS, then a ramp to
 *  BOSS_DOWN_BLACK at the end. */
export function bossDownBlackAlpha(ms: number, totalMs: number): number {
  const fade = Math.min(BOSS_DOWN_FADE_MS, totalMs);
  if (fade <= 0) return 0;
  const k = (ms - (totalMs - fade)) / fade;
  return BOSS_DOWN_BLACK * Math.max(0, Math.min(1, k));
}

/** The beat's clock as drawn: the simulation advances it one tick at a time, the strip every frame — so the drawn
 *  clock runs on with the frame time, never behind the simulation's and never more than a tick ahead of it. */
export function smoothBeatClock(drawnMs: number, simMs: number, dtMs: number, tickMs: number): number {
  if (drawnMs < 0 || simMs < drawnMs - tickMs) return simMs; // a new beat
  return Math.min(simMs + tickMs, Math.max(simMs, drawnMs + dtMs));
}

/** Share of the teleport sequence already "played" when it starts from a strip the beat left black: its
 *  blackout is fully up from here on (GameStrip.detectAndDriveTeleport ramps to black over the first 40 %). */
export const TELEPORT_FROM_BLACK = 0.4;

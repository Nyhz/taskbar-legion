import { MERCHANT_WALK_MS, RUNAWAY_ESCAPE } from './stripEventTiming';

// Where a strip event stands on the strip and which clip it plays, from how long it has been there (no Pixi —
// pure, unit-tested). Screen space, in the strip's art pixels: the runaway chest crosses from just past the right
// edge to just past the left one over its stay; the merchant walks in from the left edge to his place behind the
// party, stands there, and walks back out over the last stretch of his stay.

export type EventClip = 'run' | 'caught' | 'escape' | 'walk' | 'idle' | 'wave' | 'thanks';

export interface EventPlace {
  x: number;
  clip: EventClip;
  /** −1: drawn mirrored (facing left). */
  facing: 1 | -1;
  /** How solid it is drawn (1 unless it is fading out: the runaway's leap away). */
  alpha?: number;
}

/** Beyond the edges, so it starts and ends out of sight. */
const OFF_EDGE = 18;

/** The runaway chest at `ms` of its `totalMs` crossing a strip `width` wide: right to left, facing left, until it is
 *  near the left edge (RUNAWAY_ESCAPE.x); there, nobody having caught it, it stops, taunts and springs away — the
 *  `escape` clip over the last RUNAWAY_ESCAPE.share of its stay, fading out over the end of the leap. */
export function runawayPlace(ms: number, totalMs: number, width: number): EventPlace {
  const t = Math.max(0, Math.min(1, totalMs > 0 ? ms / totalMs : 1));
  const runEnd = 1 - RUNAWAY_ESCAPE.share;
  const from = width + OFF_EDGE;
  if (t < runEnd) return { x: from - (t / runEnd) * (from - RUNAWAY_ESCAPE.x), clip: 'run', facing: -1 };
  const e = (t - runEnd) / RUNAWAY_ESCAPE.share; // 0…1 through its escape
  const alpha = e < RUNAWAY_ESCAPE.fadeFrom ? 1 : Math.max(0, 1 - (e - RUNAWAY_ESCAPE.fadeFrom) / (1 - RUNAWAY_ESCAPE.fadeFrom));
  return { x: RUNAWAY_ESCAPE.x, clip: 'escape', facing: -1, alpha };
}

/** The merchant at `ms` of his `totalMs` stay, standing at `standX` once arrived. */
export function merchantPlace(ms: number, totalMs: number, standX: number): EventPlace {
  const walk = Math.min(MERCHANT_WALK_MS, totalMs / 3);
  const from = -OFF_EDGE;
  if (ms < walk) return { x: from + (standX - from) * (ms / walk), clip: 'walk', facing: 1 };
  if (ms > totalMs - walk) return { x: standX - (standX - from) * Math.min(1, (ms - (totalMs - walk)) / walk), clip: 'walk', facing: -1 };
  return { x: standX, clip: 'idle', facing: 1 };
}

/** True while the merchant is standing at his place (he can be tapped, and he waves on arriving). */
export function merchantStanding(ms: number, totalMs: number): boolean {
  const walk = Math.min(MERCHANT_WALK_MS, totalMs / 3);
  return ms >= walk && ms <= totalMs - walk;
}

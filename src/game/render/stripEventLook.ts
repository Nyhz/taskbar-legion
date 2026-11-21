import { MERCHANT_WALK_MS, RUNAWAY_ESCAPE, RUNAWAY_PATH } from './stripEventTiming';

// Where a strip event stands on the strip and which clip it plays, from how long it has been there (no Pixi —
// pure, unit-tested). Screen space, in the strip's art pixels: the runaway chest runs to and fro across the strip,
// hopping, then springs away at the left; the merchant walks in from the left edge to his place behind the party,
// stands there, and walks back out over the last stretch of his stay. Either leaves early from where it is when the
// simulation sends it away (`leaveAtMs`).

export type EventClip = 'run' | 'caught' | 'escape' | 'walk' | 'idle' | 'wave' | 'thanks';

export interface EventPlace {
  x: number;
  clip: EventClip;
  /** −1: drawn mirrored (facing left). */
  facing: 1 | -1;
  /** How solid it is drawn (1 unless it is fading out: the runaway's leap away). */
  alpha?: number;
  /** How high off the ground it is drawn, art px (the runaway's hops). */
  lift?: number;
}

/** Beyond the edges, so it starts and ends out of sight. */
const OFF_EDGE = 18;

/** A hop's height `t` (0…1) of the way through it: a parabola peaking at `px`. */
function hop(t: number, px: number): number {
  return t <= 0 || t >= 1 ? 0 : Math.round(px * 4 * t * (1 - t));
}

/** Where the running chest is at `ms` (before its escape) on a strip `width` wide. */
function runawayRun(ms: number, totalMs: number, width: number): EventPlace {
  const { passes, turnMargin, turnMs, turnHopPx, hopEveryMs, hopMs, hopPx } = RUNAWAY_PATH;
  const runMs = Math.max(1, totalMs - RUNAWAY_ESCAPE.ms);
  const passMs = runMs / passes;
  const pass = Math.min(passes - 1, Math.floor(Math.max(0, ms) / passMs));
  let at = Math.max(0, ms) - pass * passMs;
  const left = RUNAWAY_ESCAPE.x;
  const right = Math.max(left + 1, width - turnMargin);
  // Pass 0 comes in from past the right edge; then it runs between `right` and `left`, ending at `left`.
  const leftward = pass % 2 === 0;
  const from = pass === 0 ? width + OFF_EDGE : leftward ? right : left;
  const to = leftward ? left : right;
  const facing: 1 | -1 = leftward ? -1 : 1;
  // A turn (every pass but the first): it stops where it is, facing its new way, and hops twice.
  if (pass > 0) {
    if (at < turnMs) {
      const half = turnMs / 2;
      return { x: from, clip: 'run', facing, lift: hop((at % half) / half, turnHopPx) };
    }
    at -= turnMs;
  }
  const travelMs = Math.max(1, passMs - (pass > 0 ? turnMs : 0));
  const t = Math.min(1, at / travelMs);
  const into = at % hopEveryMs;
  const lift = into > hopEveryMs - hopMs ? hop((into - (hopEveryMs - hopMs)) / hopMs, hopPx) : 0;
  return { x: from + (to - from) * t, clip: 'run', facing, lift };
}

/** The runaway chest at `ms` of its `totalMs` stay on a strip `width` wide: it runs to and fro, hopping
 *  (RUNAWAY_PATH); nobody having caught it, it stops near the left edge, taunts and springs away — the `escape` clip
 *  over its last RUNAWAY_ESCAPE.ms, fading out over the end of the leap. Sent away early (`leaveAtMs`), it springs
 *  away from wherever it was. */
export function runawayPlace(ms: number, totalMs: number, width: number, leaveAtMs?: number): EventPlace {
  const escapeAt = leaveAtMs ?? Math.max(0, totalMs - RUNAWAY_ESCAPE.ms);
  if (ms < escapeAt) return runawayRun(ms, totalMs, width);
  const where = leaveAtMs !== undefined ? runawayRun(leaveAtMs, totalMs, width) : { x: RUNAWAY_ESCAPE.x, facing: -1 as const };
  const e = Math.min(1, (ms - escapeAt) / Math.max(1, RUNAWAY_ESCAPE.ms)); // 0…1 through its escape
  const alpha = e < RUNAWAY_ESCAPE.fadeFrom ? 1 : Math.max(0, 1 - (e - RUNAWAY_ESCAPE.fadeFrom) / (1 - RUNAWAY_ESCAPE.fadeFrom));
  return { x: where.x, clip: 'escape', facing: where.facing, alpha };
}

/** When the merchant starts walking out: at the end of his stay, or when he was sent away. */
function merchantExitAt(totalMs: number, leaveAtMs?: number): number {
  return leaveAtMs ?? totalMs - Math.min(MERCHANT_WALK_MS, totalMs / 3);
}

/** The merchant at `ms` of his `totalMs` stay, standing at `standX` once arrived — walking out from wherever he is
 *  when sent away early (`leaveAtMs`). */
export function merchantPlace(ms: number, totalMs: number, standX: number, leaveAtMs?: number): EventPlace {
  const walk = Math.min(MERCHANT_WALK_MS, totalMs / 3);
  const from = -OFF_EDGE;
  const exitAt = merchantExitAt(totalMs, leaveAtMs);
  const inAt = (t: number): number => (t < walk ? from + (standX - from) * (t / walk) : standX);
  if (ms >= exitAt) {
    const start = inAt(exitAt);
    // Out takes as long as in — or as long as he had walked in, sent away before he arrived.
    const out = Math.max(1, Math.min(walk, exitAt));
    return { x: start - (start - from) * Math.min(1, (ms - exitAt) / out), clip: 'walk', facing: -1 };
  }
  if (ms < walk) return { x: inAt(ms), clip: 'walk', facing: 1 };
  return { x: standX, clip: 'idle', facing: 1 };
}

/** True while the merchant is standing at his place (he can be tapped, and he waves on arriving). */
export function merchantStanding(ms: number, totalMs: number, leaveAtMs?: number): boolean {
  const walk = Math.min(MERCHANT_WALK_MS, totalMs / 3);
  return ms >= walk && ms < merchantExitAt(totalMs, leaveAtMs);
}

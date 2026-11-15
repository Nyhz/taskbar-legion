import { TELEPORT_HOLD_MS, TELEPORT_LIFT_AT, WIPE_SIGN_AT_MS } from '@/data/field';
import type { WorldState } from '@/sim/world';

// When the stage's sign must WAIT (pure): the UI shows it on every change of stage (ui/overlay/StageBanner), but
// never over a black strip. Two things black the strip out and move the party under it:
//   - a defeat: the sign waits until the strip is back on the stage the party fell back to (WIPE_SIGN_AT_MS);
//   - a journey to another world (after a world boss, or by the map): the simulation holds the party for
//     TELEPORT_HOLD_MS while the strip goes black and lifts — the sign waits for the lift (TELEPORT_LIFT_AT).
// The ordinary walk between waves is far shorter than that hold, so it never counts.

const JOURNEY_BLACK_MS = TELEPORT_HOLD_MS * (1 - TELEPORT_LIFT_AT); // what is left of the hold when the black lifts

export function stageSignHeld(w: Pick<WorldState, 'wipeMs' | 'phase' | 'advanceTimerMs'>): boolean {
  if (w.wipeMs !== undefined) return w.wipeMs < WIPE_SIGN_AT_MS;
  return w.phase === 'advancing' && w.advanceTimerMs > JOURNEY_BLACK_MS;
}

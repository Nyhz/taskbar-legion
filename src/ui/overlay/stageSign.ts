// When the stage's sign (ui/overlay/StageBanner) starts — pure, unit-tested. It shows whenever the party moves to
// another stage; but while the party lies fallen and the strip is black (the engine holds it: hud.stageSignHeld)
// it WAITS, and shows once the strip is back — for the stage the party is on then, changed or not: after a defeat
// the player is always told where the party stands (one stage back, or the same one with Retry on).

export interface StageSignState {
  stage: number;
  held: boolean;
}

/** The stage whose sign starts now, going from `prev` to `next`; null = none. */
export function stageSignToShow(prev: StageSignState, next: StageSignState): number | null {
  if (next.held) return null; // nothing over the black
  if (prev.held) return next.stage; // the strip is back: where the party stands now
  return next.stage !== prev.stage ? next.stage : null;
}

// The world boss's GATE on the strip (no Pixi here — pure, unit-tested): which drawing it shows and where its
// parts sit. It stands ON the path like a figure — its base on the heroes' ground line — near the right edge of
// the strip while the party is on a beaten stage 9. The art is tools/assets/pipeline/fx/flow.py:
//   portal_shut   no key for this world: the gate is chained and cold;
//   portal_open   a key is held: it is awake — a rift turns in the doorway and two eyes look out of its dark;
//   portal_hot    the pointer is on it (it can be clicked): wider awake, brighter;
//   portal_enter  the party goes in: the rift flares and takes the gate with it (a one-shot, played in its place).

export type PortalState = 'shut' | 'open' | 'hot';

export const PORTAL_FX: Readonly<Record<PortalState, string>> = { shut: 'portal_shut', open: 'portal_open', hot: 'portal_hot' };
export const PORTAL_ENTER_FX = 'portal_enter';

/** What the gate shows with `keysHeld` keys of this world and the pointer on it or not. Without a key the
 *  pointer wakes nothing: the chains stay on. */
export function portalState(keysHeld: number, pointerOver: boolean): PortalState {
  if (keysHeld <= 0) return 'shut';
  return pointerOver ? 'hot' : 'open';
}

/** The gate's footprint around its base centre, in art pixels (the drawing's cell; its skulls spill to both sides). */
export const PORTAL_HALF_WIDTH = 34;
export const PORTAL_HEIGHT = 90;
/** The row of signs over it (boss · key · count): the middle of the row above the base, and its height. */
export const PORTAL_SIGNS_UP = PORTAL_HEIGHT + 9;
export const PORTAL_SIGNS_HEIGHT = 14;
/** How far from the strip's right edge the gate's centre stands: its whole drawing stays on the strip. */
export const PORTAL_FROM_RIGHT = PORTAL_HALF_WIDTH + 1;

/** The clickable box around the base centre (x, y, w, h — y negative is up): the gate and its signs. */
export function portalHitBox(): { x: number; y: number; width: number; height: number } {
  const top = PORTAL_SIGNS_UP + PORTAL_SIGNS_HEIGHT / 2 + 1;
  return { x: -PORTAL_HALF_WIDTH + 6, y: -top, width: (PORTAL_HALF_WIDTH - 6) * 2, height: top + 2 };
}

// Enemies drawn apart (no Pixi here — pure, unit-tested). The simulation walks every melee enemy of a wave up to
// the same line, and every shooter to another: on the strip they were one pile, and an elite could not be told
// from the pack around it. PRESENTATION ONLY: the simulation's positions do not change; when DRAWN, enemies that
// share a spot fan out a few pixels behind the first one, in two depth rows — the back row a little higher and
// drawn behind. Bosses and summons are not part of it (the caller leaves them out).

/** Enemies whose drawn x is within this of the one before (sorted) stand "on the same spot". */
export const CROWD_NEAR_PX = 8;
/** Pixels between two neighbours of a pile… */
export const CROWD_GAP_PX = 9;
/** …squeezed so that the whole pile never spreads further than this, however many they are. */
export const CROWD_MAX_SPREAD_PX = 72;
/** How much higher the back row is drawn. */
export const CROWD_ROW_LIFT_PX = 3;
/** How fast a figure eases to a new place in its pile (px/s): no jump when a neighbour dies. */
export const CROWD_EASE_PX_S = 45;

export interface CrowdMember {
  id: string;
  /** Where the simulation has it, in strip pixels. */
  x: number;
  /** Elites and supports: they take the first places of their pile — the front row, nearest the party. */
  prominent: boolean;
}

export interface CrowdPlace {
  /** Offset from its own x. */
  dx: number;
  /** How much higher it is drawn (0 = the front row). */
  lift: number;
  /** Draw order inside the pile: higher is nearer the viewer. */
  order: number;
}

const byId = (a: CrowdMember, b: CrowdMember): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Where each enemy of the field is drawn relative to its own position. An enemy standing alone stays put. */
export function crowdPlaces(members: readonly CrowdMember[]): Map<string, CrowdPlace> {
  const out = new Map<string, CrowdPlace>();
  const sorted = [...members].sort((a, b) => a.x - b.x || byId(a, b));
  let pile: CrowdMember[] = [];
  const flush = (): void => {
    if (pile.length === 0) return;
    const anchor = pile[0]?.x ?? 0; // the one nearest the party holds the contact point
    // Prominent first; then a stable order by id, so the same enemies keep the same places from frame to frame.
    const order = [...pile].sort((a, b) => Number(b.prominent) - Number(a.prominent) || byId(a, b));
    const gap = order.length > 1 ? Math.min(CROWD_GAP_PX, CROWD_MAX_SPREAD_PX / (order.length - 1)) : 0;
    order.forEach((m, i) => {
      const back = i % 2 === 1;
      out.set(m.id, { dx: anchor + i * gap - m.x, lift: back ? CROWD_ROW_LIFT_PX : 0, order: (back ? 0 : 1000) + (order.length - i) });
    });
    pile = [];
  };
  for (const m of sorted) {
    const last = pile[pile.length - 1];
    if (last !== undefined && m.x - last.x > CROWD_NEAR_PX) flush();
    pile.push(m);
  }
  flush();
  return out;
}

/** One step of the ease from where a figure is drawn to where its pile wants it. */
export function easeCrowd(current: { dx: number; lift: number }, target: { dx: number; lift: number }, dtMs: number): { dx: number; lift: number } {
  const step = (CROWD_EASE_PX_S * dtMs) / 1000;
  const toward = (from: number, to: number): number => (Math.abs(to - from) <= step ? to : from + Math.sign(to - from) * step);
  return { dx: toward(current.dx, target.dx), lift: toward(current.lift, target.lift) };
}

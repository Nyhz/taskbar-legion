// Where the wave's enemies are drawn as they come and as they stand in line (no Pixi here — pure, unit-tested).
// The simulation walks every melee enemy of a wave up to the same spot, at its reach from the front hero, and
// every shooter to another; there all of them swing. PRESENTATION ONLY: the simulation's positions do not change.
//
// When DRAWN, the enemies that reach a spot form a LINE there, first come first served:
//   - the first few (CONTACT_PLACES) stand at the spot itself, in depth rows — they are the ones seen fighting;
//   - the rest queue behind them, a gap apart, and wait for a place. A queued melee enemy is not shown swinging;
//   - shooters have no contact to keep: their whole line fans out behind its first one, and all of them shoot.
// An enemy still walking is drawn where it walks, until it reaches the tail of the line, where it waits.
//
// Every place is kept or moves FORWARD (towards the party), never back, and a figure only ever walks forward to a
// new place, at its own pace. Before, the line was re-sorted every frame (elites first, then by id) and spread
// again whenever someone joined or died, so a figure that had reached the hero was sent back down the pile while
// it kept swinging (user, 2026-11-18: «se ven desplazados hacia atrás y siguen pegando desde esa distancia; es raro
// y parece poco orgánico») and one still coming stopped and slid backwards as it joined (same day: «a veces se
// paran y dan un deslizamiento hacia atrás; no va smooth»).
// Bosses and summons are not part of it (the caller leaves them out).

/** The places at the spot itself, from the front (offset from the spot in strip pixels, + = further from the
 *  party; lift: how much higher it is drawn, the back rows). Within 4 px of where the simulation strikes from, and
 *  leaning a little towards the hero: the simulation stops a soldier 55 px from him, root to root, and a scarecrow's
 *  blade reaches 32 px in front of its root against the Knight's 19 — at 55 its blow fell 4 px short of him. */
export const CONTACT_PLACES: readonly { dx: number; lift: number }[] = [
  { dx: -4, lift: 0 },
  { dx: -2, lift: 3 },
  { dx: 0, lift: 6 },
];
/** A melee enemy this close to its place at the spot (px) stands there: its blow still lands on the hero. */
const CONTACT_SLACK_PX = 3;
/** How far behind the spot the first one queued waits: clear of the fighters, so it reads as waiting, yet near
 *  enough that the Knight's blow still meets it — the simulation's Knight strikes the first enemy of the wave
 *  within his reach, and that may be one the line has queued (all of them stand level in the simulation). */
export const QUEUE_FROM_PX = 8;
/** Pixels between two neighbours of a queue (or of a line of shooters)… */
export const CROWD_GAP_PX = 9;
/** …squeezed so that a whole line never spreads further than this behind its spot, however many they are. */
export const CROWD_MAX_SPREAD_PX = 72;
/** How much higher every other one of a queue is drawn (two depth rows). */
export const CROWD_ROW_LIFT_PX = 3;
/** How fast a figure rises or settles into a new row (px/s). */
const LIFT_PX_S = 20;
/** Headroom over its own walking speed for a figure stepping up to a new place (as the strip's display tracking). */
const SPEED_SLACK = 1.1;

export interface CrowdMember {
  id: string;
  /** Where it is shown walking (the simulation's x, tracked smoothly), in strip pixels. */
  x: number;
  /** Its reach: the enemies of a line are those that stop at the same spot. */
  line: number;
  /** A melee enemy: it must stand at the spot to fight. */
  melee: boolean;
  /** The simulation has it standing at its spot (in reach, not walking). */
  arrived: boolean;
  /** Its walking speed (px/s): it steps up to a new place no faster. */
  speed: number;
  /** Elites and supports: of those that reach a line in the same instant, they take the first places. */
  prominent: boolean;
}

export interface CrowdPlace {
  /** Where it is drawn, in strip pixels. */
  x: number;
  /** How much higher it is drawn (0 = the front row). */
  lift: number;
  /** Draw order inside its line: higher is nearer the viewer. */
  order: number;
  /** False for a melee enemy queued behind the fighters: it waits and is not shown swinging. */
  fighting: boolean;
}

interface Line {
  ids: string[]; // in the order they joined
  spot: number; // where its first stand (the simulation's spot, as shown); it only ever comes forward
  gap: number; // the queue's gap; it only ever narrows, so nobody is sent back when one dies
}

/** The place of index `k` in a line, as an offset from its spot. */
function placeOf(line: Line, k: number, melee: boolean): { dx: number; lift: number } {
  const contact = melee ? CONTACT_PLACES.length : 0;
  const near = CONTACT_PLACES[k];
  if (k < contact && near !== undefined) return near;
  const j = k - contact;
  return { dx: (melee ? QUEUE_FROM_PX : 0) + j * line.gap, lift: j % 2 === 1 ? CROWD_ROW_LIFT_PX : 0 };
}

function queueGap(count: number, melee: boolean): number {
  const queued = count - (melee ? CONTACT_PLACES.length : 0);
  const room = CROWD_MAX_SPREAD_PX - (melee ? QUEUE_FROM_PX : 0);
  return queued > 1 ? Math.min(CROWD_GAP_PX, room / (queued - 1)) : CROWD_GAP_PX;
}

const toward = (from: number, to: number, step: number): number => (Math.abs(to - from) <= step ? to : from + Math.sign(to - from) * step);

export class CrowdLayout {
  private readonly lines = new Map<number, Line>();
  private readonly shown = new Map<string, CrowdPlace>();

  /** Where each member is drawn this frame. An enemy that is not a member (a dead one) keeps its last place: `last`. */
  update(members: readonly CrowdMember[], dtMs: number): Map<string, CrowdPlace> {
    const out = new Map<string, CrowdPlace>();
    const byLine = new Map<number, CrowdMember[]>();
    for (const m of members) byLine.set(m.line, [...(byLine.get(m.line) ?? []), m]);
    for (const key of [...this.lines.keys()]) if (!byLine.has(key)) this.lines.delete(key);
    for (const [key, group] of byLine) this.layLine(key, group, dtMs, out);
    return out;
  }

  /** The last place `id` was drawn at, if it has been laid out. */
  last(id: string): CrowdPlace | undefined {
    return this.shown.get(id);
  }

  forget(id: string): void {
    this.shown.delete(id);
  }

  clear(): void {
    this.lines.clear();
    this.shown.clear();
  }

  private layLine(key: number, group: CrowdMember[], dtMs: number, out: Map<string, CrowdPlace>): void {
    const melee = group.some((m) => m.melee);
    const byId = new Map(group.map((m) => [m.id, m]));
    const line = this.lines.get(key) ?? { ids: [], spot: Number.POSITIVE_INFINITY, gap: CROWD_GAP_PX };
    this.lines.set(key, line);
    line.ids = line.ids.filter((id) => byId.has(id)); // the fallen leave; everyone behind moves up
    // Those reaching the line now: the ones the simulation has at the spot, and the ones still walking that have
    // come up to the tail of its queue (they wait there). Nearest first; of those level, elites and supports first.
    const waiting = group.filter((m) => !line.ids.includes(m.id)).sort((a, b) => a.x - b.x || Number(b.prominent) - Number(a.prominent) || (a.id < b.id ? -1 : 1));
    for (const m of waiting) {
      if (!m.arrived) {
        const tail = line.ids.length;
        const atTail = Number.isFinite(line.spot) && tail >= (melee ? CONTACT_PLACES.length : 0) && m.x <= line.spot + placeOf(line, tail, melee).dx;
        if (!atTail) continue;
      }
      line.ids.push(m.id);
      line.gap = Math.min(line.gap, queueGap(line.ids.length, melee));
    }
    // The spot is where the first ones stand, as shown; it only ever comes forward while the line lasts.
    for (const id of line.ids) {
      const m = byId.get(id);
      if (m?.arrived === true) line.spot = Math.min(line.spot, m.x);
    }
    const count = line.ids.length;
    line.ids.forEach((id, k) => {
      const m = byId.get(id);
      if (m === undefined) return;
      const place = placeOf(line, k, melee);
      // A place at the spot is stood on once the simulation has it there; one in the queue is where it waits — it
      // walks on until it gets there.
      const want = Number.isFinite(line.spot) ? Math.max(m.x + Math.min(0, place.dx), line.spot + place.dx) : m.x;
      const shown = this.step(m, want, place.lift, (place.lift === 0 ? 1000 : 0) + (count - k), dtMs);
      // A melee enemy fights from a place at the spot, once it stands there — not while it is still stepping up to it.
      shown.fighting = !melee || (k < CONTACT_PLACES.length && shown.x <= want + CONTACT_SLACK_PX);
      out.set(id, shown);
    });
    for (const m of group) if (!out.has(m.id)) out.set(m.id, this.step(m, m.x, 0, 0, dtMs)); // still on its way
  }

  // Forward only: a figure walks up to a place ahead of it, at its own pace, and holds where it is when its place is
  // behind it (one that came to the spot a step ahead of the place it was given) — it is never sent back.
  private step(m: CrowdMember, want: number, lift: number, order: number, dtMs: number): CrowdPlace {
    const had = this.shown.get(m.id);
    const reach = (m.speed * SPEED_SLACK * dtMs) / 1000;
    const x = had === undefined ? want : want < had.x ? Math.max(want, had.x - reach) : had.x;
    const place = { x, lift: had === undefined ? lift : toward(had.lift, lift, (LIFT_PX_S * dtMs) / 1000), order, fighting: true };
    this.shown.set(m.id, place);
    return place;
  }
}

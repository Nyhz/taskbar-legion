// Where the wave's enemies are drawn as they come and as they stand in line (no Pixi here — pure, unit-tested).
// The simulation walks every melee enemy of a wave up to the same spot, at its reach from the front hero, and
// every shooter to another; there all of them swing. PRESENTATION ONLY: the simulation's positions do not change.
//
// When DRAWN, the enemies that reach a spot form a LINE there, first come first served:
//   - melee enemies form a PLATOON at the spot (2026-11-18; user: the ones queued behind «no les veo hacer la animación
//     de atacar… idealmente todos deberían avanzar y pegar… que peguen pero no se stackeen mucho»): two columns of four
//     depth rows (CONTACT_PLACES). The front column's blows reach the hero; the back column steps in to strike
//     (`lunge`) and back. More than eight squeeze into the back of the block — every one of them is shown fighting,
//     as in the simulation every one of them strikes;
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

/** The platoon's places at the spot, in the order they are filled (offset from the spot in strip pixels, + = further
 *  from the party; lift: how much higher it is drawn, the back rows; lunge: how far it steps in to strike). The front
 *  column stands within 4 px of where the simulation strikes from, leaning a little towards the hero (the simulation
 *  stops a soldier 55 px from him, root to root, and a scarecrow's blade reaches 32 px in front of its root against the
 *  Knight's 19 — at 55 its blow fell 4 px short of him); the back column a body's width behind, stepping in to reach. */
export const CONTACT_PLACES: readonly { dx: number; lift: number; lunge: number }[] = [
  { dx: -4, lift: 0, lunge: 0 },
  { dx: -3, lift: 3, lunge: 0 },
  { dx: -2, lift: 6, lunge: 0 },
  { dx: -1, lift: 9, lunge: 0 },
  { dx: 9, lift: 1, lunge: 12 },
  { dx: 10, lift: 4, lunge: 12 },
  { dx: 11, lift: 7, lunge: 12 },
  { dx: 12, lift: 10, lunge: 12 },
];
/** Past the platoon's eight, each one more stands this much further back in the block (squeezed: it never grows past
 *  PLATOON_DEPTH_PX), in its rows, and steps in further to strike. */
const PLATOON_EXTRA_PX = 2;
const PLATOON_DEPTH_PX = 24;
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
  /** False while a melee enemy is still stepping up to its place in the platoon: it is not shown swinging yet. */
  fighting: boolean;
  /** How far it steps in towards the hero to strike (the platoon's back column), in strip pixels. */
  lunge: number;
}

interface Line {
  ids: string[]; // in the order they joined
  spot: number; // where its first stand (the simulation's spot, as shown); it only ever comes forward
  gap: number; // the queue's gap; it only ever narrows, so nobody is sent back when one dies
}

/** The place of index `k` in a line, as an offset from its spot. */
function placeOf(line: Line, k: number, melee: boolean): { dx: number; lift: number; lunge: number } {
  if (melee) {
    const near = CONTACT_PLACES[k];
    if (near !== undefined) return near;
    // Past the eight: into the back of the block, squeezed, still in its rows — and still striking.
    const j = k - CONTACT_PLACES.length;
    const dx = Math.min(PLATOON_DEPTH_PX, 12 + (j + 1) * PLATOON_EXTRA_PX);
    return { dx, lift: 1 + (j % 4) * 3, lunge: dx };
  }
  return { dx: k * line.gap, lift: k % 2 === 1 ? CROWD_ROW_LIFT_PX : 0, lunge: 0 };
}

function queueGap(count: number, melee: boolean): number {
  if (melee) return CROWD_GAP_PX; // a platoon has no queue
  return count > 1 ? Math.min(CROWD_GAP_PX, CROWD_MAX_SPREAD_PX / (count - 1)) : CROWD_GAP_PX;
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
        const atTail = Number.isFinite(line.spot) && m.x <= line.spot + placeOf(line, tail, melee).dx;
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
      // Drawn nearer the viewer the lower its row (the front rows over the back ones), then the earlier it came.
      const shown = this.step(m, want, place.lift, 1000 - place.lift * 10 + (count - k) / 100, dtMs);
      // A melee enemy fights from its place in the platoon, once it stands there — not while still stepping up to it.
      shown.fighting = !melee || shown.x <= want + CONTACT_SLACK_PX;
      shown.lunge = melee ? place.lunge : 0;
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
    const place = { x, lift: had === undefined ? lift : toward(had.lift, lift, (LIFT_PX_S * dtMs) / 1000), order, fighting: true, lunge: 0 };
    this.shown.set(m.id, place);
    return place;
  }
}

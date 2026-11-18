import { describe, expect, it } from 'vitest';
import { CONTACT_PLACES, CrowdLayout, type CrowdMember, type CrowdPlace } from '@/game/render/crowdLayout';

const DT = 1000 / 60;
const SPOT = 200;
// A melee enemy of the line at reach 55; `x` is where it is shown walking (the simulation's x, tracked).
const foe = (id: string, x: number, over: Partial<CrowdMember> = {}): CrowdMember => ({ id, x, line: 55, melee: true, arrived: x <= SPOT, speed: 50, prominent: false, ...over });

/** Runs the layout until it settles (two seconds of frames) and gives the last places. */
function settle(layout: CrowdLayout, members: CrowdMember[], frames = 120): Map<string, CrowdPlace> {
  let out = new Map<string, CrowdPlace>();
  for (let i = 0; i < frames; i++) out = layout.update(members, DT);
  return out;
}

describe('enemies drawn as they come and in their line', () => {
  it('draws an enemy still on its way where it walks', () => {
    const places = new CrowdLayout().update([foe('a', 320)], DT);
    expect(places.get('a')).toMatchObject({ x: 320, lift: 0, fighting: true });
  });

  it('stands a platoon at the spot: the front column within 4 px of where the simulation strikes from, the back column stepping in to reach', () => {
    const line = ['a', 'b', 'c', 'd'].map((id) => foe(id, SPOT));
    const places = settle(new CrowdLayout(), line);
    for (const m of line) {
      const p = places.get(m.id);
      expect(p?.fighting).toBe(true);
      expect(Math.abs((p?.x ?? 0) - SPOT)).toBeLessThanOrEqual(4);
    }
    for (const place of CONTACT_PLACES) {
      if (place.lunge === 0) expect(Math.abs(place.dx)).toBeLessThanOrEqual(4);
      else expect(place.dx - place.lunge).toBeLessThanOrEqual(4); // its step brings its blow to the hero
    }
  });

  it('every melee enemy of a big wave fights (2026-11-18): the block squeezes, it never queues', () => {
    const line = Array.from({ length: 22 }, (_, i) => foe(`e${String(i).padStart(2, '0')}`, SPOT));
    const places = settle(new CrowdLayout(), line);
    for (const m of line) expect(places.get(m.id)?.fighting).toBe(true);
    const xs = line.map((m) => places.get(m.id)?.x ?? 0);
    expect(Math.max(...xs) - SPOT).toBeLessThanOrEqual(24 + 0.01); // the platoon's depth
    for (const m of line) {
      const p = places.get(m.id);
      expect((p?.x ?? 0) - SPOT - (p?.lunge ?? 0)).toBeLessThanOrEqual(4); // each one's step reaches the hero
    }
  });

  it('first come, first served: one that reaches the line later never takes the place of one already there', () => {
    const layout = new CrowdLayout();
    const first = ['a', 'b', 'c'].map((id) => foe(id, SPOT));
    const before = settle(layout, first);
    const after = settle(layout, [...first, foe('z-elite', SPOT, { prominent: true })]);
    for (const m of first) expect(after.get(m.id)).toMatchObject({ x: before.get(m.id)?.x, lift: before.get(m.id)?.lift, fighting: true });
    expect(after.get('z-elite')?.lift).toBeGreaterThan(0); // the next place in the block, not the front one
  });

  it('of those that reach the line together, an elite goes first', () => {
    const places = settle(new CrowdLayout(), [foe('a', SPOT), foe('b', SPOT), foe('c', SPOT), foe('z-elite', SPOT, { prominent: true })]);
    expect(places.get('z-elite')?.fighting).toBe(true);
    expect(places.get('z-elite')?.lift).toBe(0);
  });

  it('when a fighter falls, the ones behind step up — at their own pace — and fight from their new place', () => {
    const layout = new CrowdLayout();
    const line = Array.from({ length: 9 }, (_, i) => foe(`e${i}`, SPOT));
    const before = settle(layout, line);
    const step = layout.update(line.slice(1), DT).get('e8');
    expect(step?.x ?? 0).toBeLessThanOrEqual(before.get('e8')?.x ?? 0);
    expect((before.get('e8')?.x ?? 0) - (step?.x ?? 0)).toBeLessThanOrEqual((50 * 1.1 * DT) / 1000 + 1e-9);
    const settled = settle(layout, line.slice(1));
    expect(settled.get('e8')?.fighting).toBe(true);
    expect(settled.get('e8')?.x ?? 0).toBeLessThan(before.get('e8')?.x ?? 0);
  });

  it('never draws anyone further back than the frame before — as they come, join, wait and die', () => {
    const layout = new CrowdLayout();
    // A wave walking in at different speeds (a beast overtakes the soldiers), then dying one by one at the front.
    const speeds: Record<string, number> = { a: 50, b: 50, c: 70, d: 40, e: 50, f: 70, g: 50, h: 40 };
    const start: Record<string, number> = { a: 330, b: 336, c: 360, d: 318, e: 344, f: 352, g: 325, h: 340 };
    const last = new Map<string, number>();
    let alive = Object.keys(speeds);
    for (let frame = 0; frame < 60 * 12; frame++) {
      const t = (frame * DT) / 1000;
      if (frame > 60 * 5 && frame % 60 === 0) alive = alive.slice(1); // the front one falls every second
      const members = alive.map((id) => {
        const x = Math.max(SPOT, (start[id] ?? 0) - (speeds[id] ?? 0) * t);
        return foe(id, x, { speed: speeds[id] ?? 50, arrived: x <= SPOT, prominent: id === 'f' });
      });
      const places = layout.update(members, DT);
      for (const [id, p] of places) {
        const prev = last.get(id);
        if (prev !== undefined) expect(p.x, `${id} at frame ${frame}`).toBeLessThanOrEqual(prev + 1e-9);
        last.set(id, p.x);
      }
    }
  });

  it('fans a line of shooters behind its first one, all of them shooting', () => {
    const shooters = ['s1', 's2', 's3', 's4', 's5'].map((id) => foe(id, 300, { line: 170, melee: false, arrived: true }));
    const places = settle(new CrowdLayout(), shooters);
    const xs = shooters.map((m) => places.get(m.id)?.x ?? 0).sort((p, q) => p - q);
    expect(xs[0]).toBe(300);
    expect(new Set(xs).size).toBe(5);
    for (const m of shooters) expect(places.get(m.id)?.fighting).toBe(true);
  });

  it('keeps separate lines separate (the melee line and the shooters behind)', () => {
    const places = settle(new CrowdLayout(), [foe('m1', SPOT), foe('m2', SPOT), foe('s1', 315, { line: 170, melee: false, arrived: true })]);
    expect(Math.abs((places.get('m1')?.x ?? 0) - SPOT)).toBeLessThanOrEqual(4);
    expect(places.get('s1')?.x).toBe(315);
  });

  it('the back rows are drawn behind the front row', () => {
    const line = ['a', 'b', 'c', 'd', 'e'].map((id) => foe(id, SPOT));
    const places = [...settle(new CrowdLayout(), line).values()];
    const byLift = [...places].sort((p, q) => p.lift - q.lift);
    for (let i = 1; i < byLift.length; i++) expect(byLift[i]!.order).toBeLessThan(byLift[i - 1]!.order);
  });
});

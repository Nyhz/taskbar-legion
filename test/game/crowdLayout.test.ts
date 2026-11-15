import { describe, expect, it } from 'vitest';
import { CROWD_GAP_PX, CROWD_MAX_SPREAD_PX, CROWD_ROW_LIFT_PX, crowdPlaces, easeCrowd, type CrowdMember } from '@/game/render/crowdLayout';

const m = (id: string, x: number, prominent = false): CrowdMember => ({ id, x, prominent });
const drawnX = (members: CrowdMember[]): number[] => {
  const places = crowdPlaces(members);
  return members.map((e) => e.x + (places.get(e.id)?.dx ?? 0));
};

describe('enemies drawn apart', () => {
  it('leaves an enemy that stands alone where it is', () => {
    const places = crowdPlaces([m('a', 100), m('b', 160)]);
    expect(places.get('a')).toMatchObject({ dx: 0, lift: 0 });
    expect(places.get('b')).toMatchObject({ dx: 0, lift: 0 });
  });

  it('fans a pile out behind its first enemy, in two rows', () => {
    const pile = ['a', 'b', 'c', 'd', 'e'].map((id) => m(id, 200));
    const places = crowdPlaces(pile);
    const xs = drawnX(pile).sort((p, q) => p - q);
    expect(xs).toEqual([200, 200 + CROWD_GAP_PX, 200 + 2 * CROWD_GAP_PX, 200 + 3 * CROWD_GAP_PX, 200 + 4 * CROWD_GAP_PX]);
    const lifts = pile.map((e) => places.get(e.id)?.lift);
    expect(lifts.filter((l) => l === 0)).toHaveLength(3);
    expect(lifts.filter((l) => l === CROWD_ROW_LIFT_PX)).toHaveLength(2);
    // nobody is drawn in front of the contact point (towards the party)
    expect(Math.min(...xs)).toBe(200);
  });

  it('the back row is drawn behind the front row', () => {
    const pile = ['a', 'b', 'c'].map((id) => m(id, 50));
    const places = crowdPlaces(pile);
    const front = pile.filter((e) => places.get(e.id)?.lift === 0).map((e) => places.get(e.id)?.order ?? 0);
    const back = pile.filter((e) => places.get(e.id)?.lift !== 0).map((e) => places.get(e.id)?.order ?? 0);
    expect(Math.min(...front)).toBeGreaterThan(Math.max(...back));
  });

  it('gives an elite the first place of its pile: front row, at the contact point, drawn on top', () => {
    const pile = [m('a', 300), m('b', 301), m('z-elite', 302, true), m('c', 300)];
    const places = crowdPlaces(pile);
    const elite = places.get('z-elite');
    expect(302 + (elite?.dx ?? 0)).toBe(300);
    expect(elite?.lift).toBe(0);
    for (const other of ['a', 'b', 'c']) expect(elite?.order ?? 0).toBeGreaterThan(places.get(other)?.order ?? 0);
  });

  it('never spreads a big pile further than the limit', () => {
    const pile = Array.from({ length: 22 }, (_, i) => m(`e${String(i).padStart(2, '0')}`, 400));
    const xs = drawnX(pile);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(CROWD_MAX_SPREAD_PX);
  });

  it('keeps separate piles separate (the melee line and the shooters behind)', () => {
    const field = [m('m1', 100), m('m2', 100), m('s1', 215), m('s2', 215)];
    const xs = drawnX(field);
    expect(xs[0]).toBe(100);
    expect(xs[2]).toBe(215);
  });

  it('is stable: the survivors keep their order when one dies', () => {
    const before = crowdPlaces(['a', 'b', 'c', 'd'].map((id) => m(id, 10)));
    const after = crowdPlaces(['a', 'c', 'd'].map((id) => m(id, 10)));
    expect(after.get('a')).toEqual(before.get('a') === undefined ? undefined : { ...before.get('a'), order: after.get('a')?.order });
    // c and d move up one place each — by one gap, which the ease turns into a short step
    expect(Math.abs((after.get('c')?.dx ?? 0) - (before.get('c')?.dx ?? 0))).toBe(CROWD_GAP_PX);
  });

  it('eases to a new place instead of jumping', () => {
    const next = easeCrowd({ dx: 12, lift: 3 }, { dx: 6, lift: 0 }, 16);
    expect(next.dx).toBeLessThan(12);
    expect(next.dx).toBeGreaterThan(6);
    expect(easeCrowd({ dx: 6.2, lift: 0 }, { dx: 6, lift: 0 }, 16).dx).toBe(6);
  });
});

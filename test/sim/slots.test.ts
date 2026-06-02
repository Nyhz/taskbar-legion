import { describe, it, expect } from 'vitest';
import { place, removeId, entries, countFilled, sorted, type Slots } from '@/sim/slots';
import { composeItem } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import type { ItemInstance } from '@/sim/items';

function item(seed: number, tier: 0 | 1 | 2 | 3, ilvl: number): ItemInstance {
  const it = composeItem('helmet', tier, { rollSeed: seed, stageIndex: 20, chestType: 'normal', generatorVersion: 1 }, makeRng(seed));
  return { ...it, id: `i${seed}`, ilvl };
}

describe('fixed-slot containers', () => {
  it('removing leaves a hole; other items keep their index', () => {
    const a = item(1, 1, 10), b = item(2, 1, 10), c = item(3, 1, 10);
    const slots: Slots = [a, b, c];
    const after = removeId(slots, b.id);
    expect(after).toEqual([a, null, c]); // b's slot is now empty, a & c unmoved
    expect(countFilled(after)).toBe(2);
    expect(entries(after)).toEqual([a, c]);
  });

  it('placing fills the FIRST hole, not the end', () => {
    const a = item(1, 1, 10), c = item(3, 1, 10), d = item(4, 1, 10);
    const slots: Slots = [a, null, c];
    expect(place(slots, d, 20)).toEqual([a, d, c]); // d drops into the hole at index 1
  });

  it('appends when there is no hole and capacity allows; refuses when full', () => {
    const a = item(1, 1, 10), b = item(2, 1, 10);
    expect(place([a], b, 2)).toEqual([a, b]); // append
    expect(place([a, b], item(3, 1, 10), 2)).toBeNull(); // full
  });

  it('sort re-packs by tier desc then ilvl desc, dropping holes', () => {
    const t1 = item(1, 1, 30), t3 = item(2, 3, 5), t1b = item(3, 1, 40);
    const slots: Slots = [t1, null, t3, t1b];
    expect(sorted(slots)).toEqual([t3, t1b, t1]); // T3 first; among T1s, ilvl 40 before 30
  });
});

import { describe, expect, it } from 'vitest';
import { composeItem, type ItemOrigin } from '@/sim/loot';
import { generateGem } from '@/sim/gems';
import { makeRng } from '@/sim/rng';
import type { InvEntry, ItemInstance } from '@/sim/items';
import type { ItemTier } from '@/data/tiers';
import type { GemTier } from '@/data/gems';
import { CUBE_INPUT_COUNT } from '@/sim/cube';
import {
  fillMelt,
  fillSynth,
  isSynthable,
  pageOf,
  sameBatch,
  toggleMelt,
  toggleSynth,
} from '@/ui/panels/cube/cubeLogic';
import { CUBE_WING_ART } from '@/ui/panels/cube/cubeLayout';
import { WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';

const origin = (seed: number): ItemOrigin => ({
  rollSeed: seed,
  stageIndex: 30,
  chestType: 'normal',
  generatorVersion: 1,
});
let n = 0;
const piece = (tier: ItemTier, ilvl?: number): ItemInstance => {
  n += 1;
  const it = composeItem('helmet', tier, origin(n), makeRng(n), ilvl, 'knight');
  return { ...it, id: `p${n}` };
};
const gem = (tier: GemTier): InvEntry => {
  n += 1;
  return { ...generateGem({ rollSeed: n, stageIndex: 30, generatorVersion: 1 }, tier), id: `g${n}` };
};

describe('cube: what may be loaded', () => {
  it('a batch is one kind of one rarity', () => {
    const a = piece(3);
    expect(sameBatch(undefined, a)).toBe(true);
    expect(sameBatch(a, piece(3))).toBe(true);
    expect(sameBatch(a, piece(4))).toBe(false);
    expect(sameBatch(a, gem(3))).toBe(false);
    expect(isSynthable(piece(8))).toBe(false);
    expect(isSynthable(piece(7))).toBe(true);
  });

  it('toggling loads a matching entry, refuses a stranger and a tenth, and unloads on a second click', () => {
    const pool: InvEntry[] = [...Array.from({ length: 10 }, () => piece(2)), piece(5), gem(2)];
    let sel: string[] = [];
    for (const e of pool.slice(0, 9)) sel = toggleSynth(sel, pool, e);
    expect(sel).toHaveLength(CUBE_INPUT_COUNT);
    expect(toggleSynth(sel, pool, pool[9] as InvEntry)).toHaveLength(9); // full
    const few = sel.slice(0, 3);
    expect(toggleSynth(few, pool, pool[10] as InvEntry)).toEqual(few); // another rarity
    expect(toggleSynth(few, pool, pool[11] as InvEntry)).toEqual(few); // a gem among pieces
    expect(toggleSynth(few, pool, pool[0] as InvEntry)).toHaveLength(2); // unload
  });

  it('fill takes nine of the biggest group, in pool order, or nothing when no group reaches nine', () => {
    const small = Array.from({ length: 9 }, () => piece(1));
    const big = Array.from({ length: 12 }, () => piece(3));
    expect(fillSynth([...small, ...big])).toEqual(big.slice(0, 9).map((e) => e.id));
    expect(fillSynth(big.slice(0, 8))).toBeNull();
    const gems = Array.from({ length: 9 }, () => gem(2));
    expect(fillSynth([...gems, ...big.slice(0, 5)])).toEqual(gems.map((g) => g.id));
  });

  it('melting loads any nine and its fill takes the least valuable first', () => {
    const items = [piece(5, 40), piece(0, 30), piece(0, 10), piece(2, 20)];
    expect(fillMelt(items)).toEqual([items[2], items[1], items[3], items[0]].map((i) => i?.id));
    let sel: string[] = [];
    for (let i = 0; i < 11; i++) sel = toggleMelt(sel, `x${i}`);
    expect(sel).toHaveLength(CUBE_INPUT_COUNT);
    expect(toggleMelt(sel, 'x0')).toHaveLength(8);
  });

  it('pages clamp into range', () => {
    const list = Array.from({ length: 20 }, (_, i) => i);
    expect(pageOf(list, 0, 18)).toMatchObject({ pages: 2, page: 0 });
    expect(pageOf(list, 5, 18).shown).toEqual([18, 19]);
    expect(pageOf([], 3, 18)).toMatchObject({ pages: 1, page: 0, shown: [] });
  });
});

describe('cube wing box', () => {
  it('is as wide as every wing and fits above the strip', () => {
    expect(CUBE_WING_ART.width).toBe(WING_ART_WIDTH);
    expect(CUBE_WING_ART.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
  });
});

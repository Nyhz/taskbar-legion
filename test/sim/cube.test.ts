import { describe, it, expect } from 'vitest';
import {
  synthesize,
  canSynthesize,
  CUBE_INPUT_COUNT,
  itemGoldValue,
  alchemyTotal,
  canTransfigure,
  transfigureRoll,
  transfigPool,
} from '@/sim/cube';
import { composeItem } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance, GemKey, GemTier } from '@/data/gems';

function items(tier: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, n = CUBE_INPUT_COUNT): ItemInstance[] {
  return Array.from({ length: n }, (_, i) =>
    composeItem('helmet', tier, { rollSeed: 100 + i, stageIndex: 30, chestType: 'normal', generatorVersion: 1 }, makeRng(100 + i)),
  );
}

function gem(key: GemKey, tier: GemTier): GemInstance {
  return { id: `g_${key}_${tier}`, key, tier, origin: { rollSeed: 1, stageIndex: 1, generatorVersion: 1 } };
}

describe('cube synthesis', () => {
  it('needs exactly 9 same-tier items (not T8)', () => {
    expect(canSynthesize(items(3))).toBe(true);
    expect(canSynthesize(items(3, 8))).toBe(false); // wrong count
    expect(canSynthesize(items(8))).toBe(false); // T8 is the cap
    const mixed = [...items(3, 8), ...items(4, 1)];
    expect(canSynthesize(mixed)).toBe(false);
  });

  it('produces one item of the next tier, unbound', () => {
    const out = synthesize(items(3));
    expect(out).not.toBeNull();
    expect(out?.tier).toBe(4);
    expect(out?.bound).toBe(false); // no trading/bound gear in this game
  });

  it('is deterministic from the inputs', () => {
    expect(synthesize(items(2))).toEqual(synthesize(items(2)));
  });

  it('output ilvl is the median of the inputs', () => {
    const ilvls = [5, 10, 15, 20, 25, 30, 35, 40, 45]; // median = 25
    const ins = items(3).map((it, i) => ({ ...it, ilvl: ilvls[i] ?? 1 }));
    expect(synthesize(ins)?.ilvl).toBe(25);
  });
});

describe('cube alchemy', () => {
  it('values higher tier and higher ilvl more', () => {
    const [base] = items(2);
    if (base === undefined) throw new Error('no item');
    const lowTier = { ...base, tier: 1 as const, ilvl: 10 };
    const hiTier = { ...base, tier: 5 as const, ilvl: 10 };
    const hiIlvl = { ...base, tier: 1 as const, ilvl: 40 };
    expect(itemGoldValue(hiTier)).toBeGreaterThan(itemGoldValue(lowTier));
    expect(itemGoldValue(hiIlvl)).toBeGreaterThan(itemGoldValue(lowTier));
    expect(alchemyTotal([lowTier, hiTier])).toBe(itemGoldValue(lowTier) + itemGoldValue(hiTier));
  });
});

describe('cube transfiguration', () => {
  const item = () => {
    const [it] = items(3); // T3 helmet (armor) → 2 affixes
    if (it === undefined) throw new Error('no item');
    return it;
  };

  it('accepts one offensive + one defensive gem at the item tier; rejects otherwise', () => {
    const it = item(); // tier 3
    expect(canTransfigure(it, [gem('ruby', 3), gem('sapphire', 3)])).toBe(true); // off + def
    expect(canTransfigure(it, [gem('ruby', 3), gem('topaz', 3)])).toBe(false); // both offensive
    expect(canTransfigure(it, [gem('ruby', 2), gem('sapphire', 3)])).toBe(false); // wrong tier
    expect(canTransfigure(it, [gem('ruby', 3)])).toBe(false); // need two
    expect(canTransfigure({ ...it, transfigured: true }, [gem('ruby', 3), gem('sapphire', 3)])).toBe(false);
  });

  it('rolls a NEW stat (not the base or an existing affix), deterministically', () => {
    const it = item();
    const taken = new Set([...it.baseAffix.map((b) => b.key), ...it.stats.map((s) => s.key)]);
    const rolled = transfigureRoll(it, 0);
    expect(rolled).not.toBeNull();
    expect(taken.has(rolled!.key)).toBe(false); // genuinely different stat
    expect(transfigPool(it)).toContain(rolled!.key);
    expect(transfigureRoll(it, 0)).toEqual(rolled); // same item+affix → same result
  });
});

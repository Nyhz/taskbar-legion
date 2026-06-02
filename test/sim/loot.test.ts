import { describe, it, expect } from 'vitest';
import { composeItem, generateItem, rollTier, itemSubstatPool, type ItemOrigin } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import { weaponTypeFor } from '@/data/itemSlots';
import { STATS, FLEX_STATS } from '@/data/stats';
import { tierDef } from '@/data/tiers';
import { GENERATOR_VERSION } from '@/data/lootTables';

const origin = (rollSeed: number, S = 60, chestType: ItemOrigin['chestType'] = 'normal'): ItemOrigin => ({
  rollSeed,
  stageIndex: S,
  chestType,
  generatorVersion: GENERATOR_VERSION,
});

describe('loot generation (gear overhaul)', () => {
  it('a warrior sword: AD base, class-locked, substats from the sword pool', () => {
    const item = composeItem('weapon', 3, origin(1, 20), makeRng(1), undefined, 'warrior');
    expect(item.classKey).toBe('warrior');
    expect(item.baseAffix.map((b) => b.key)).toEqual(['attackDamage']); // sword base
    expect(item.stats.length).toBe(tierDef(3).extraStats); // 2
    expect(item.sockets.length).toBe(tierDef(3).sockets); // 1
    const pool = new Set(weaponTypeFor('warrior', 'weapon').pool);
    for (const s of item.stats) expect(pool.has(s.key)).toBe(true);
  });

  it('priest Wand carries a Heal Power base; Tome carries a Cooldown Reduction base', () => {
    const wand = composeItem('weapon', 5, origin(3, 30), makeRng(3), undefined, 'priest');
    expect(wand.baseAffix[0]?.key).toBe('healPower');
    const tome = composeItem('offhand', 5, origin(4, 30), makeRng(4), undefined, 'priest');
    expect(tome.baseAffix[0]?.key).toBe('cooldownReduction');
  });

  it('every generated weapon/off-hand is class-locked; armor/jewelry are class-agnostic', () => {
    for (let seed = 0; seed < 2500; seed++) {
      const it = generateItem(origin(seed, 60));
      if (it.category === 'weapon') expect(['warrior', 'ranger', 'priest']).toContain(it.classKey);
      else expect(it.classKey).toBeUndefined();
    }
  });

  it('armor base is MITIGATION only — pure armor, pure MR, or a 50-50 split (all appear)', () => {
    let pureArmor = false, pureMR = false, split = false;
    for (let seed = 0; seed < 3000; seed++) {
      const it = composeItem('chest', 8, origin(seed, 80), makeRng(seed));
      const keys = it.baseAffix.map((b) => b.key);
      for (const k of keys) expect(['armor', 'magicResist']).toContain(k); // mitigation only
      if (keys.length === 1 && keys[0] === 'armor') pureArmor = true;
      if (keys.length === 1 && keys[0] === 'magicResist') pureMR = true;
      if (keys.length === 2) split = true;
    }
    expect(pureArmor).toBe(true);
    expect(pureMR).toBe(true);
    expect(split).toBe(true);
  });

  it('armor substats are FULLY flexible — offensive, defensive AND utility all appear', () => {
    let off = false, def = false, util = false;
    for (let seed = 0; seed < 5000; seed++) {
      const it = composeItem('chest', 8, origin(seed, 80), makeRng(seed));
      for (const s of it.stats) {
        const g = STATS[s.key].group;
        if (g === 'offensive') off = true;
        if (g === 'defensive') def = true;
        if (g === 'utility') util = true;
      }
    }
    expect(off).toBe(true);
    expect(def).toBe(true);
    expect(util).toBe(true); // CDR / healPower can roll on armor (the hunting ground)
  });

  it('jewelry base is freestyle — any stat, including utility, over many rolls', () => {
    let sawUtil = false, sawOff = false, sawDef = false;
    for (let seed = 0; seed < 5000; seed++) {
      const it = composeItem('ring', 8, origin(seed, 80), makeRng(seed));
      const g = STATS[it.baseAffix[0]!.key].group;
      if (g === 'utility') sawUtil = true;
      if (g === 'offensive') sawOff = true;
      if (g === 'defensive') sawDef = true;
    }
    expect(sawUtil && sawOff && sawDef).toBe(true);
  });

  it('itemSubstatPool: weapon → its type pool; armor + jewelry → the full flex pool', () => {
    expect(itemSubstatPool({ category: 'weapon', slot: 'weapon', classKey: 'ranger' })).toEqual(weaponTypeFor('ranger', 'weapon').pool);
    expect(itemSubstatPool({ category: 'armor', slot: 'chest' }).length).toBe(FLEX_STATS.length); // 15
    expect(itemSubstatPool({ category: 'jewelry', slot: 'ring' }).length).toBe(FLEX_STATS.length);
  });

  it('never rolls jewelry at T0', () => {
    for (let seed = 0; seed < 4000; seed++) {
      const item = generateItem(origin(seed, 5));
      if (item.category === 'jewelry') expect(item.tier).toBeGreaterThan(0);
    }
  });

  it('substats are distinct, ≤4, and never duplicate a base affix', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const item = generateItem(origin(seed, 80, 'zoneBoss'));
      const keys = item.stats.map((s) => s.key);
      const baseKeys = item.baseAffix.map((b) => b.key);
      expect(keys.length).toBeLessThanOrEqual(4);
      expect(new Set(keys).size).toBe(keys.length); // distinct substats
      for (const bk of baseKeys) expect(keys).not.toContain(bk); // no substat repeats a base
    }
  });

  it('determinism: same origin → deep-equal item', () => {
    const o = origin(987654, 42, 'stageBoss');
    expect(generateItem(o)).toEqual(generateItem(o));
  });

  it('every item has populated origin (current generator) and bound:false', () => {
    const item = generateItem(origin(555, 25));
    expect(item.bound).toBe(false);
    expect(item.origin.stageIndex).toBe(25);
    expect(item.origin.generatorVersion).toBe(GENERATOR_VERSION);
    expect(item.id.length).toBeGreaterThan(0);
  });

  it('rollTier respects unlock stages (no T4<10, no T8<50) for items and gems', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 8000; i++) {
      expect(rollTier(9, 2.6, rng)).toBeLessThan(4);
    }
    for (let i = 0; i < 8000; i++) {
      expect(rollTier(49, 2.6, rng)).toBeLessThan(8);
      expect(rollTier(49, 2.6, rng, 1)).toBeLessThan(8); // gem path (minTier 1)
    }
  });
});

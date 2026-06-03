import { describe, it, expect } from 'vitest';
import { composeItem, generateItem, rollTier, itemSubstatPool, type ItemOrigin } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import { weaponTypeFor } from '@/data/itemSlots';
import { STATS, FLEX_STATS, JEWELRY_STATS } from '@/data/stats';
import { tierDef } from '@/data/tiers';
import { GENERATOR_VERSION } from '@/data/lootTables';

const origin = (rollSeed: number, S = 60, chestType: ItemOrigin['chestType'] = 'normal'): ItemOrigin => ({
  rollSeed,
  stageIndex: S,
  chestType,
  generatorVersion: GENERATOR_VERSION,
});

describe('loot generation (gear overhaul)', () => {
  it('a knight sword: AD base, class-locked, substats from the sword pool', () => {
    const item = composeItem('weapon', 3, origin(1, 20), makeRng(1), undefined, 'knight');
    expect(item.classKey).toBe('knight');
    expect(item.baseAffix.map((b) => b.key)).toEqual(['attackDamage']); // sword base
    expect(item.stats.length).toBe(tierDef(3).extraStats); // 2
    expect(item.sockets.length).toBe(tierDef(3).sockets); // 1
    const pool = new Set(weaponTypeFor('knight', 'weapon').pool);
    for (const s of item.stats) expect(pool.has(s.key)).toBe(true);
  });

  it('priest Wand + Tome both carry a Heal Power base (CDR is jewelry-only now)', () => {
    const wand = composeItem('weapon', 5, origin(3, 30), makeRng(3), undefined, 'priest');
    expect(wand.baseAffix[0]?.key).toBe('healPower');
    const tome = composeItem('offhand', 5, origin(4, 30), makeRng(4), undefined, 'priest');
    expect(tome.baseAffix[0]?.key).toBe('healPower');
  });

  it('every generated weapon/off-hand is class-locked; armor/jewelry are class-agnostic', () => {
    for (let seed = 0; seed < 2500; seed++) {
      const it = generateItem(origin(seed, 60));
      if (it.category === 'weapon') expect(['knight', 'ranger', 'priest']).toContain(it.classKey);
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
    expect(util).toBe(true); // healPower (utility scaler) can roll on armor (CDR is jewelry-only now)
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

  it('itemSubstatPool: weapon → its type pool; armor → scaler flex; jewelry → flex + crit/CDR', () => {
    expect(itemSubstatPool({ category: 'weapon', slot: 'weapon', classKey: 'ranger' })).toEqual(weaponTypeFor('ranger', 'weapon').pool);
    expect(itemSubstatPool({ category: 'armor', slot: 'chest' }).length).toBe(FLEX_STATS.length); // scalers only
    expect(itemSubstatPool({ category: 'jewelry', slot: 'ring' }).length).toBe(JEWELRY_STATS.length); // flex + crit + CDR
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

  it('rollTier respects the per-difficulty tier cap for items and gems', () => {
    const rng = makeRng(42);
    // Normal (G 1-100, cap T4): nothing above T4 ever rolls (items or the gem path).
    for (let i = 0; i < 8000; i++) {
      expect(rollTier(50, rng)).toBeLessThanOrEqual(4);
      expect(rollTier(50, rng, 1)).toBeLessThanOrEqual(4); // gem path (minTier 1)
    }
    // Hell (G 101-200, cap T5) and Inferno (G 201-300, cap T6).
    for (let i = 0; i < 8000; i++) {
      expect(rollTier(150, rng)).toBeLessThanOrEqual(5);
      expect(rollTier(250, rng)).toBeLessThanOrEqual(6);
    }
    // Torment (G 401-500, cap T8): T8 is reachable (the ~2% chase).
    let sawT8 = false;
    for (let i = 0; i < 20000 && !sawT8; i++) if (rollTier(491, rng) === 8) sawT8 = true;
    expect(sawT8).toBe(true);
  });
});

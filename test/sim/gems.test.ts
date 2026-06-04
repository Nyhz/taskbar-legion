import { describe, it, expect } from 'vitest';
import { generateGem, gemGrants } from '@/sim/gems';
import { GEM_KEYS, type GemInstance, type GemTier } from '@/data/gems';
import { itemMods } from '@/sim/loadout';
import { composeItem } from '@/sim/loot';
import { makeRng } from '@/sim/rng';

const gem = (tier: GemTier, key: GemInstance['key'] = 'ruby', stageIndex = 50): GemInstance => ({
  id: `test-${tier}`,
  key,
  tier,
  origin: { rollSeed: 1, stageIndex, generatorVersion: 1 },
});

const ENABLERS = new Set(['critChance', 'cooldownReduction', 'block', 'multistrike']);

describe('gems', () => {
  it('grants one scaler stat, the same in any socket (Ruby → attackDamage)', () => {
    expect(gemGrants(gem(1)).length).toBe(1);
    expect(gemGrants(gem(1))[0]?.key).toBe('attackDamage');
  });

  it('Diamond grants two mitigation scalers (armor + magicResist)', () => {
    expect(gemGrants(gem(1, 'diamond')).map((g) => g.key).sort()).toEqual(['armor', 'magicResist']);
  });

  it('NO gem grants a soft-capped enabler (scaler-only — keeps the slot restriction airtight)', () => {
    for (const key of GEM_KEYS) {
      for (const g of gemGrants(gem(8, key))) expect(ENABLERS.has(g.key)).toBe(false);
    }
  });

  it('higher tier grants bigger values (tier statMultiplier), not more stats', () => {
    const t1 = gemGrants(gem(1))[0]?.value ?? 0;
    const t8 = gemGrants(gem(8))[0]?.value ?? 0;
    expect(t8).toBeGreaterThan(t1);
    expect(gemGrants(gem(8)).length).toBe(gemGrants(gem(1)).length); // tier = magnitude, not count
  });

  it('grants scale with the gem level — flat strongly (Φ), percent boundedly (pctAffixIlvlMult)', () => {
    // Ruby = attackDamage (flat) → scales with Φ(gemLevel). Sapphire = critDamage (percent) → now
    // also grows with level (bounded ×0.5→×1.5, so higher-level gems feel like upgrades on % too),
    // far gentler than the flat curve and soft-capped so it can't run away.
    expect(gemGrants(gem(8, 'ruby', 100))[0]?.value ?? 0).toBeGreaterThan(gemGrants(gem(8, 'ruby', 10))[0]?.value ?? 0);
    expect(gemGrants(gem(8, 'sapphire', 100))[0]?.value ?? 0).toBeGreaterThan(gemGrants(gem(8, 'sapphire', 10))[0]?.value ?? 0);
  });

  it('generateGem is deterministic from (rollSeed, tier)', () => {
    const o = { rollSeed: 4242, stageIndex: 30, generatorVersion: 1 };
    expect(generateGem(o, 5)).toEqual(generateGem(o, 5));
  });

  it('socketed gem grants stack on top of item affixes', () => {
    const item = composeItem('helmet', 8, { rollSeed: 9, stageIndex: 50, chestType: 'normal', generatorVersion: 1 }, makeRng(9));
    const before = itemMods(item).length;
    item.sockets[0]!.gem = gem(8);
    expect(itemMods(item).length).toBeGreaterThan(before);
  });
});

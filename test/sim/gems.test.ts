import { describe, it, expect } from 'vitest';
import { generateGem, gemGrants } from '@/sim/gems';
import { gemAffixCount, type GemInstance, type GemTier } from '@/data/gems';
import { itemMods } from '@/sim/loadout';
import { composeItem } from '@/sim/loot';
import { makeRng } from '@/sim/rng';

const gem = (tier: GemTier, key: GemInstance['key'] = 'ruby', stageIndex = 50): GemInstance => ({
  id: `test-${tier}`,
  key,
  tier,
  origin: { rollSeed: 1, stageIndex, generatorVersion: 1 },
});

describe('gems', () => {
  it("signature grant is category-dependent (Ruby: armor→health, weapon→attackDamage)", () => {
    expect(gemGrants(gem(1), 'armor')[0]?.key).toBe('health');
    expect(gemGrants(gem(1), 'weapon')[0]?.key).toBe('attackDamage');
  });

  it('higher tier grants more affixes (1 at T1, 4 at T7/T8)', () => {
    expect(gemGrants(gem(1), 'armor').length).toBe(gemAffixCount(1)); // 1
    expect(gemGrants(gem(7), 'armor').length).toBe(4);
    expect(gemGrants(gem(8), 'armor').length).toBe(4);
  });

  it('higher tier grants bigger values (gemTierMult)', () => {
    const t1 = gemGrants(gem(1), 'armor')[0]?.value ?? 0;
    const t8 = gemGrants(gem(8), 'armor')[0]?.value ?? 0;
    expect(t8).toBeGreaterThan(t1);
  });

  it('flat grants scale with Φ(stageIndex); percent grants do not', () => {
    // Ruby armor entry 0 = health (flat) → scales; entry 3 = block (percent) → bounded.
    const low = gemGrants(gem(8, 'ruby', 10), 'armor');
    const high = gemGrants(gem(8, 'ruby', 100), 'armor');
    expect(high[0]?.value ?? 0).toBeGreaterThan(low[0]?.value ?? 0); // health (flat)
    expect(high[3]?.value).toBe(low[3]?.value); // block (percent) — unchanged
  });

  it('generateGem is deterministic from (rollSeed, tier)', () => {
    const o = { rollSeed: 4242, stageIndex: 30, generatorVersion: 1 };
    expect(generateGem(o, 5)).toEqual(generateGem(o, 5));
  });

  it('socketed gem grants stack on top of item affixes (can exceed 4)', () => {
    const item = composeItem('helmet', 8, { rollSeed: 9, stageIndex: 50, chestType: 'normal', generatorVersion: 1 }, makeRng(9));
    const before = itemMods(item).length;
    item.sockets[0]!.gem = gem(8);
    const after = itemMods(item).length;
    expect(after).toBeGreaterThan(before); // gem grants added on top
  });
});

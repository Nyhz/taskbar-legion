import { describe, expect, it } from 'vitest';
import { migrateEntry } from '@/sim/itemMigration';
import { perfectStatValue, statValue } from '@/sim/loot';
import { tierDef } from '@/data/tiers';
import { STATS } from '@/data/stats';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { affixShare, stageAtLevel } from '@/data/power';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';

// The power curve (generator v9, 2026-11-22 — docs/redesign/POWER_CURVE.md §7): gear from v7/v8 is brought up on
// load, never wiped. Each affix keeps how good its roll was; the item level moves from hero levels to stages.

const gem = (v: number): GemInstance => ({ id: 'g1', key: 'topaz', tier: 5, origin: { rollSeed: 3, stageIndex: 120, generatorVersion: v } });

// A v8 T8 ring at item level 110: a heal power base rolled at the TOP of its band (v8: heal power not tier-scaled,
// ×1.5 percent multiplier past level 80), a crit substat at the BOTTOM of its band (×9 tier, ×1.5), a perfect one.
const legacyPct = 1.5;
const item = (v: number): ItemInstance => ({
  id: 'i1', slot: 'ring', category: 'jewelry', tier: 8, ilvl: 110,
  baseAffix: [{ key: 'healPower', value: 5.0 * (v >= 8 ? 1 : 9) * legacyPct }],
  stats: [{ key: 'critChance', value: 1.0 * 9 * legacyPct }, { key: 'healPower', value: 45, perfect: true }],
  sockets: [{ gem: gem(v) }, { gem: null }],
  origin: { rollSeed: 1, stageIndex: 480, chestType: 'normal', generatorVersion: v },
  bound: false,
});

describe('v7/v8 gear is migrated to the power curve', () => {
  it('every affix keeps its quality, re-valued with the new formula; a perfect one stays perfect', () => {
    for (const v of [7, 8]) {
      const out = migrateEntry(item(v));
      expect(out).not.toBeNull();
      if (out === null) continue;
      const ilvl = Math.round(stageAtLevel(110));
      const budget = tierDef(8).statMultiplier;
      expect(out.ilvl).toBe(ilvl);
      expect(out.origin.generatorVersion).toBe(GENERATOR_VERSION);
      // The top of its band → the top of the new one; the bottom → the bottom.
      expect(out.baseAffix[0]?.value).toBeCloseTo(statValue('healPower', budget, ilvl, affixShare(true, 2), STATS.healPower.rollPerIlvl.max), 2);
      expect(out.stats[0]?.value).toBeCloseTo(statValue('critChance', budget, ilvl, affixShare(false, 2), STATS.critChance.rollPerIlvl.min), 2);
      expect(out.stats[1]).toMatchObject({ key: 'healPower', perfect: true, value: perfectStatValue('healPower', budget, ilvl, affixShare(false, 2)) });
      expect(out.sockets[0]?.gem?.origin.generatorVersion).toBe(GENERATOR_VERSION);
      // Once only: a migrated item is left as it is.
      expect(migrateEntry(out)).toEqual(out);
    }
  });

  it('a loose old gem only takes the new version; gear older than v7 is still a clean wipe', () => {
    expect(migrateEntry(gem(8))?.origin.generatorVersion).toBe(GENERATOR_VERSION);
    expect(migrateEntry(item(6))).toBeNull();
    expect(migrateEntry(item(GENERATOR_VERSION + 1))).toBeNull();
  });
});

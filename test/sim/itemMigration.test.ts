import { describe, expect, it } from 'vitest';
import { migrateEntry } from '@/sim/itemMigration';
import { rollStatValue, perfectStatValue } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import { tierDef } from '@/data/tiers';
import { GENERATOR_VERSION } from '@/data/lootTables';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';

// Heal power stopped riding the tier's multiplier (2026-11-21, the user's option 2): new rolls ignore it, and gear
// from generator v7 is brought up to v8 on load — its heal power divided by its tier's multiplier — never wiped.

const gem = (v: number): GemInstance => ({ id: 'g1', key: 'heal', tier: 5, origin: { rollSeed: 3, stageIndex: 120, generatorVersion: v } } as unknown as GemInstance);

const item = (v: number): ItemInstance => ({
  id: 'i1', slot: 'ring', category: 'jewelry', tier: 8, ilvl: 110,
  baseAffix: [{ key: 'healPower', value: 90 }],
  stats: [{ key: 'critChance', value: 12 }, { key: 'healPower', value: 45, perfect: true }],
  sockets: [{ gem: gem(v) }, { gem: null }],
  origin: { rollSeed: 1, stageIndex: 480, chestType: 'normal', generatorVersion: v },
  bound: false,
});

describe('heal power is not tier-scaled', () => {
  it('a roll of heal power is the same at every tier; a tier-scaled stat is not', () => {
    const at = (key: 'healPower' | 'critChance', tier: number): number => rollStatValue(key, tierDef(tier as 0).statMultiplier, 80, makeRng(9));
    expect(at('healPower', 8)).toBe(at('healPower', 0));
    expect(at('critChance', 8)).toBeGreaterThan(at('critChance', 0));
    expect(perfectStatValue('healPower', tierDef(8).statMultiplier, 80)).toBe(perfectStatValue('healPower', 1, 80));
  });

  it('v7 gear is migrated: heal power divided by its tier multiplier, everything else kept', () => {
    const mult = tierDef(8).statMultiplier;
    const out = migrateEntry(item(7));
    expect(out).not.toBeNull();
    if (out === null) return;
    expect(out.origin.generatorVersion).toBe(GENERATOR_VERSION);
    expect(out.baseAffix[0]?.value).toBeCloseTo(90 / mult, 2);
    expect(out.stats[0]).toEqual({ key: 'critChance', value: 12 });
    expect(out.stats[1]).toMatchObject({ key: 'healPower', perfect: true });
    expect(out.stats[1]?.value).toBeCloseTo(45 / mult, 2);
    expect(out.sockets[0]?.gem?.origin.generatorVersion).toBe(GENERATOR_VERSION);
    // Once only: a migrated item is left as it is.
    expect(migrateEntry(out)).toEqual(out);
  });

  it('a loose v7 gem only takes the new version; gear older than v7 is still a clean wipe', () => {
    expect(migrateEntry(gem(7))?.origin.generatorVersion).toBe(GENERATOR_VERSION);
    expect(migrateEntry(item(6))).toBeNull();
    expect(migrateEntry(item(GENERATOR_VERSION + 1))).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { migrate, buildSave } from '@/persistence/saveManager';
import { useStore } from '@/state/store';
import { isGem } from '@/sim/items';
import { generateGem } from '@/sim/gems';
import { GENERATOR_VERSION } from '@/data/lootTables';
import type { SaveV1 } from '@/persistence/saveSchema';

function fixture(): SaveV1 {
  return {
    version: 1,
    seed: 4242,
    lastSavedAt: 1000,
    progress: { globalStageIndex: 37, world: 4, stage: 7 },
    maxClearedStage: 36,
    lootRngState: 0,
    gold: 9999,
    researchPoints: 0,
    unlockedClasses: ['warrior', 'ranger'],
    partySlots: ['h0', 'h1', null],
    roster: [
      { id: 'h0', classKey: 'warrior', level: 12, exp: 5000, equipment: {}, talentPoints: 2, talents: { warrior_guard: 3 }, activeAbilities: ['warrior_guard'] },
      { id: 'h1', classKey: 'ranger', level: 9, exp: 3000, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [] },
    ],
    inventory: [],
    inventoryGems: [],
    inventorySlotUpgrades: 5,
    stash: [],
    stashPages: 3,
    stashSlotUpgrades: 4,
    techTree: { eco_gold: 4, party_size: 1 },
    chests: [{ type: 'normal', dropStage: 5, count: 3 }],
    zoneKeys: { 1: 2 },
    autoOpen: { unlocked: true, lastRunAt: 500 },
    pets: { ownedKeys: ['coin_sprite'], selectedKey: 'coin_sprite' },
    settings: { uiScale: 1.5, dockOrientation: 'bottom' },
    cube: { unlocked: false },
    online: { accountId: null, premiumCurrency: 0, premiumUntil: null },
  };
}

describe('saveManager', () => {
  it('migrate passes v1 through and rejects unknown shapes', () => {
    expect(migrate(fixture())?.version).toBe(1);
    expect(migrate(null)).toBeNull();
    expect(migrate({ version: 2 })).toBeNull();
    expect(migrate('garbage')).toBeNull();
  });

  it('migrate upgrades legacy scalar zoneKeys + chests lacking dropStage', () => {
    // A legacy v1 save: zoneKeys was a single number, chests had no dropStage. The save
    // left off at 2-7 (globalStageIndex 17, world 2).
    const legacy = { ...fixture(), progress: { globalStageIndex: 17, world: 2, stage: 7 } } as unknown as Record<string, unknown>;
    legacy.zoneKeys = 5;
    legacy.chests = [{ type: 'normal', count: 3 }];
    const out = migrate(legacy);
    expect(out?.zoneKeys).toEqual({ 2: 5 }); // banked into the world the save left off in
    expect(out?.chests).toEqual([{ type: 'normal', count: 3, dropStage: 17 }]);
    // Empty / zero legacy keys → empty record (no phantom buckets).
    expect(migrate({ ...legacy, zoneKeys: 0 })?.zoneKeys).toEqual({});
  });

  it('hydrate → buildSave round-trips the player state', () => {
    const save = fixture();
    useStore.getState().hydrate(save);
    const out = buildSave();
    expect(out.gold).toBe(save.gold);
    expect(out.seed).toBe(save.seed);
    expect(out.techTree).toEqual(save.techTree);
    expect(out.roster).toEqual(save.roster);
    expect(out.inventorySlotUpgrades).toBe(5);
    expect(out.stashPages).toBe(3);
    expect(out.stashSlotUpgrades).toBe(4);
    expect(out.zoneKeys).toEqual({ 1: 2 });
    expect(out.pets.ownedKeys).toEqual(['coin_sprite']);
    expect(out.progress.globalStageIndex).toBe(37); // resumeStage = resumeStageFor(36) (no live world in test)
    expect(out.maxClearedStage).toBe(36); // travel-unlock frontier round-trips
    expect(out.cube.unlocked).toBe(false); // forward-compat field preserved
    expect(out.online.accountId).toBeNull();
  });

  it('folds a legacy gem bag into the unified inventory on load', () => {
    // Current-generation gem: the legacy inventoryGems bag still folds into the unified
    // inventory. (Pre-overhaul gear/gems — older generatorVersion — are wiped on load.)
    const gem = generateGem({ rollSeed: 11, stageIndex: 20, generatorVersion: GENERATOR_VERSION }, 4);
    const save = { ...fixture(), inventory: [], inventoryGems: [gem] };
    useStore.getState().hydrate(save);

    const inv = useStore.getState().inventory.filter((e) => e !== null);
    expect(inv).toHaveLength(1);
    expect(inv.filter(isGem)).toHaveLength(1);

    const out = buildSave();
    expect(out.inventoryGems).toHaveLength(0); // legacy bag retired
    expect(out.inventory.filter((e) => e !== null && isGem(e))).toHaveLength(1); // gem now lives in inventory
  });
});

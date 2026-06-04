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
    lootDrawCount: 0,
    nextEntryId: 1,
    gold: 9999,
    researchPoints: 0,
    unlockedClasses: ['knight', 'ranger'],
    partySlots: ['h0', 'h1', null],
    roster: [
      { id: 'h0', classKey: 'knight', level: 12, exp: 5000, equipment: {}, talentPoints: 2, talents: { knight_guard: 3 }, activeAbilities: ['knight_guard'] },
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

  it('migrate remaps a legacy "warrior" save → "knight" (roster, unlocks, abilities, items)', () => {
    const legacy = {
      ...fixture(),
      unlockedClasses: ['warrior', 'ranger'],
      roster: [
        {
          id: 'h0', classKey: 'warrior', level: 12, exp: 5000, talentPoints: 2,
          talents: { warrior_guard: 3, warrior_bulwark: 1 },
          activeAbilities: ['warrior_guard'],
          equipment: { weapon: { id: 'w1', category: 'weapon', slot: 'weapon', classKey: 'warrior' } },
        },
      ],
      inventory: [{ id: 'w2', category: 'weapon', slot: 'offhand', classKey: 'warrior' }],
      stash: [{ id: 'w3', category: 'weapon', slot: 'weapon', classKey: 'warrior' }],
    } as unknown as Record<string, unknown>;
    const out = migrate(legacy);
    expect(out?.unlockedClasses).toEqual(['knight', 'ranger']);
    const h0 = out?.roster[0];
    expect(h0?.classKey).toBe('knight');
    expect(h0?.talents).toEqual({ knight_guard: 3, knight_bulwark: 1 });
    expect(h0?.activeAbilities).toEqual(['knight_guard']);
    const classKeyOf = (e: unknown): unknown => (e as { classKey?: unknown }).classKey;
    expect(h0?.equipment.weapon?.classKey).toBe('knight');
    expect(classKeyOf(out?.inventory[0])).toBe('knight');
    expect(classKeyOf(out?.stash[0])).toBe('knight');
  });

  it('migrate upgrades chests lacking dropStage', () => {
    // A legacy v1 save: chests had no dropStage. The save left off at 2-7 (globalStageIndex 17).
    const legacy = { ...fixture(), progress: { globalStageIndex: 17, world: 2, stage: 7 } } as unknown as Record<string, unknown>;
    legacy.chests = [{ type: 'normal', count: 3 }];
    const out = migrate(legacy);
    expect(out?.chests).toEqual([{ type: 'normal', count: 3, dropStage: 17 }]);
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

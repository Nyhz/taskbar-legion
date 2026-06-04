import { describe, it, expect, beforeEach } from 'vitest';
import { writeFrontier, readFrontier } from '@/persistence/frontierGuard';
import { reconcileFrontier } from '@/persistence/saveManager';
import { resumeStageFor } from '@/data/stageScaling';
import type { SaveV1 } from '@/persistence/saveSchema';

// Install a synchronous in-memory localStorage (the node test env only provides a
// partial/broken global, which the guard's feature-detection rightly ignores).
function installLocalStorage(): void {
  const map = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

function saveAt(seed: number, maxClearedStage: number): SaveV1 {
  return {
    version: 1,
    seed,
    lastSavedAt: 0,
    progress: { globalStageIndex: maxClearedStage, world: 1, stage: maxClearedStage },
    maxClearedStage,
    lootRngState: 0,
    lootDrawCount: 0,
    nextEntryId: 1,
    gold: 0,
    researchPoints: 0,
    unlockedClasses: ['knight'],
    partySlots: ['h0', null, null],
    roster: [],
    inventory: [],
    inventoryGems: [],
    inventorySlotUpgrades: 0,
    stash: [],
    stashPages: 1,
    stashSlotUpgrades: 0,
    techTree: {},
    chests: [],
    autoOpen: { unlocked: false, lastRunAt: 0 },
    pets: { ownedKeys: [], selectedKey: null },
    settings: { uiScale: 1, dockOrientation: 'bottom' },
    cube: { unlocked: false },
    online: { accountId: null, premiumCurrency: 0, premiumUntil: null },
  };
}

describe('frontierGuard', () => {
  beforeEach(() => installLocalStorage());

  it('writes and reads back the frontier', () => {
    writeFrontier(42, 7);
    expect(readFrontier()).toEqual({ seed: 42, maxClearedStage: 7 });
  });

  it('never lowers the frontier for the same seed (wipes drop stage, not the unlock)', () => {
    writeFrontier(42, 7);
    writeFrontier(42, 5); // retreated after a wipe
    expect(readFrontier()?.maxClearedStage).toBe(7);
  });

  it('a new seed resets the frontier', () => {
    writeFrontier(42, 7);
    writeFrontier(99, 1);
    expect(readFrontier()).toEqual({ seed: 99, maxClearedStage: 1 });
  });

  it('reconcile RAISES a stale save to the guard frontier (the dropped-async-save bug)', () => {
    // Beat stage 7 → guard records 7 synchronously. The async IndexedDB save was
    // dropped on teardown, so the loaded save is the older 30s autosave at stage 5.
    writeFrontier(42, 7);
    const stale = saveAt(42, 5);
    const fixed = reconcileFrontier(stale);
    expect(fixed?.maxClearedStage).toBe(7);
    // resume point follows the raised frontier (hydrate derives resumeStage from it)
    expect(fixed?.progress.globalStageIndex).toBe(resumeStageFor(7));
  });

  it('reconcile leaves a save alone when the guard is behind or for another seed', () => {
    writeFrontier(42, 3);
    expect(reconcileFrontier(saveAt(42, 9))?.maxClearedStage).toBe(9); // guard behind → no change
    writeFrontier(999, 50);
    expect(reconcileFrontier(saveAt(42, 9))?.maxClearedStage).toBe(9); // other seed → ignored
  });

  it('reconcile passes null through (no save)', () => {
    expect(reconcileFrontier(null)).toBeNull();
  });
});

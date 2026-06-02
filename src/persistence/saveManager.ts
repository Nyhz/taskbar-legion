import { openDB, type IDBPDatabase } from 'idb';
import type { SaveV1 } from './saveSchema';
import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { worldOf, stageInWorld, resumeStageFor } from '@/data/stageScaling';
import type { ChestType } from '@/data/chests';
import { writeFrontier, readFrontier, clearFrontier } from './frontierGuard';

// Serializes the store ⇄ SaveV1 via IndexedDB and rehydrates on load. Derived
// values (chest capacity, party-slot count, auto-open interval) are NOT stored —
// they're recomputed from techTree + pets via getBonuses (ARCHITECTURE).

const DB_NAME = 'taskbar-legion';
const STORE = 'save';
const KEY = 'v1';

let dbPromise: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

/** Project the live store + sim world into a SaveV1. `lastSavedAt` stamps now
 *  (Date.now is fine here — persistence is an edge, not the sim). */
export function buildSave(): SaveV1 {
  const s = useStore.getState();
  const world = getEngine()?.world;
  const stage = world?.globalStageIndex ?? s.resumeStage;
  return {
    version: 1,
    seed: s.seed,
    lastSavedAt: Date.now(),
    progress: { globalStageIndex: stage, world: worldOf(stage), stage: stageInWorld(stage) },
    maxClearedStage: world?.maxClearedStage ?? s.maxClearedStage,
    lootRngState: getEngine()?.lootRngState() ?? s.lootRngState,
    gold: s.gold,
    researchPoints: s.researchPoints,
    unlockedClasses: s.unlockedClasses,
    partySlots: [s.roster[0]?.id ?? null, s.roster[1]?.id ?? null, s.roster[2]?.id ?? null],
    roster: s.roster,
    inventory: s.inventory, // gems live here too now (unified InvEntry)
    inventoryGems: [], // legacy bag retired; gems are folded into `inventory`
    inventorySlotUpgrades: s.inventorySlotUpgrades,
    stash: s.stash,
    stashPages: s.stashPages,
    stashSlotUpgrades: s.stashSlotUpgrades,
    techTree: s.techRanks,
    chests: world ? world.chests.map((c) => ({ ...c })) : s.chests,
    zoneKeys: world?.zoneKeys ?? s.zoneKeys,
    autoOpen: s.autoOpen,
    pets: { ownedKeys: s.ownedPets, selectedKey: s.selectedPet },
    settings: { uiScale: s.uiScale, dockOrientation: s.dockOrientation, autoSalvage: s.autoSalvage },
    cube: { unlocked: false },
    online: { accountId: null, premiumCurrency: 0, premiumUntil: null },
  };
}

// Once a full reset starts we must STOP saving — otherwise the 30s autosave, a
// visibility/unload handler, or a progress-subscription save would re-create the very
// storage we're wiping (the frontier guard never lowers, so a single stray write of the
// old maxClearedStage permanently resurrects the old game). Latches true until reload.
let savesSuppressed = false;

export async function saveGame(): Promise<void> {
  if (savesSuppressed) return; // a reset is in progress — never re-create storage
  // Save only once the engine exists. The engine is constructed AFTER the boot
  // load+hydrate completes, so this both (a) prevents clobbering a real save with
  // default state during the async load window, and (b) — unlike a module-level
  // "ready" flag — survives Vite HMR re-evaluating this module mid-session (which
  // would otherwise silently disable saving and lose progress on the next reload).
  if (getEngine() === null) return;
  const save = buildSave();
  // SYNCHRONOUS frontier backstop FIRST — completes even if the async put below is
  // dropped on an abrupt teardown, so a just-beaten stage can never be lost.
  writeFrontier(save.seed, save.maxClearedStage);
  try {
    const d = await db();
    await d.put(STORE, save, KEY);
  } catch (err) {
    console.error('Save failed', err);
  }
}

/** Hard reset to a brand-new game: suppress all further saves, then wipe EVERY piece of
 *  persistence (the IndexedDB save + the localStorage frontier guard + settings shim) and
 *  reload. Suppressing first is essential — the unload/autosave handlers would otherwise
 *  re-stamp the frontier from in-memory state and resurrect the old progress. */
export async function resetGame(): Promise<void> {
  savesSuppressed = true; // stops autosave / visibility / unload / progress saves
  clearFrontier();
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('taskbar-legion')) localStorage.removeItem(k);
    }
  } catch {
    // private mode / no localStorage — non-fatal
  }
  try {
    (await db()).close(); // release our connection so deleteDatabase isn't blocked
  } catch {
    // ignore
  }
  dbPromise = null;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = (): void => resolve();
  });
  if (typeof location !== 'undefined') location.reload();
}

export async function loadGame(): Promise<SaveV1 | null> {
  try {
    const d = await db();
    const raw = (await d.get(STORE, KEY)) as unknown;
    return reconcileFrontier(migrate(raw));
  } catch (err) {
    console.error('Load failed', err);
    return null;
  }
}

/** Raise a loaded save's cleared-stage frontier to the synchronous localStorage
 *  guard when it ran ahead (the common case: a recent boss kill the async IndexedDB
 *  write missed). `hydrate` derives `resumeStage` from `maxClearedStage`, so lifting
 *  it here is enough to restore the unlock + resume point. */
export function reconcileFrontier(save: SaveV1 | null): SaveV1 | null {
  if (save === null) return null;
  const guard = readFrontier();
  if (guard === null || guard.seed !== save.seed) return save;
  if (guard.maxClearedStage <= save.maxClearedStage) return save;
  const stage = resumeStageFor(guard.maxClearedStage);
  return {
    ...save,
    maxClearedStage: guard.maxClearedStage,
    progress: { globalStageIndex: stage, world: worldOf(stage), stage: stageInWorld(stage) },
  };
}

/** Migration hook (ready for v2). v1 saves pass through; unknown shapes are dropped.
 *  In-place field migrations keep older v1 saves loadable:
 *   - zoneKeys: legacy single global `number` → per-zone record (bucketed into the world
 *     the save left off in, so banked keys aren't lost).
 *   - chests: legacy entries lacked `dropStage` → assume they dropped where the save
 *     left off (so their loot tier + key zone stay sensible on open). */
export function migrate(raw: unknown): SaveV1 | null {
  if (raw === null || typeof raw !== 'object') return null;
  const save = raw as Partial<SaveV1> & { zoneKeys?: unknown; chests?: unknown };
  if (save.version !== 1) {
    console.warn(`Unknown save version ${String(save.version)}; ignoring.`);
    return null;
  }
  const leftOff = save.progress?.globalStageIndex ?? 1;
  const zk = save.zoneKeys;
  if (typeof zk === 'number') save.zoneKeys = zk > 0 ? { [worldOf(leftOff)]: zk } : {};
  else if (zk === null || typeof zk !== 'object') save.zoneKeys = {};
  if (Array.isArray(save.chests)) {
    save.chests = save.chests.map((c: { type: ChestType; count: number; dropStage?: number }) => ({
      type: c.type,
      count: c.count,
      dropStage: typeof c.dropStage === 'number' ? c.dropStage : leftOff,
    }));
  }
  return save as SaveV1;
}

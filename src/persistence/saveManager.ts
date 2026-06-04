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
    lootRngState: s.lootRngState, // DEPRECATED — carried through untouched for back-compat
    lootDrawCount: getEngine()?.lootDrawCount() ?? s.lootDrawCount,
    nextEntryId: s.nextEntryId,
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

/** Ask the browser for DURABLE storage so the save isn't evicted under disk
 *  pressure or Safari's ~7-day script-storage cap (the classic "idle game lost my
 *  progress" failure). Best-effort and safe to call on every boot: an already-persisted
 *  origin short-circuits, and a denied request just leaves storage in its default
 *  best-effort mode. Never throws. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || navigator.storage?.persist === undefined) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Serialize the current game to a pretty JSON string for download/backup. */
export function exportSave(): string {
  return JSON.stringify(buildSave(), null, 2);
}

/** Replace stored progress with an imported save, then reload so the normal boot
 *  path hydrates it. Validates via `migrate`; on a bad/incompatible file it returns an
 *  error message and leaves existing storage untouched. On success it suppresses further
 *  saves (so the live autosave can't clobber the import before the reload) and resolves
 *  after triggering reload. */
export async function importSave(json: string): Promise<string | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return 'Not a valid save file (could not parse JSON).';
  }
  const save = migrate(parsed);
  if (save === null) return 'Not a compatible Taskbar Legion save.';
  savesSuppressed = true; // stop autosave / unload from overwriting the import before reload
  try {
    const d = await db();
    await d.put(STORE, save, KEY);
  } catch {
    savesSuppressed = false;
    return 'Could not write the imported save to storage.';
  }
  // Make the imported frontier authoritative (drop any stale guard from the old game).
  clearFrontier();
  writeFrontier(save.seed, save.maxClearedStage);
  if (typeof location !== 'undefined') location.reload();
  return null;
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
 *   - chests: legacy entries lacked `dropStage` → assume they dropped where the save
 *     left off (so their loot tier stays sensible on open). */
export function migrate(raw: unknown): SaveV1 | null {
  if (raw === null || typeof raw !== 'object') return null;
  const save = raw as Partial<SaveV1> & { chests?: unknown };
  if (save.version !== 1) {
    console.warn(`Unknown save version ${String(save.version)}; ignoring.`);
    return null;
  }
  // Legacy class rename: the Warrior class was renamed to Knight (class key
  // `warrior` → `knight`; ability/talent keys `warrior_*` → `knight_*`). Remap any
  // pre-rename save in place so its roster, unlocks, talents, chosen abilities AND
  // class-locked items (warrior weapons/off-hands) survive instead of being dropped /
  // crashing the UI (weaponTypeFor throws on an unknown class) on hydrate.
  const rekey = (k: string): string => (k === 'warrior' ? 'knight' : k.startsWith('warrior_') ? `knight_${k.slice('warrior_'.length)}` : k);
  // Remap an item's class lock in place (gems / classless items pass through untouched).
  const rekeyItem = (it: unknown): void => {
    if (it !== null && typeof it === 'object' && 'classKey' in it) {
      const o = it as { classKey?: unknown };
      if (typeof o.classKey === 'string') o.classKey = rekey(o.classKey);
    }
  };
  if (Array.isArray(save.unlockedClasses)) save.unlockedClasses = save.unlockedClasses.map(rekey);
  if (Array.isArray(save.roster)) {
    save.roster = save.roster.map((h) => {
      if (h.equipment !== undefined) for (const it of Object.values(h.equipment)) rekeyItem(it);
      return {
        ...h,
        classKey: rekey(h.classKey),
        activeAbilities: Array.isArray(h.activeAbilities) ? h.activeAbilities.map(rekey) : h.activeAbilities,
        talents: h.talents !== undefined ? Object.fromEntries(Object.entries(h.talents).map(([k, v]) => [rekey(k), v])) : h.talents,
      };
    });
  }
  for (const bag of [save.inventory, save.stash]) if (Array.isArray(bag)) for (const e of bag) rekeyItem(e);

  const leftOff = save.progress?.globalStageIndex ?? 1;
  if (Array.isArray(save.chests)) {
    save.chests = save.chests.map((c: { type: ChestType; count: number; dropStage?: number }) => ({
      type: c.type,
      count: c.count,
      dropStage: typeof c.dropStage === 'number' ? c.dropStage : leftOff,
    }));
  }
  return save as SaveV1;
}

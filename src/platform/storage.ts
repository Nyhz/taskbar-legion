import { openDB, type IDBPDatabase } from 'idb';
import type * as TauriFs from '@tauri-apps/plugin-fs';
import type { SaveV1 } from '@/persistence/saveSchema';
import { isTauri } from './tauri';

// The save backend, abstracted so the SAME save manager works in two homes:
//  - Browser / vitest  → IndexedDB (the original web path).
//  - Tauri desktop     → a real `save.json` file in the OS app-data dir.
// The Tauri filesystem plugin is imported DYNAMICALLY so the web bundle and the
// node test suite never load `@tauri-apps/*`. `read()` returns the raw persisted
// value (pre-migration) or null; the save manager owns migrate/reconcile.

export interface SaveStore {
  read(): Promise<unknown>;
  write(save: SaveV1): Promise<void>;
  clear(): Promise<void>;
}

// ── Web (IndexedDB) ─────────────────────────────────────────────────────────
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

const webStore: SaveStore = {
  async read() {
    const d = await db();
    return (await d.get(STORE, KEY)) as unknown;
  },
  async write(save) {
    const d = await db();
    await d.put(STORE, save, KEY);
  },
  async clear() {
    try {
      (await db()).close(); // release our handle so deleteDatabase isn't blocked
    } catch {
      // ignore
    }
    dbPromise = null;
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = req.onerror = req.onblocked = (): void => resolve();
    });
  },
};

// ── Tauri (filesystem) ──────────────────────────────────────────────────────
const SAVE_FILE = 'save.json';

async function fs(): Promise<typeof TauriFs> {
  return import('@tauri-apps/plugin-fs');
}

const tauriStore: SaveStore = {
  async read() {
    const { exists, readTextFile, BaseDirectory } = await fs();
    if (!(await exists(SAVE_FILE, { baseDir: BaseDirectory.AppData }))) return null;
    const text = await readTextFile(SAVE_FILE, { baseDir: BaseDirectory.AppData });
    return JSON.parse(text) as unknown;
  },
  async write(save) {
    const { writeTextFile, mkdir, BaseDirectory } = await fs();
    // The app-data dir may not exist on first launch — create it (idempotent).
    try {
      await mkdir('.', { baseDir: BaseDirectory.AppData, recursive: true });
    } catch {
      // already exists — non-fatal
    }
    await writeTextFile(SAVE_FILE, JSON.stringify(save), { baseDir: BaseDirectory.AppData });
  },
  async clear() {
    const { remove, exists, BaseDirectory } = await fs();
    if (await exists(SAVE_FILE, { baseDir: BaseDirectory.AppData })) {
      await remove(SAVE_FILE, { baseDir: BaseDirectory.AppData });
    }
  },
};

/** The active save backend for this runtime (Tauri fs on desktop, IndexedDB on web). */
export function saveStore(): SaveStore {
  return isTauri() ? tauriStore : webStore;
}

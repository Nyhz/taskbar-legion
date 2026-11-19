import type * as TauriFs from '@tauri-apps/plugin-fs';
import type { SaveV1 } from '@/persistence/saveSchema';
import { isTauri } from './tauri';
import { clearSaveFiles, readSaveFile, writeSaveFile, type SaveFs } from './saveFile';

// The save backend. The game ships ONLY as the Tauri desktop app, so the real backend
// is a `save.json` file in the OS app-data dir, written crash-safe with a backup beside it
// (platform/saveFile). The non-Tauri path (plain `npm run dev`
// for UI iteration, and the vitest node suite) gets an EPHEMERAL in-memory store — there
// is no browser persistence target anymore. The Tauri fs plugin is imported DYNAMICALLY
// so the dev bundle and the node tests never load `@tauri-apps/*`. `read()` returns the
// raw persisted value (pre-migration) or null; the save manager owns migrate/reconcile.

export interface SaveStore {
  read(): Promise<unknown>;
  write(save: SaveV1): Promise<void>;
  clear(): Promise<void>;
}

// ── Tauri (filesystem) ──────────────────────────────────────────────────────
// Written through platform/saveFile: a temporary file renamed into place, the previous save kept as a backup.

async function fs(): Promise<typeof TauriFs> {
  return import('@tauri-apps/plugin-fs');
}

/** The Tauri fs plugin as the save file's minimal API, every path in the app-data dir. */
async function appDataFs(): Promise<SaveFs> {
  const { exists, readTextFile, writeTextFile, rename, remove, BaseDirectory } = await fs();
  const at = { baseDir: BaseDirectory.AppData };
  return {
    exists: (name) => exists(name, at),
    readText: (name) => readTextFile(name, at),
    writeText: (name, text) => writeTextFile(name, text, at),
    rename: (from, to) => rename(from, to, { oldPathBaseDir: BaseDirectory.AppData, newPathBaseDir: BaseDirectory.AppData }),
    remove: (name) => remove(name, at),
  };
}

const tauriStore: SaveStore = {
  async read() {
    return readSaveFile(await appDataFs(), (message) => console.warn(message));
  },
  async write(save) {
    const { mkdir } = await fs();
    // The app-data dir is NOT auto-created by Tauri, and writeTextFile won't create parent
    // dirs — so on a fresh install the dir is missing and the write fails (ENOENT). On macOS
    // `mkdir('.')` did NOT create it (saves silently lost → "Start Game" every launch);
    // mkdir'ing the RESOLVED absolute path does. See tauri discussion #11279.
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      await mkdir(await appDataDir(), { recursive: true });
    } catch {
      // already exists — non-fatal
    }
    await writeSaveFile(await appDataFs(), JSON.stringify(save));
  },
  async clear() {
    await clearSaveFiles(await appDataFs());
  },
};

// ── Non-Tauri fallback (dev server / vitest) ──────────────────────────────────
// Ephemeral: lets `npm run dev` and the test suite run without a filesystem. Does NOT
// survive a reload — the desktop app is the only persistent target.
let memory: SaveV1 | null = null;
const memoryStore: SaveStore = {
  read: () => Promise.resolve(memory),
  write: (save) => {
    memory = save;
    return Promise.resolve();
  },
  clear: () => {
    memory = null;
    return Promise.resolve();
  },
};

/** The active save backend for this runtime (Tauri fs on desktop, in-memory otherwise). */
export function saveStore(): SaveStore {
  return isTauri() ? tauriStore : memoryStore;
}

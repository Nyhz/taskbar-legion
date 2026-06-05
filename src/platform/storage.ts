import type * as TauriFs from '@tauri-apps/plugin-fs';
import type { SaveV1 } from '@/persistence/saveSchema';
import { isTauri } from './tauri';

// The save backend. The game ships ONLY as the Tauri desktop app, so the real backend
// is a `save.json` file in the OS app-data dir. The non-Tauri path (plain `npm run dev`
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

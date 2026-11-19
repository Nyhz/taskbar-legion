// The save FILE, written so that a crash, a forced quit or a power cut in the middle of a save can never destroy
// the game. Pure logic over a minimal file API (`SaveFs`) — the Tauri fs plugin in the app (platform/storage), an
// in-memory fake in the tests.
//
//   write: the new save goes to `save.json.tmp` first; then the previous save becomes `save.json.bak` and the
//          temporary file is renamed into place. A rename replaces its target in one step, so at every moment
//          there is a whole save on disk: the old one, the new one, or — between the two renames — the backup.
//   read:  `save.json` if it reads as a save, else `save.json.bak` (a save cut short, or a crash between the two
//          renames, falls back to the previous one — at most one autosave older).
//
// Before 2026-11-19 the save was rewritten in place: a quit mid-write left a truncated file, the game started
// over at its title, and the next autosave wrote the fresh game over what was left.

/** The few file operations a save needs; every path is a bare file name in the app's data directory. */
export interface SaveFs {
  exists(name: string): Promise<boolean>;
  readText(name: string): Promise<string>;
  writeText(name: string, text: string): Promise<void>;
  /** Moves `from` to `to`, replacing `to` if it exists. */
  rename(from: string, to: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export const SAVE_FILE = 'save.json';
export const SAVE_TMP = `${SAVE_FILE}.tmp`;
export const SAVE_BAK = `${SAVE_FILE}.bak`;

/** Writes `text` as the save without ever leaving the disk without a whole one. */
export async function writeSaveFile(fs: SaveFs, text: string): Promise<void> {
  await fs.writeText(SAVE_TMP, text);
  if (await fs.exists(SAVE_FILE)) await fs.rename(SAVE_FILE, SAVE_BAK);
  await fs.rename(SAVE_TMP, SAVE_FILE);
}

/** The saved value (parsed JSON, before migration) from the save or its backup, or null when there is neither.
 *  Throws only when files exist and none of them reads as a save. */
export async function readSaveFile(fs: SaveFs, warn: (message: string) => void = () => {}): Promise<unknown> {
  let found = false;
  for (const name of [SAVE_FILE, SAVE_BAK]) {
    if (!(await fs.exists(name))) continue;
    found = true;
    try {
      const value = JSON.parse(await fs.readText(name)) as unknown;
      if (typeof value === 'object' && value !== null) {
        if (name === SAVE_BAK) warn(`${SAVE_FILE} is missing or unreadable; loaded the backup (${SAVE_BAK}).`);
        return value;
      }
    } catch {
      // cut short or corrupt: try the next one
    }
  }
  if (found) throw new Error(`Neither ${SAVE_FILE} nor ${SAVE_BAK} could be read.`);
  return null;
}

/** Removes the save, its backup and any temporary file left over (a new game). */
export async function clearSaveFiles(fs: SaveFs): Promise<void> {
  for (const name of [SAVE_FILE, SAVE_BAK, SAVE_TMP]) {
    if (await fs.exists(name)) await fs.remove(name);
  }
}

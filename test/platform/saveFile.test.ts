import { describe, it, expect } from 'vitest';
import { clearSaveFiles, readSaveFile, writeSaveFile, SAVE_BAK, SAVE_FILE, SAVE_TMP, type SaveFs } from '@/platform/saveFile';

// The save file must survive a crash at ANY point of a save (src/platform/saveFile.ts): an in-memory disk whose
// n-th operation "crashes" (throws, and a write leaves only half its text behind, as a killed process would).

class FakeDisk implements SaveFs {
  files = new Map<string, string>();
  ops = 0;
  crashAt = Number.POSITIVE_INFINITY;

  private step(): boolean {
    this.ops += 1;
    return this.ops === this.crashAt;
  }
  exists(name: string): Promise<boolean> {
    return Promise.resolve(this.files.has(name));
  }
  readText(name: string): Promise<string> {
    const text = this.files.get(name);
    return text === undefined ? Promise.reject(new Error(`no ${name}`)) : Promise.resolve(text);
  }
  writeText(name: string, text: string): Promise<void> {
    if (this.step()) {
      this.files.set(name, text.slice(0, Math.floor(text.length / 2))); // cut short
      return Promise.reject(new Error('crash'));
    }
    this.files.set(name, text);
    return Promise.resolve();
  }
  rename(from: string, to: string): Promise<void> {
    if (this.step()) return Promise.reject(new Error('crash'));
    const text = this.files.get(from);
    if (text === undefined) return Promise.reject(new Error(`no ${from}`));
    this.files.delete(from);
    this.files.set(to, text);
    return Promise.resolve();
  }
  remove(name: string): Promise<void> {
    this.files.delete(name);
    return Promise.resolve();
  }
}

const save = (stage: number): string => JSON.stringify({ version: 1, maxClearedStage: stage, heroes: ['knight'] });
const stageOf = (value: unknown): number => (value as { maxClearedStage: number }).maxClearedStage;

describe('the save file', () => {
  it('writes and reads back, keeping the previous save as a backup', async () => {
    const disk = new FakeDisk();
    await writeSaveFile(disk, save(10));
    await writeSaveFile(disk, save(11));
    expect(stageOf(await readSaveFile(disk))).toBe(11);
    expect(stageOf(JSON.parse(disk.files.get(SAVE_BAK) ?? ''))).toBe(10);
    expect(disk.files.has(SAVE_TMP)).toBe(false);
  });

  it('has no save at all on a fresh install', async () => {
    expect(await readSaveFile(new FakeDisk())).toBeNull();
  });

  it('a crash at any step of a save loses at most that save: the game loads the one before', async () => {
    // A save is three operations here (write the temporary file, keep the old save as the backup, rename the new
    // one into place); crash at each of them in turn.
    for (let crashAt = 1; crashAt <= 3; crashAt++) {
      const disk = new FakeDisk();
      await writeSaveFile(disk, save(10));
      await writeSaveFile(disk, save(11));
      disk.ops = 0;
      disk.crashAt = crashAt;
      await expect(writeSaveFile(disk, save(12))).rejects.toThrow('crash');
      disk.crashAt = Number.POSITIVE_INFINITY;
      const warnings: string[] = [];
      const loaded = await readSaveFile(disk, (m) => warnings.push(m));
      expect(stageOf(loaded)).toBe(11); // the last whole save, never a half-written one
      // …and the next save goes through as usual.
      await writeSaveFile(disk, save(12));
      expect(stageOf(await readSaveFile(disk))).toBe(12);
      expect(warnings.length).toBeLessThanOrEqual(1);
    }
  });

  it('falls back to the backup when the save itself is cut short or corrupt', async () => {
    const disk = new FakeDisk();
    await writeSaveFile(disk, save(20));
    await writeSaveFile(disk, save(21));
    disk.files.set(SAVE_FILE, '{"version":1,"maxCle'); // what an in-place write killed half-way left behind
    const warnings: string[] = [];
    expect(stageOf(await readSaveFile(disk, (m) => warnings.push(m)))).toBe(20);
    expect(warnings).toHaveLength(1);
  });

  it('throws when files exist and none of them reads as a save (not the same as having no save)', async () => {
    const disk = new FakeDisk();
    disk.files.set(SAVE_FILE, 'garbage');
    disk.files.set(SAVE_BAK, '{"cut');
    await expect(readSaveFile(disk)).rejects.toThrow();
  });

  it('a new game clears the save, its backup and a stray temporary file', async () => {
    const disk = new FakeDisk();
    await writeSaveFile(disk, save(1));
    await writeSaveFile(disk, save(2));
    disk.files.set(SAVE_TMP, 'left over');
    await clearSaveFiles(disk);
    expect([...disk.files.keys()]).toEqual([]);
  });
});

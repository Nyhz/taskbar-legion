import { describe, expect, it } from 'vitest';
import { saveFileName } from '@/ui/options/saveBackup';

describe('save backup file name', () => {
  it('is the game, the day and .json — safe on every file system', () => {
    const name = saveFileName();
    expect(name).toMatch(/^taskbar-legion-save-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

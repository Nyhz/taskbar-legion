import { describe, expect, it } from 'vitest';
import { sanitizePets } from '@/persistence/sanitizePets';

describe('sanitizePets (loading the pets of a save)', () => {
  it('a save from before the ranks loads with nothing counted: every pet at the start of rank 1', () => {
    expect(sanitizePets({ ownedKeys: ['scholar_owl'], selectedKey: 'scholar_owl' })).toEqual({
      ownedKeys: ['scholar_owl'],
      selectedKey: 'scholar_owl',
      progress: { scholar_owl: 0 },
    });
  });

  it('keeps the progress of owned pets and drops the rest', () => {
    const loaded = sanitizePets({
      ownedKeys: ['coin_sprite', 'hoarder'],
      selectedKey: 'hoarder',
      progress: { coin_sprite: 1234.5, hoarder: -3, lucky_cat: 99, ghost_pet: 5 },
    });
    expect(loaded.progress).toEqual({ coin_sprite: 1234.5, hoarder: 0 });
    expect(loaded.selectedKey).toBe('hoarder');
  });

  it('drops keys the game no longer has, duplicates and junk; a stale companion falls back to the first pet', () => {
    const loaded = sanitizePets({
      ownedKeys: ['ghost_pet', 'lucky_cat', 'lucky_cat', 7, null],
      selectedKey: 'ghost_pet',
      progress: 'nonsense',
    });
    expect(loaded).toEqual({ ownedKeys: ['lucky_cat'], selectedKey: 'lucky_cat', progress: { lucky_cat: 0 } });
    expect(sanitizePets({})).toEqual({ ownedKeys: [], selectedKey: null, progress: {} });
    expect(sanitizePets({ ownedKeys: ['time_imp'], progress: { time_imp: Number.NaN } }).progress).toEqual({ time_imp: 0 });
  });
});

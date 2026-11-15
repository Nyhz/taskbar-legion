import { describe, expect, it } from 'vitest';
import { STASH_MAX_SLOTS, STASH_PER_PAGE } from '@/data/inventory';
import { composeItem, type ItemOrigin } from '@/sim/loot';
import { generateGem } from '@/sim/gems';
import { makeRng } from '@/sim/rng';
import type { Slots } from '@/sim/slots';
import {
  STASH_COLS,
  STASH_FILTERS,
  stashLens,
  stashRows,
  stashWindowArt,
  stashWindowArtMax,
} from '@/ui/panels/stash/stashLayout';
import { WING_ART_WIDTH, WING_COLS, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';

const origin = (seed: number): ItemOrigin => ({
  rollSeed: seed,
  stageIndex: 20,
  chestType: 'normal',
  generatorVersion: 1,
});
const item = (slot: Parameters<typeof composeItem>[0], seed: number) =>
  composeItem(slot, 3, origin(seed), makeRng(seed), undefined, 'knight');
const gem = (seed: number) => generateGem({ rollSeed: seed, stageIndex: 20, generatorVersion: 1 }, 2);

describe('stash lens', () => {
  const helmet = item('helmet', 1);
  const sword = item('weapon', 2);
  const ring = item('ring', 3);
  const ruby = gem(4);
  const stash: Slots = [helmet, null, sword, null, null, ring, ruby];

  it('"all" is the stash itself: holes stay, so a cell index is a stash index', () => {
    expect(stashLens(stash, 'all')).toBe(stash);
  });

  it('a category compacts to the matching gear; "gems" to the loose gems', () => {
    expect(stashLens(stash, 'armor')).toEqual([helmet]);
    expect(stashLens(stash, 'weapon')).toEqual([sword]);
    expect(stashLens(stash, 'jewelry')).toEqual([ring]);
    expect(stashLens(stash, 'gems')).toEqual([ruby]);
  });

  it('the five filters partition what the stash holds', () => {
    const held = stash.filter((e) => e !== null).length;
    const seen = STASH_FILTERS.filter((f) => f !== 'all').reduce((n, f) => n + stashLens(stash, f).length, 0);
    expect(seen).toBe(held);
  });
});

describe('stash layout', () => {
  it("has a fixed width — the wing's, six cells edge to edge — and grows in rows as slots are bought", () => {
    expect(STASH_COLS).toBe(WING_COLS);
    expect(STASH_COLS).toBe(6);
    expect(stashRows(STASH_PER_PAGE)).toBe(5); // the base page: 6 × 5, no ragged row
    expect(stashRows(STASH_PER_PAGE) * STASH_COLS).toBe(STASH_PER_PAGE);
    expect(stashRows(STASH_PER_PAGE + STASH_MAX_SLOTS)).toBe(9);
    for (let n = STASH_PER_PAGE; n <= STASH_PER_PAGE + STASH_MAX_SLOTS; n++) {
      expect(stashRows(n) * STASH_COLS).toBeGreaterThanOrEqual(n); // every slot has a cell
      expect((stashRows(n) - 1) * STASH_COLS).toBeLessThan(n); // and no row is empty
      expect(stashWindowArt(n).width).toBe(WING_ART_WIDTH);
      expect(stashWindowArt(n).height).toBeLessThanOrEqual(stashWindowArtMax().height);
    }
  });

  it('even with every slot bought it is no taller than a wing may be', () => {
    expect(stashWindowArtMax().height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
  });
});

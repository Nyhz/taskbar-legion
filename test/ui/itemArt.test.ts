import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FALLBACK_GEM_ART,
  FALLBACK_ITEM_ART,
  artRankForTier,
  bigArtStem,
  cellCrestStem,
  classCrestStem,
  frameArtStem,
  gemArtStem,
  itemArtStem,
  slotGhostStem,
} from '@/ui/itemArt';
import { SLOT_KEYS } from '@/data/itemSlots';
import { CLASS_KEYS } from '@/data/classes';
import { GEM_KEYS } from '@/data/gems';

// Every stem the mapping can produce must be a file the pipeline exported (src/assets/ui).
const EXPORTED = new Set(
  readdirSync(fileURLToPath(new URL('../../src/assets/ui', import.meta.url)))
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.slice(0, -'.png'.length)),
);
const TIERS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

describe('item art', () => {
  it('the drawing rank follows the rarity: T0 → 1 · T1–T2 → 2 · T3–T4 → 3 · T5–T7 → 4 · T8 → 5', () => {
    expect(TIERS.map(artRankForTier)).toEqual([1, 2, 2, 3, 3, 4, 4, 4, 5]);
    expect(artRankForTier(-1)).toBe(1);
    expect(artRankForTier(Number.NaN)).toBe(1);
    expect(artRankForTier(99)).toBe(5);
  });

  it('every slot × class × tier maps to a picture that exists', () => {
    for (const slot of SLOT_KEYS) {
      for (const classKey of [...CLASS_KEYS, undefined]) {
        for (const tier of TIERS) {
          const stem = itemArtStem({ slot, tier, ...(classKey !== undefined ? { classKey } : {}) });
          expect(EXPORTED.has(stem), `${slot} / ${classKey ?? 'no class'} / T${tier} → ${stem}`).toBe(true);
        }
        expect(EXPORTED.has(slotGhostStem(slot, classKey))).toBe(true);
      }
    }
  });

  it('armour is drawn in the family of its class; without a class it falls back to plate', () => {
    expect(itemArtStem({ slot: 'helmet', tier: 3, classKey: 'knight' })).toBe('sm_helmet_plate_3');
    expect(itemArtStem({ slot: 'helmet', tier: 3, classKey: 'ranger' })).toBe('sm_helmet_leather_3');
    expect(itemArtStem({ slot: 'boots', tier: 8, classKey: 'priest' })).toBe('sm_boots_cloth_5');
    expect(itemArtStem({ slot: 'chest', tier: 0 })).toBe('sm_chest_plate_1');
  });

  it("weapons and off-hands are drawn as their class's type; jewelry by slot", () => {
    expect(itemArtStem({ slot: 'weapon', tier: 5, classKey: 'knight' })).toBe('sm_sword_4');
    expect(itemArtStem({ slot: 'offhand', tier: 5, classKey: 'knight' })).toBe('sm_shield_4');
    expect(itemArtStem({ slot: 'weapon', tier: 1, classKey: 'ranger' })).toBe('sm_bow_2');
    expect(itemArtStem({ slot: 'offhand', tier: 1, classKey: 'ranger' })).toBe('sm_quiver_2');
    expect(itemArtStem({ slot: 'weapon', tier: 7, classKey: 'priest' })).toBe('sm_wand_4');
    expect(itemArtStem({ slot: 'offhand', tier: 7, classKey: 'priest' })).toBe('sm_tome_4');
    expect(itemArtStem({ slot: 'ring', tier: 4, classKey: 'knight' })).toBe('sm_ring_3');
    expect(itemArtStem({ slot: 'amulet', tier: 4 })).toBe('sm_amulet_3');
  });

  it('never throws: stale slots, classes and tiers get a picture that exists', () => {
    for (const weird of [
      { slot: 'cape', tier: 3 },
      { slot: 'weapon', tier: 3, classKey: 'warrior' },
      { slot: 'helmet', tier: 3, classKey: 'mage' },
      { slot: 'ring', tier: Number.NaN },
    ]) {
      expect(EXPORTED.has(itemArtStem(weird))).toBe(true);
    }
    expect(itemArtStem({ slot: 'cape', tier: 3 })).toBe(FALLBACK_ITEM_ART);
    expect(itemArtStem({ slot: 'weapon', tier: 3, classKey: 'warrior' })).toBe('sm_sword_3');
  });

  it('gems, frames and crests', () => {
    for (const key of GEM_KEYS) expect(EXPORTED.has(gemArtStem({ key }))).toBe(true);
    expect(gemArtStem({ key: 'ruby' })).toBe('sm_gem_ruby');
    expect(gemArtStem({ key: 'opal' })).toBe(FALLBACK_GEM_ART);
    for (const tier of TIERS) expect(EXPORTED.has(frameArtStem(tier))).toBe(true);
    expect(frameArtStem(42)).toBe('smframe_8');
    expect(frameArtStem(Number.NaN)).toBe('smframe_0');
    for (const classKey of CLASS_KEYS) expect(EXPORTED.has(classCrestStem(classKey) ?? '')).toBe(true);
    expect(classCrestStem(undefined)).toBeUndefined();
    expect(classCrestStem('mage')).toBeUndefined();
  });

  it('the big drawing and the small crest of a cell exist for everything the mapping can produce', () => {
    for (const slot of SLOT_KEYS) {
      for (const classKey of [...CLASS_KEYS, undefined]) {
        for (const tier of TIERS) {
          const stem = itemArtStem({ slot, tier, ...(classKey !== undefined ? { classKey } : {}) });
          expect(EXPORTED.has(bigArtStem(stem)), bigArtStem(stem)).toBe(true);
        }
      }
    }
    for (const classKey of CLASS_KEYS) {
      const crest = cellCrestStem(classKey);
      expect(crest !== undefined && EXPORTED.has(crest), `${classKey} → ${crest}`).toBe(true);
    }
    expect(cellCrestStem('nobody')).toBeUndefined();
    for (const mark of ['mark_well', 'mark_buy', 'mark_star']) expect(EXPORTED.has(mark), mark).toBe(true);
  });
});

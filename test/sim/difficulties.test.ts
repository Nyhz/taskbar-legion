import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_KEYS,
  DIFFICULTIES,
  MAX_GLOBAL_STAGE,
  difficultyIndexOf,
  difficultyOf,
  localStageOf,
  worldInDifficulty,
  stageInWorldOf,
  isWorldBossStage,
  isFinalStage,
  globalStageOf,
  stageLabelOf,
} from '@/data/difficulties';

// The finite-G decomposition (DIFFICULTY.md §2): G = d·100 + (w-1)·10 + p, G∈[1..500].

describe('difficulty drop tables (LOCKED)', () => {
  it('every difficulty table sums to 100', () => {
    for (const k of DIFFICULTY_KEYS) {
      const sum = DIFFICULTIES[k].tierWeights.reduce((a, b) => a + b, 0);
      expect(sum).toBe(100);
    }
  });

  it('tier caps climb T4→T8 and only the cap+below are in-pool', () => {
    expect(DIFFICULTIES.normal.tierCap).toBe(4);
    expect(DIFFICULTIES.torment.tierCap).toBe(8);
    for (const k of DIFFICULTY_KEYS) {
      const def = DIFFICULTIES[k];
      // nothing above the cap drops
      for (let t = def.tierCap + 1; t <= 8; t++) expect(def.tierWeights[t] ?? 0).toBe(0);
      // the cap itself is the rare chase (in-pool, small)
      expect(def.tierWeights[def.tierCap]).toBeGreaterThan(0);
      expect(def.tierWeights[def.tierCap]).toBeLessThanOrEqual(3);
    }
  });
});

describe('finite global-stage decomposition', () => {
  it('difficultyIndexOf maps the five 100-stage bands (and clamps)', () => {
    expect(difficultyIndexOf(1)).toBe(0);
    expect(difficultyIndexOf(100)).toBe(0);
    expect(difficultyIndexOf(101)).toBe(1);
    expect(difficultyIndexOf(300)).toBe(2);
    expect(difficultyIndexOf(500)).toBe(4);
    expect(difficultyIndexOf(501)).toBe(4); // clamp past the end
    expect(difficultyIndexOf(0)).toBe(0); // clamp before the start
  });

  it('local stage / world / stage-in-world decompose correctly', () => {
    expect(localStageOf(101)).toBe(1);
    expect(localStageOf(250)).toBe(50);
    expect(worldInDifficulty(1)).toBe(1);
    expect(worldInDifficulty(11)).toBe(2);
    expect(worldInDifficulty(100)).toBe(10);
    expect(worldInDifficulty(101)).toBe(1);
    expect(stageInWorldOf(10)).toBe(10);
    expect(stageInWorldOf(11)).toBe(1);
    expect(stageInWorldOf(500)).toBe(10);
  });

  it('world-boss + final-stage predicates', () => {
    expect(isWorldBossStage(10)).toBe(true);
    expect(isWorldBossStage(9)).toBe(false);
    expect(isWorldBossStage(100)).toBe(true);
    expect(isWorldBossStage(500)).toBe(true);
    expect(isFinalStage(500)).toBe(true);
    expect(isFinalStage(499)).toBe(false);
    expect(MAX_GLOBAL_STAGE).toBe(500);
  });

  it('globalStageOf is the inverse of the decomposition', () => {
    expect(globalStageOf(0, 1, 1)).toBe(1);
    expect(globalStageOf(1, 1, 1)).toBe(101);
    expect(globalStageOf(4, 10, 10)).toBe(500);
    for (const g of [1, 47, 100, 101, 247, 350, 499, 500]) {
      const d = difficultyIndexOf(g), w = worldInDifficulty(g), p = stageInWorldOf(g);
      expect(globalStageOf(d, w, p)).toBe(g);
    }
  });

  it('stageLabelOf shows difficulty + local world-stage', () => {
    expect(stageLabelOf(1)).toBe('Normal 1-1');
    expect(stageLabelOf(101)).toBe('Hell 1-1');
    expect(stageLabelOf(247)).toBe('Inferno 5-7');
    expect(stageLabelOf(500)).toBe('Torment 10-10');
    expect(difficultyOf(247).name).toBe('Inferno');
  });
});

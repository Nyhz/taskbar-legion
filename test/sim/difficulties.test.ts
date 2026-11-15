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
  tierWeightsAt,
  STARTER_TIER_WEIGHTS,
} from '@/data/difficulties';

// The per-world ladder (DIFFICULTY.md §4, user decision 2026-11-15): a difficulty climbs from the previous one's
// table to its own across its ten worlds.
describe('the per-world drop ladder', () => {
  const sum = (ws: readonly number[]): number => ws.reduce((a, b) => a + b, 0);

  it('Normal opens on the starter table: nothing epic or legendary in its first world', () => {
    for (let S = 1; S <= 10; S++) {
      expect(tierWeightsAt(S)).toEqual([...STARTER_TIER_WEIGHTS]);
      expect(tierWeightsAt(S)[3]).toBe(0);
      expect(tierWeightsAt(S)[4]).toBe(0);
    }
    expect(sum(STARTER_TIER_WEIGHTS)).toBe(100);
  });

  it('a difficulty reaches its own table only in its last world, and the next one starts there', () => {
    for (let d = 0; d < DIFFICULTY_KEYS.length; d++) {
      const key = DIFFICULTY_KEYS[d];
      if (key === undefined) continue;
      const own = DIFFICULTIES[key].tierWeights;
      const lastWorld = d * 100 + 91;
      tierWeightsAt(lastWorld).forEach((w, t) => expect(w).toBeCloseTo(own[t] ?? 0, 9));
      if (d + 1 < DIFFICULTY_KEYS.length) tierWeightsAt((d + 1) * 100 + 1).forEach((w, t) => expect(w).toBeCloseTo(own[t] ?? 0, 9));
    }
  });

  it('every world rolls a full table, and the top rarity climbs world by world', () => {
    for (let G = 1; G <= MAX_GLOBAL_STAGE; G += 10) expect(sum(tierWeightsAt(G))).toBeCloseTo(100, 9);
    for (let d = 0; d < DIFFICULTY_KEYS.length; d++) {
      const key = DIFFICULTY_KEYS[d];
      if (key === undefined) continue;
      const cap = DIFFICULTIES[key].tierCap;
      expect(tierWeightsAt(d * 100 + 1)[cap]).toBe(0); // absent in the first world
      for (let w = 2; w <= 10; w++) {
        expect(tierWeightsAt(d * 100 + (w - 1) * 10 + 1)[cap] ?? 0).toBeGreaterThan(tierWeightsAt(d * 100 + (w - 2) * 10 + 1)[cap] ?? 0);
      }
      expect(tierWeightsAt(d * 100 + 91)[cap]).toBeCloseTo(2, 9); // its 2 % in the last
    }
  });
});

// The finite-G decomposition (DIFFICULTY.md §2): G = d·100 + (w-1)·10 + p, G∈[1..500].

describe('difficulty drop tables (each is the table of its last world)', () => {
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

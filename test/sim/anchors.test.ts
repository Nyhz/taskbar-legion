import { describe, it, expect } from 'vitest';
import { enemyHp, stageBossHp, zoneBossHp, tunePoint, ELITE_HP_MULT, NORMAL_TRASH_HP_MULT, TRASH_HP_FRACTION, TUNE_POINTS, GRUNT_HP_TUNE, STAGE_BOSS_HP_TUNE, TRASH_DMG_TUNE, MAX_LEVEL } from '@/data/stageScaling';
import { ENEMY_KINDS } from '@/data/enemies';
import { getBonuses } from '@/sim/bonuses';
import { GRUNT_HITS, STAGE_BOSS_SEC, gruntHp, gruntHits, measureStageBoss } from './probe/anchors';
import { REFERENCE_TOP_HIT, REFERENCE_BOSS_DPS, anchorStage } from './probe/anchorReference';
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, runParty } from './probe/loop';

// THE TOUGHNESS ANCHORS (user, 2026-11-15): a normal enemy survives 2–3 hits of an on-gear hero, a stage boss
// lasts 5–10 seconds against the on-gear party, at every world of every difficulty. "On-gear" is the probe's
// average player at that point; what it did when the tables were tuned is recorded in probe/anchorReference.

const POINTS = Array.from({ length: TUNE_POINTS }, (_, p) => p).filter((p) => p !== 9); // 1-10 is the world boss's stage

describe('toughness anchors — the tables against the on-gear party', () => {
  it('a grunt takes 2–3 basic hits of the hardest hitter at every tuning point: never a one-shot', () => {
    for (const p of POINTS) {
      const hits = gruntHp(anchorStage(p)) / (REFERENCE_TOP_HIT[p] ?? Number.NaN);
      // Normal is the stroll (data/stageScaling NORMAL_TRASH_HP_MULT): there a grunt may fall to one or two hits.
      const min = anchorStage(p) <= 100 ? GRUNT_HITS.min * NORMAL_TRASH_HP_MULT : GRUNT_HITS.min;
      expect(hits, `point ${p} (stage ${anchorStage(p)})`).toBeGreaterThanOrEqual(min);
      expect(hits, `point ${p} (stage ${anchorStage(p)})`).toBeLessThanOrEqual(GRUNT_HITS.max);
    }
  });

  it('an elite takes about ten to twelve, and every kind of enemy at least a hit and a half', () => {
    expect(GRUNT_HITS.target * ELITE_HP_MULT).toBeGreaterThanOrEqual(10);
    expect(GRUNT_HITS.target * ELITE_HP_MULT).toBeLessThanOrEqual(12);
    const grunt = ENEMY_KINDS.find((k) => k.key === 'grunt');
    expect(grunt?.hpMult).toBe(1); // the anchor is the grunt
    for (const kind of ENEMY_KINDS) expect(GRUNT_HITS.min * kind.hpMult, kind.key).toBeGreaterThanOrEqual(1.5);
  });

  it('a stage boss lasts 5–10 seconds against the party at every tuning point', () => {
    for (const p of POINTS) {
      const sec = stageBossHp(anchorStage(p)) / (REFERENCE_BOSS_DPS[p] ?? Number.NaN);
      expect(sec, `point ${p} (stage ${anchorStage(p)})`).toBeGreaterThanOrEqual(STAGE_BOSS_SEC.min);
      expect(sec, `point ${p} (stage ${anchorStage(p)})`).toBeLessThanOrEqual(STAGE_BOSS_SEC.max);
    }
  });

  it('the three ranks are their own tables: flat inside a world, a step up at each new one', () => {
    expect(GRUNT_HP_TUNE).toHaveLength(TUNE_POINTS);
    expect(STAGE_BOSS_HP_TUNE).toHaveLength(TUNE_POINTS);
    expect(TRASH_DMG_TUNE).toHaveLength(TUNE_POINTS);
    expect(tunePoint(1)).toBe(0);
    expect(tunePoint(9)).toBe(8);
    expect(tunePoint(11)).toBe(10);
    expect(tunePoint(500)).toBe(TUNE_POINTS - 1);
    for (let w = 2; w <= 50; w++) {
      const first = (w - 1) * 10 + 1;
      for (let s = first; s < first + 8; s++) {
        expect(enemyHp(s + 1)).toBe(enemyHp(s));
        expect(stageBossHp(s + 1)).toBe(stageBossHp(s));
      }
      if (w > 2) {
        expect(enemyHp(first), `world ${w}`).toBeGreaterThan(enemyHp(first - 10));
        expect(stageBossHp(first), `world ${w}`).toBeGreaterThan(stageBossHp(first - 10));
      }
      // a stage boss is a fight, the world boss is the wall: far more life
      expect(zoneBossHp(first + 9), `world ${w}`).toBeGreaterThan(stageBossHp(first + 8) * 2);
    }
    // a grunt is TRASH_HP_FRACTION of the reference, whatever the stage
    expect(gruntHp(137)).toBeCloseTo(enemyHp(137) * TRASH_HP_FRACTION, 9);
    // trash damage is never raised above the formula, only lowered where a longer fight would wipe the party
    for (const d of TRASH_DMG_TUNE) {
      expect(d).toBeGreaterThan(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });
});

describe('toughness anchors — measured in a real fight (the opening of a new game)', () => {
  // The probe's own player, played from nothing: the party that reaches 1-5 and the one that reaches 1-9.
  const bonuses = getBonuses({}, {});
  const run = newProbeRun(1, DEFAULT_CONFIG);

  it('1-5: two heroes, no weapons to speak of', () => {
    advanceProbe(run, { ...DEFAULT_CONFIG, stopAtStage: 4 });
    const party = runParty(run);
    expect(party.every((h) => h.level < MAX_LEVEL)).toBe(true);
    const g = gruntHits(party, 5, DEFAULT_CONFIG.measureSeed, bonuses);
    expect(g.hits).toBeGreaterThanOrEqual(1.7 * NORMAL_TRASH_HP_MULT); // 2–3 hits with a little room, × Normal's softer grunts
    expect(g.hits).toBeLessThanOrEqual(3.3);
    expect(g.eliteHits).toBeGreaterThan(8 * NORMAL_TRASH_HP_MULT);
    const b = measureStageBoss(party, 5, DEFAULT_CONFIG.measureSeed, bonuses);
    expect(b.win).toBe(true);
    expect(b.seconds).toBeGreaterThanOrEqual(4);
    expect(b.seconds).toBeLessThanOrEqual(11);
  });

  it('1-9: the trio — a first weapon may already have dropped, and it is most of a hero\'s hit', () => {
    advanceProbe(run, { ...DEFAULT_CONFIG, stopAtStage: 8 });
    const party = runParty(run);
    expect(party).toHaveLength(3);
    const g = gruntHits(party, 9, DEFAULT_CONFIG.measureSeed, bonuses);
    // This seed's party found a weapon in its first hour, so it is ahead of the table (tuned on the median
    // party): the grunt still takes more than one hit, and no more than the band allows.
    expect(g.hits).toBeGreaterThan(1);
    expect(g.hits).toBeLessThanOrEqual(3.3);
    const b = measureStageBoss(party, 9, DEFAULT_CONFIG.measureSeed, bonuses);
    expect(b.win).toBe(true);
    expect(b.seconds).toBeGreaterThanOrEqual(3.5);
    expect(b.seconds).toBeLessThanOrEqual(11);
  });
});

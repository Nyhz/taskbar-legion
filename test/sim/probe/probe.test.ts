import { describe, it, expect } from 'vitest';
import { measureFarm, measureBoss } from './combat';
import { openCaptured, equipItems, partyPower } from './gear';
import { freshHero, defaultTalents, levelForXp, buyTech } from './economy';
import { runProbe, newProbeRun, advanceProbe, DEFAULT_CONFIG } from './loop';
import { WORLD_HOURS_TARGET, DIFFICULTY_HOURS_TARGET } from './targets';
import { getBonuses } from '@/sim/bonuses';
import { totalExpToReach } from '@/data/stageScaling';

const bonuses = getBonuses({}, {});

describe('probe combat measurement', () => {
  it('a naked solo Knight gets through stage 1 — slowly — and earns from it (bootstrap)', () => {
    const m = measureFarm([freshHero('h0', 'knight', 1)], 1, 1234, bonuses);
    expect(m.gold).toBeGreaterThan(0);
    expect(Number.isFinite(m.clearSec)).toBe(true);
    // The opening (2026-11-15 retune): the first stage is his alone and takes a minute or two, not seconds, but
    // it is not a wall — a new game must never open on a stage its only hero cannot finish.
    expect(m.clearable).toBe(true);
    expect(m.clearSec).toBeGreaterThan(60);
    expect(m.clearSec).toBeLessThan(300);
  });

  it('a farmed party clears its stage and beats the world boss, with a measurable margin', () => {
    // The party the game expects at the end of world 3: around level 30, wearing the best of a few hundred chests
    // of that world (the per-world ladder: mostly plain and uncommon pieces, a rare here and there).
    const party = [freshHero('h0', 'knight', 30), freshHero('h1', 'ranger', 30), freshHero('h2', 'priest', 30)];
    const draw = { n: 0 };
    for (let i = 0; i < 6; i++) {
      const loot = openCaptured('normal', 29, 100, 99, draw, bonuses, ['knight', 'ranger', 'priest']);
      equipItems(party, loot.items);
    }
    const farm = measureFarm(party, 29, 1234, bonuses);
    const boss = measureBoss(party, 30, 1234, bonuses);
    expect(farm.clearable).toBe(true);
    expect(boss.win).toBe(true);
    expect(boss.minHpFrac).toBeGreaterThanOrEqual(0);
    expect(boss.minHpFrac).toBeLessThanOrEqual(1);
  });
});

describe('probe economy', () => {
  it('levelForXp matches the XP curve', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(totalExpToReach(10))).toBe(10);
    expect(levelForXp(totalExpToReach(50) - 1)).toBe(49);
  });

  it('default talents grant abilities (the Priest gets a kit, not a blank tree)', () => {
    const t = defaultTalents('priest', 20);
    expect(Object.keys(t).length).toBeGreaterThan(0);
  });

  it('buyTech spends gold by priority and never goes negative', () => {
    const ranks: Record<string, number> = {};
    const left = buyTech(5000, ranks);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left).toBeLessThan(5000);
    expect(Object.keys(ranks).length).toBeGreaterThan(0);
  });
});

describe('probe keys and targets', () => {
  it('only stage-boss chests hold world-boss keys: one in four, on every difficulty (option A)', () => {
    const draw = { n: 0 };
    const classes = ['knight', 'ranger', 'priest'];
    expect(openCaptured('normal', 129, 400, 5, draw, bonuses, classes).keys).toBe(0);
    expect(openCaptured('zoneBoss', 130, 400, 5, draw, bonuses, classes).keys).toBe(0);
    const normal = openCaptured('stageBoss', 29, 2000, 5, draw, bonuses, classes).keys; // Normal too, now
    expect(normal).toBeGreaterThan(430);
    expect(normal).toBeLessThan(570);
    const keys = openCaptured('stageBoss', 129, 2000, 5, draw, bonuses, classes).keys; // Hell
    expect(keys).toBeGreaterThan(430);
    expect(keys).toBeLessThan(570);
  });

  it('a world boss is only attempted with a key, and the wait for it is part of the world', () => {
    const r = runProbe(3, { ...DEFAULT_CONFIG, stopAtStage: 10 });
    expect(r.completed).toBe(true);
    const w1 = r.milestones[0];
    expect(w1?.world).toBe(1);
    expect(w1?.firstKeyHours ?? -1).toBeGreaterThanOrEqual(0); // the first attempt needed a key too
    expect(w1?.keylessHours ?? -1).toBeGreaterThanOrEqual(w1?.firstKeyHours ?? 0); // every hour without a key is counted
    expect(w1?.hoursOnWorld ?? 0).toBeGreaterThan(w1?.firstKeyHours ?? 0);
    // A run that holds its keys (the wall tuner's mode) never attempts: it stays at the wall.
    const run = newProbeRun(3);
    advanceProbe(run, { ...DEFAULT_CONFIG, holdKeys: true, stopAtStage: 10, stopAtActiveSec: 6 * 3600 });
    expect(run.state.frontier).toBe(9);
    expect(run.attempts).toBe(0);
  });

  it('the per-world targets add up to the 3-month game: Normal an afternoon, every difficulty longer than the last', () => {
    const total = WORLD_HOURS_TARGET.reduce((a, b) => a + b, 0);
    expect(WORLD_HOURS_TARGET).toHaveLength(50);
    expect(total).toBeCloseTo(DIFFICULTY_HOURS_TARGET.reduce((a, b) => a + b, 0), 6);
    expect(total).toBeGreaterThan(680); // ~720 active hours = 90 days at 8 h
    expect(total).toBeLessThan(760);
    expect(DIFFICULTY_HOURS_TARGET[0]).toBeGreaterThanOrEqual(3); // Normal: three to four hours
    expect(DIFFICULTY_HOURS_TARGET[0]).toBeLessThanOrEqual(4);
    for (let d = 0; d < 5; d++) {
      const own = WORLD_HOURS_TARGET.slice(d * 10, d * 10 + 10).reduce((a, b) => a + b, 0);
      expect(own).toBeCloseTo(DIFFICULTY_HOURS_TARGET[d] ?? 0, 6);
      if (d > 0) expect(DIFFICULTY_HOURS_TARGET[d]).toBeGreaterThan((DIFFICULTY_HOURS_TARGET[d - 1] ?? 0) * 1.3);
    }
    for (let w = 1; w < 50; w++) expect(WORLD_HOURS_TARGET[w]).toBeGreaterThan(WORLD_HOURS_TARGET[w - 1] ?? 0);
  });
});

describe('probe loop', () => {
  it('bootstraps a solo Knight off stage 1 and is deterministic', () => {
    const a = runProbe(7, { ...DEFAULT_CONFIG, maxDays: 2 });
    const b = runProbe(7, { ...DEFAULT_CONFIG, maxDays: 2 });
    // Bootstrap: a naked solo Knight earned enough partial loot to push the frontier off 0.
    expect((a.stalledAtStage ?? 0)).toBeGreaterThan(0);
    expect(a.totalActiveHours).toBeGreaterThan(0);
    // Determinism: same seed + config ⇒ identical run.
    expect(a.totalActiveHours).toBe(b.totalActiveHours);
    expect(a.stalledAtStage).toBe(b.stalledAtStage);
    expect(partyPower([freshHero('x', 'knight', 1)])).toBeGreaterThan(0);
  });
});

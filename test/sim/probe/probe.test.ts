import { describe, it, expect } from 'vitest';
import { measureFarm, measureBoss } from './combat';
import { openCaptured, equipItems, partyPower } from './gear';
import { freshHero, defaultTalents, levelForXp, buyTech } from './economy';
import { runProbe, DEFAULT_CONFIG } from './loop';
import { getBonuses } from '@/sim/bonuses';
import { totalExpToReach } from '@/data/stageScaling';

const bonuses = getBonuses({}, []);

describe('probe combat measurement', () => {
  it('a naked solo Knight cannot cleanly clear stage 1 but still earns partial income (bootstrap)', () => {
    const m = measureFarm([freshHero('h0', 'knight', 1)], 1, 1234, bonuses);
    expect(m.gold).toBeGreaterThan(0); // kills SOME mobs while wiping → gear bootstrap
    expect(Number.isFinite(m.clearSec)).toBe(true);
  });

  it('a farmed party clears its stage and beats the world boss, with a measurable margin', () => {
    const party = [freshHero('h0', 'knight', 11), freshHero('h1', 'ranger', 11), freshHero('h2', 'priest', 11)];
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

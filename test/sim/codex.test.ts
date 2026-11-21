import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, tryAchievement } from '@/data/achievements';
import { achievementProgress, achievementTotals, earnedAchievements, factValue, type AchievementFacts } from '@/sim/achievements';
import { addRecords, bestiaryDiscovered, emptyRecords, sanitizeRecords } from '@/sim/records';
import { getBonuses } from '@/sim/bonuses';

// The Codex (user, 2026-11-21): lifetime records, achievements read from them, small economy bonuses.

const facts = (over: Partial<AchievementFacts> = {}): AchievementFacts => ({ records: emptyRecords(), frontier: 0, petsOwned: 0, heroLevel: 1, ...over });

describe('records', () => {
  it('counts add, bests keep the higher, bad amounts count as nothing', () => {
    let r = emptyRecords();
    r = addRecords(r, { kills: 10, goldEarned: 500, itemTier: 3, hit: 120, chestsOpened: { normal: 2 } });
    r = addRecords(r, { kills: 5, goldEarned: -40, itemTier: 1, hit: Number.NaN, chestsOpened: { normal: 1, zoneBoss: 1 } });
    expect(r.kills).toBe(15);
    expect(r.goldEarned).toBe(500);
    expect(r.bestItemTier).toBe(3);
    expect(r.highestHit).toBe(120);
    expect(r.chestsOpened).toEqual({ normal: 3, stageBoss: 0, zoneBoss: 1 });
  });

  it('keeps the bestiary per creature and difficulty, and counts the pairs discovered', () => {
    let r = addRecords(emptyRecords(), { creatures: { difficulty: 0, counts: { boar: 3, scarecrow: 1 } } });
    r = addRecords(r, { creatures: { difficulty: 1, counts: { boar: 2 } } });
    expect(r.bestiary.boar).toEqual([3, 2, 0, 0, 0]);
    expect(bestiaryDiscovered(r)).toBe(3);
  });

  it('never changes the records it is given', () => {
    const r = emptyRecords();
    addRecords(r, { kills: 1, creatures: { difficulty: 0, counts: { boar: 1 } }, chestsOpened: { normal: 1 } });
    expect(r).toEqual(emptyRecords());
  });

  it('reads a save defensively: garbage becomes empty, good fields survive', () => {
    expect(sanitizeRecords(undefined)).toEqual(emptyRecords());
    expect(sanitizeRecords('x')).toEqual(emptyRecords());
    const r = sanitizeRecords({ kills: 7, goldEarned: 'lots', chestsOpened: { normal: 2 }, bestiary: { boar: [1, 'a'] } });
    expect(r.kills).toBe(7);
    expect(r.goldEarned).toBe(0);
    expect(r.chestsOpened.normal).toBe(2);
    expect(r.bestiary.boar).toEqual([1, 0]);
  });
});

describe('achievements', () => {
  it('have unique keys, positive targets and small positive rewards', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.target).toBeGreaterThan(0);
      expect(a.reward.value).toBeGreaterThan(0);
      expect(a.reward.value).toBeLessThanOrEqual(0.005); // each one a small step (user: «muchos incrementos pequeños»)
    }
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(100);
  });

  it('all of them together stay a modest economy bonus', () => {
    const all = achievementTotals(ACHIEVEMENTS.map((a) => a.key));
    expect(all.goldMult).toBeLessThanOrEqual(0.15);
    expect(all.xpMult).toBeLessThanOrEqual(0.15);
    expect(all.chestDropMult).toBeLessThanOrEqual(0.1);
    expect(all.gemDropMult).toBeLessThanOrEqual(0.1);
  });

  it('a fresh game has reached none; the facts reach them, and more facts never lose one', () => {
    expect(earnedAchievements(facts())).toEqual([]);
    const some = earnedAchievements(facts({ frontier: 140, heroLevel: 52, petsOwned: 1, records: addRecords(emptyRecords(), { kills: 12_000 }) }));
    expect(some).toContain('frontier_140');
    expect(some).not.toContain('frontier_150');
    expect(some).toContain('kills_10000');
    expect(some).toContain('heroLevel_50');
    expect(some).toContain('petsOwned_1');
    const more = earnedAchievements(facts({ frontier: 200, heroLevel: 60, petsOwned: 2, records: addRecords(emptyRecords(), { kills: 60_000 }) }));
    for (const key of some) expect(more).toContain(key);
  });

  it('progress runs 0…1 and play time is read in hours', () => {
    const a = tryAchievement('playHours_10');
    if (a === undefined) throw new Error('missing');
    const f = facts({ records: addRecords(emptyRecords(), { playMs: 5 * 3_600_000 }) });
    expect(factValue('playHours', f)).toBe(5);
    expect(achievementProgress(a, f)).toBeCloseTo(0.5);
  });

  it('their bonuses join the tech and the pets in getBonuses; unknown keys give nothing', () => {
    const base = getBonuses({}, {});
    const withA = getBonuses({}, {}, ['kills_100', 'kills_1000', 'frontier_10', 'nope']);
    expect(withA.goldMult).toBeCloseTo(base.goldMult + 0.006);
    expect(withA.xpMult).toBeCloseTo(base.xpMult + 0.0015);
    expect(withA.combatMods).toEqual([]); // never combat
  });
});

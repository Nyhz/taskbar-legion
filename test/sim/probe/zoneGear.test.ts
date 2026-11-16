import { describe, expect, it } from 'vitest';
import { getBonuses } from '@/sim/bonuses';
import { ZONE_BOSS_HP_OVERRIDE, ZONE_ENRAGE_MS, STAGE_ENRAGE_MS, BOSS_ENRAGE_RAMP_MS, enrageMultiplier, expectedLevel, zoneBossHp } from '@/data/stageScaling';
import { freshHero } from './economy';
import { zoneSet, zoneReferenceSet, usualTier, withZoneChests, wallDamage, zoneSetDamage, gearPercent } from './zoneGear';

// "Geared at X % of the zone" (zoneGear.ts): the damage a party deals to the world boss in its 60 s, over the
// damage the same heroes deal in the zone set. These pin the definition, not the tuning.

const bonuses = getBonuses({}, {});
const heroes = (level: number) => [freshHero('k', 'knight', level), freshHero('r', 'ranger', level), freshHero('p', 'priest', level)];

describe('the enrage window', () => {
  it('a boss hits as written for 60 s and then doubles every 2 s', () => {
    expect(ZONE_ENRAGE_MS).toBe(60_000);
    expect(STAGE_ENRAGE_MS).toBe(60_000);
    expect(enrageMultiplier(60_000, ZONE_ENRAGE_MS)).toBe(1);
    expect(enrageMultiplier(60_000 + BOSS_ENRAGE_RAMP_MS, ZONE_ENRAGE_MS)).toBeCloseTo(2, 6);
    expect(enrageMultiplier(70_000, ZONE_ENRAGE_MS)).toBeGreaterThan(16); // ten seconds in: no party stands there long
  });
});

describe('gear % of the zone', () => {
  const boss = 150; // Hell 5-10
  const party = heroes(38);

  it('the zone set fills every slot from the world itself, and the same draw is the same set', () => {
    const a = zoneSet(party, boss, bonuses);
    const b = zoneSet(party, boss, bonuses);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    for (const h of a) {
      expect(Object.keys(h.equipment).length).toBeGreaterThanOrEqual(10); // eleven slots; a two-handed weapon leaves one empty
      for (const item of Object.values(h.equipment)) expect(item?.origin.stageIndex).toBe(boss - 1);
    }
  });

  it('the measure leaves the wall as it was, and repeats to the last point of damage', () => {
    const hp = zoneBossHp(boss);
    const set = zoneSet(party, boss, bonuses);
    const d = wallDamage(set, boss, bonuses, 1234);
    expect(d).toBeGreaterThan(0);
    expect(wallDamage(set, boss, bonuses, 1234)).toBe(d);
    expect(zoneBossHp(boss)).toBe(hp);
    expect(ZONE_BOSS_HP_OVERRIDE[15]).toBeUndefined();
  });

  it('more of the zone worn is a higher gear %: naked < a handful of chests < many, and the reference set is ≈ 100', () => {
    const ref = zoneSetDamage(party, boss, bonuses, 1234);
    const pct = (p: ReturnType<typeof heroes>): number => (100 * wallDamage(p, boss, bonuses, 1234)) / ref;
    const naked = pct(party);
    const few = pct(withZoneChests(party, boss, bonuses, 12));
    const many = pct(withZoneChests(party, boss, bonuses, 80));
    expect(naked).toBeLessThan(15);
    // a party that falls is counted at the rate it was dealing, so a handful of chests barely moves a naked one
    expect(few).toBeGreaterThan(naked * 0.9);
    expect(many).toBeGreaterThan(few);
    expect(many).toBeGreaterThan(naked);
    const one = gearPercent(zoneReferenceSet(party, boss, 7), boss, bonuses, 1234); // one draw, against the mean of five
    expect(one).toBeGreaterThan(60);
    expect(one).toBeLessThan(160);
  });

  it('the reference set (option C): every slot an item of the world\'s X-9 level at its usual worn rarity, gems in', () => {
    const set = zoneReferenceSet(party, boss);
    for (const h of set) {
      expect(Object.keys(h.equipment).length).toBeGreaterThanOrEqual(10);
      for (const item of Object.values(h.equipment)) {
        expect(item?.ilvl).toBe(expectedLevel(boss - 1));
        expect(item?.tier).toBe(usualTier(boss - 1, item?.category === 'jewelry'));
        for (const so of item?.sockets ?? []) expect(so.gem).not.toBeNull();
      }
    }
  });
});

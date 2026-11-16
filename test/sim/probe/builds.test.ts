import { describe, expect, it } from 'vitest';
import { getBonuses } from '@/sim/bonuses';
import { sanitizeTalents, learnedAbilityNodes, spentPoints } from '@/sim/talentRules';
import { CLASS_KEYS } from '@/data/classes';
import { PET_KEYS } from '@/data/pets';
import { zoneBossHp } from '@/data/stageScaling';
import { allBuilds, buildTalents, fieldedAbilities, randomPartyBuild, PROBE_DEFAULT_BUILD } from './builds';
import { freshHero, defaultTalents } from './economy';
import { newProbeRun, ownedPetRanks, runProbe, DEFAULT_CONFIG } from './loop';
import { zoneSet, wallDamage } from './zoneGear';

// The probe's builds (builds.ts): any pair of abilities, either branch, the "choose one" modifiers, either spend
// order — always a talent map the tree accepts — and the options of the loop that use them (pets, run seed).

describe('probe builds', () => {
  it('every build of every class, at every level, is a talent map the tree accepts', () => {
    for (const c of CLASS_KEYS) {
      for (const level of [1, 10, 25, 45, 75, 120]) {
        for (const b of allBuilds(c)) {
          const t = buildTalents(c, level, b);
          const clean = sanitizeTalents(c, t, level, b.abilities);
          expect(clean.talents).toEqual(t);
          expect(spentPoints(t)).toBeLessThanOrEqual(level);
          const learned = learnedAbilityNodes(c, t).map((n) => n.key).sort();
          expect(learned).toEqual(fieldedAbilities(c, level, b).filter((k) => (t[k] ?? 0) > 0).sort());
          expect(learned.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('the default build is the probe\'s average player: the first two abilities, the trunk, then its branch', () => {
    for (const c of CLASS_KEYS) {
      const t = defaultTalents(c, 120);
      expect(learnedAbilityNodes(c, t).map((n) => n.key)).toEqual(PROBE_DEFAULT_BUILD[c]?.abilities);
      expect(spentPoints(t)).toBe(120);
    }
  });

  it('an ability whose tier is still closed is stood in for by a default one, and fielded once it opens', () => {
    const circle = { abilities: ['priest_mend', 'priest_circle'], branch: 'devotion' };
    expect(fieldedAbilities('priest', 20, circle)).toEqual(['priest_mend', 'priest_healing_light']); // row 4 opens at 30 points
    expect(fieldedAbilities('priest', 35, circle)).toEqual(['priest_mend', 'priest_circle']);
    const hero = freshHero('p', 'priest', 35, circle);
    expect(hero.activeAbilities).toEqual(['priest_mend', 'priest_circle']);
    expect(hero.talents.priest_circle).toBe(5);
  });

  it('a random party build is the same for the same seed', () => {
    expect(randomPartyBuild(CLASS_KEYS, 9)).toEqual(randomPartyBuild(CLASS_KEYS, 9));
    expect(randomPartyBuild(CLASS_KEYS, 9)).not.toEqual(randomPartyBuild(CLASS_KEYS, 10));
  });
});

describe('probe options', () => {
  it('pets: none by default; "median" owns a pet once half the players would have found it, and ranks it up', () => {
    const run = newProbeRun(1);
    expect(ownedPetRanks(run.state, DEFAULT_CONFIG)).toEqual({});
    run.state.tally.kills = 10_000_000;
    run.state.tally.bossKills = 100_000;
    const cfg = { ...DEFAULT_CONFIG, pets: 'median' as const };
    const first = ownedPetRanks(run.state, cfg);
    expect(Object.keys(first).sort()).toEqual([...PET_KEYS].sort());
    for (const r of Object.values(first)) expect(r).toBe(1); // the objective counts from the moment it is found
    run.state.tally.gold += 1e9;
    expect(ownedPetRanks(run.state, cfg).coin_sprite).toBeGreaterThan(1);
    expect(getBonuses({}, ownedPetRanks(run.state, cfg)).goldMult).toBeGreaterThan(1);
  });

  it('a run is the same for the same seed with the run seed dealing the affixes', () => {
    const a = runProbe(3, { ...DEFAULT_CONFIG, stopAtStage: 10 });
    const b = runProbe(3, { ...DEFAULT_CONFIG, stopAtStage: 10 });
    expect(a).toEqual(b);
  });

  it('the zone-gear measure fights a boss of its real life that cannot die', () => {
    const party = zoneSet([freshHero('k', 'knight', 40), freshHero('r', 'ranger', 40), freshHero('p', 'priest', 40)], 20, getBonuses({}, {}));
    expect(wallDamage(party, 20, getBonuses({}, {}), 1234)).toBeGreaterThan(zoneBossHp(20)); // it would have died: its life came back
  });
});

import { describe, expect, it } from 'vitest';
import { PETS, PET_KEYS } from '@/data/pets';
import { getBonuses } from '@/sim/bonuses';
import { makeRng } from '@/sim/rng';
import {
  advancePetProgress,
  expectedPetsFound,
  isPet,
  petBonusAt,
  petDropChance,
  petMaxRank,
  petMissChance,
  petRank,
  petRanks,
  petStanding,
  rollPetDrop,
} from '@/sim/pets';

// What each pet gave at once before the ranks (2026-11-15): its LAST rank must give at least that, never less.
const OLD_BONUS: Record<string, number> = {
  coin_sprite: 0.15,
  scholar_owl: 0.15,
  pack_mule: 2,
  lucky_cat: 0.12,
  time_imp: 10, // new mechanic (2026-11-15): hours added to the away-time cap; its top is the designed value
  hoarder: 1,
};

describe('pet data', () => {
  it('every pet has at least two ranks, one goal fewer than ranks, and goals that grow steeply', () => {
    for (const key of PET_KEYS) {
      const def = PETS[key];
      if (def === undefined) throw new Error(key);
      expect(def.ranks.length, key).toBeGreaterThanOrEqual(2);
      expect(def.ranks.length, key).toBeLessThanOrEqual(5);
      expect(def.objective.goals.length, key).toBe(def.ranks.length - 1);
      let last = 0;
      for (const goal of def.objective.goals) {
        if (last > 0) expect(goal / last, key).toBeGreaterThanOrEqual(2.5); // each rank is several times the one before
        expect(goal, key).toBeGreaterThan(last);
        last = goal;
      }
    }
  });

  it('a pet gives more at every rank: a small part when found, its old bonus (or one step more) at the last', () => {
    for (const key of PET_KEYS) {
      const values = (PETS[key]?.ranks ?? []).map((b) => b.value);
      for (let i = 1; i < values.length; i++) expect(values[i], key).toBeGreaterThan(values[i - 1] ?? Infinity);
      const old = OLD_BONUS[key];
      if (old === undefined) throw new Error(`no old bonus recorded for ${key}`);
      const first = values[0] ?? 0;
      const top = values[values.length - 1] ?? 0;
      expect(top, key).toBeGreaterThanOrEqual(old);
      expect(first, key).toBeLessThanOrEqual(old / 2 + 1e-9 + (Number.isInteger(old) ? 0.5 : 0)); // whole slots start at +1
      // The kind (and the chest type) never changes between ranks.
      const kinds = new Set((PETS[key]?.ranks ?? []).map((b) => (b.kind === 'chestStorage' ? `${b.kind}:${b.type}` : b.kind)));
      expect(kinds.size, key).toBe(1);
    }
  });

  it('the percent pets reach exactly what they used to give', () => {
    expect(petBonusAt('coin_sprite', 5)).toEqual({ kind: 'goldMult', value: 0.15 });
    expect(petBonusAt('scholar_owl', 5)).toEqual({ kind: 'xpMult', value: 0.15 });
    expect(petBonusAt('scholar_owl', 1)).toEqual({ kind: 'xpMult', value: 0.03 });
    expect(petBonusAt('lucky_cat', 5)).toEqual({ kind: 'chestDropMult', value: 0.12 });
    expect(petBonusAt('time_imp', 1)).toEqual({ kind: 'awayHours', value: 2 });
    expect(petBonusAt('time_imp', 5)).toEqual({ kind: 'awayHours', value: 10 });
  });
});

describe('pet ranks', () => {
  it('a pet is found at rank 1 and gains a rank at each goal, up to its last', () => {
    const goals = PETS.scholar_owl?.objective.goals ?? [];
    expect(petRank('scholar_owl', 0)).toBe(1);
    expect(petRank('scholar_owl', (goals[0] ?? 0) - 1)).toBe(1);
    expect(petRank('scholar_owl', goals[0] ?? 0)).toBe(2);
    expect(petRank('scholar_owl', goals[3] ?? 0)).toBe(5);
    expect(petRank('scholar_owl', 1e15)).toBe(5);
    expect(petMaxRank('pack_mule')).toBe(3);
    expect(petRank('hoarder', 1e15)).toBe(petMaxRank('hoarder'));
  });

  it('petBonusAt clamps a rank out of range', () => {
    expect(petBonusAt('coin_sprite', 0)).toEqual(petBonusAt('coin_sprite', 1));
    expect(petBonusAt('coin_sprite', 99)).toEqual(petBonusAt('coin_sprite', 5));
  });

  it('standing: progress inside the current rank, and no goal at the last', () => {
    const goals = PETS.coin_sprite?.objective.goals ?? [];
    const g1 = goals[0] ?? 0;
    const g2 = goals[1] ?? 0;
    expect(petStanding('coin_sprite', g1 / 2)).toMatchObject({ rank: 1, maxRank: 5, goal: g1, fraction: 0.5 });
    expect(petStanding('coin_sprite', g1 + (g2 - g1) / 4)).toMatchObject({ rank: 2, goal: g2, fraction: 0.25 });
    expect(petStanding('coin_sprite', 1e15)).toMatchObject({ rank: 5, goal: null, fraction: 1 });
  });

  it('the bonuses read each owned pet at its rank', () => {
    expect(getBonuses({}, petRanks(['scholar_owl'], {})).xpMult).toBeCloseTo(1.03, 6);
    expect(getBonuses({}, petRanks(['scholar_owl'], { scholar_owl: 1e15 })).xpMult).toBeCloseTo(1.15, 6);
    const all = getBonuses({}, petRanks(PET_KEYS, Object.fromEntries(PET_KEYS.map((k) => [k, 1e15]))));
    expect(all.goldMult).toBeCloseTo(1.15, 6);
    expect(all.chestDropMult).toBeCloseTo(1.12, 6);
    expect(all.chestStorageBonus.normal).toBe(3);
    expect(all.chestStorageBonus.stageBoss).toBe(2);
    expect(all.awayCapBonusMs).toBe(10 * 3_600_000); // the Time Imp: 8 h of away time become 18
  });
});

describe('pet objectives', () => {
  it('only owned pets count, each its own kind of fact', () => {
    const next = advancePetProgress(['coin_sprite', 'hoarder'], { coin_sprite: 10, hoarder: 0 }, { goldEarned: 5, xpEarned: 99, bossesDefeated: 2 });
    expect(next).toEqual({ coin_sprite: 15, hoarder: 2 });
    expect(next.scholar_owl).toBeUndefined(); // not owned: experience earned before it is found never counts
  });

  it('returns the same object when nothing moved', () => {
    const progress = { coin_sprite: 10 };
    expect(advancePetProgress(['coin_sprite'], progress, { xpEarned: 50 })).toBe(progress);
    expect(advancePetProgress(['coin_sprite'], progress, { goldEarned: 0 })).toBe(progress);
    expect(advancePetProgress([], progress, { goldEarned: 5 })).toBe(progress);
  });

  it('ignores a key the game no longer has', () => {
    expect(isPet('ghost_pet')).toBe(false);
    expect(advancePetProgress(['ghost_pet'], {}, { goldEarned: 5 })).toEqual({});
    expect(petRanks(['ghost_pet', 'lucky_cat'], {})).toEqual({ lucky_cat: 1 });
  });
});

describe('pet drops', () => {
  it('a boss-only pet never drops from a normal kill', () => {
    expect(petDropChance('pack_mule', 'enemy')).toBe(0);
    expect(petDropChance('pack_mule', 'boss')).toBeGreaterThan(0);
    expect(petDropChance('coin_sprite', 'enemy')).toBe(petDropChance('coin_sprite', 'boss'));
  });

  it('rolls deterministically and never an owned pet', () => {
    const always = { ...makeRng(1), chance: () => true };
    expect(rollPetDrop('enemy', [], always)).toBe('coin_sprite');
    expect(rollPetDrop('enemy', ['coin_sprite'], always)).toBe('scholar_owl');
    expect(rollPetDrop('boss', PET_KEYS, always)).toBeNull();
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 2000; i++) expect(rollPetDrop('enemy', [], a)).toBe(rollPetDrop('enemy', [], b));
  });

  // The probe's cumulative kill counts of 2026-11-15 (see data/pets.ts). If the pacing retune moves them, the
  // drop chances must be re-set against the new counts — these bounds are the user's rule, not the numbers.
  it('arriving in Hell with no pet or one is the usual case; the full set is a late-game thing', () => {
    const normal = expectedPetsFound(132_000, 430);
    expect(normal).toBeGreaterThanOrEqual(0.5);
    expect(normal).toBeLessThanOrEqual(0.8);
    const none = PET_KEYS.reduce((p, key) => p * petMissChance(key, 132_000, 430), 1);
    expect(none).toBeGreaterThan(0.4); // nearly half the players finish Normal without one
    expect(expectedPetsFound(1_536_000, 3_770)).toBeLessThan(5); // not even the end of Eternal gives all six
    expect(expectedPetsFound(1_536_000, 3_770)).toBeGreaterThan(3);
  });
});

describe('facts of active play (what the pet objectives count)', () => {
  it('the sim reports enemies and bosses defeated and chests that dropped, and they match the world', async () => {
    const { Simulation, createWorld } = await import('@/sim/Simulation');
    const { buildHeroCombatant } = await import('@/sim/loadout');
    const { freshHero } = await import('../sim/probe/economy');
    const party = [freshHero('h0', 'knight', 60), freshHero('h1', 'ranger', 60), freshHero('h2', 'priest', 60)].map((c) => buildHeroCombatant(c, []));
    const sim = new Simulation(createWorld(11, party));
    const ctx = { bonuses: getBonuses({}, {}), ownedPetKeys: [] as string[], retryStage: true };
    let kills = 0;
    let bossKills = 0;
    let chestsFound = 0;
    for (let i = 0; i < 6000 && bossKills === 0; i++) {
      sim.tick(ctx);
      const p = sim.world.pending;
      kills += p.kills;
      bossKills += p.bossKills;
      chestsFound += p.chestsFound;
      p.kills = 0;
      p.bossKills = 0;
      p.chestsFound = 0;
    }
    expect(kills).toBeGreaterThan(20); // a stage of waves fell before its boss
    expect(bossKills).toBe(1);
    const stored = sim.world.chests.reduce((n, c) => n + c.count, 0);
    expect(chestsFound).toBe(stored); // nothing was opened: every chest found is still in storage
  });
});

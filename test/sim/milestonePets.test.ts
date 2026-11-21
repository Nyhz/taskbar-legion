import { describe, expect, it } from 'vitest';
import { MILESTONE_PETS, PETS } from '@/data/pets';
import { getBonuses } from '@/sim/bonuses';
import { milestonePetsDue } from '@/sim/pets';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { godHero } from './_helpers';

// The milestone pets (user, 2026-11-21): the gold pet the first time Normal is beaten, the experience pet the first
// time Hell is; a player who already has one gets nothing extra.

describe('milestone pets', () => {
  it('names real pets, one per difficulty at most', () => {
    for (const m of MILESTONE_PETS) expect(PETS[m.pet]).toBeDefined();
    expect(new Set(MILESTONE_PETS.map((m) => m.difficulty)).size).toBe(MILESTONE_PETS.length);
  });

  it('are due once the last stage of their difficulty is cleared, and never twice', () => {
    expect(milestonePetsDue(99, [])).toEqual([]);
    expect(milestonePetsDue(100, [])).toEqual(['coin_sprite']);
    expect(milestonePetsDue(199, [])).toEqual(['coin_sprite']);
    expect(milestonePetsDue(200, [])).toEqual(['coin_sprite', 'scholar_owl']);
    expect(milestonePetsDue(500, ['coin_sprite'])).toEqual(['scholar_owl']);
    expect(milestonePetsDue(500, ['scholar_owl', 'coin_sprite'])).toEqual([]);
  });

  function beatWorldBoss(stage: number, owned: string[]): string[] {
    const world = createWorld(1, [godHero('h0'), godHero('h1')]);
    world.maxClearedStage = stage - 1;
    world.globalStageIndex = stage - 1;
    const sim = new Simulation(world);
    expect(sim.enterZoneBoss()).toBe(true);
    const ctx: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: owned };
    const drops: string[] = [];
    for (let i = 0; i < 20_000 && world.maxClearedStage < stage; i++) {
      sim.tick(ctx);
      drops.push(...world.pending.petDrops);
      world.pending.petDrops = [];
    }
    expect(world.maxClearedStage).toBe(stage);
    for (let i = 0; i < 50; i++) { // the ticks after the clear hand over nothing more
      sim.tick(ctx);
      drops.push(...world.pending.petDrops);
      world.pending.petDrops = [];
    }
    return drops;
  }

  it('beating Normal 10-10 hands over the gold pet; Hell 10-10 the experience pet', () => {
    expect(beatWorldBoss(100, [])).toEqual(['coin_sprite']);
    expect(beatWorldBoss(200, ['coin_sprite'])).toEqual(['scholar_owl']);
  });

  it('a player who already owns it gets nothing; another world boss hands over nothing', () => {
    expect(beatWorldBoss(100, ['coin_sprite'])).toEqual([]);
    expect(beatWorldBoss(50, [])).toEqual([]);
  });
});

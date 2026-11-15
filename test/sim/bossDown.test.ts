import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { BOSS_DOWN_MS } from '@/data/field';
import { godHero } from './_helpers';

// The beat a fallen WORLD boss gets in the live game (TickContext.animateBossDown): the stage waits while its
// death is seen; the win is banked at the kill. Headless contexts (probes, the other tests) never see it.

const headless: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: [] };
const live: TickContext = { ...headless, animateBossDown: true };

/** A god hero facing world 1's boss (stage 10), W-9 already beaten. */
function atWorldBoss(seed: number): Simulation {
  const world = createWorld(seed, [godHero()]);
  world.globalStageIndex = 9;
  world.maxClearedStage = 9;
  const sim = new Simulation(world);
  expect(sim.enterZoneBoss()).toBe(true);
  return sim;
}

/** Tick until the boss is dead (or give up); returns the ticks it took. */
function killBoss(sim: Simulation, ctx: TickContext): number {
  for (let i = 1; i <= 6000; i++) {
    sim.tick(ctx);
    if (sim.world.enemies.length > 0 && sim.world.enemies.every((e) => !e.alive)) return i;
    if (sim.world.globalStageIndex !== 10) return i;
  }
  throw new Error('the boss never fell');
}

describe('the boss-down beat', () => {
  it('headless: the clear is instant, as before', () => {
    const sim = atWorldBoss(11);
    killBoss(sim, headless);
    expect(sim.world.bossDown).toBeUndefined();
    expect(sim.world.globalStageIndex).toBe(11); // already in the next world
  });

  it('live: the win is banked at the kill and the stage waits for the whole beat', () => {
    const sim = atWorldBoss(11);
    const w = sim.world;
    killBoss(sim, live);
    expect(w.bossDown).toMatchObject({ ms: 0, totalMs: BOSS_DOWN_MS.worldBoss, firstClear: true });
    expect(w.maxClearedStage).toBe(10); // banked now: closing the game mid-beat loses nothing
    expect(w.globalStageIndex).toBe(10); // still in its world
    expect(w.phase).toBe('zoneBoss');
    const corpse = w.enemies[0];
    const ticks = Math.ceil(BOSS_DOWN_MS.worldBoss / TICK_MS);
    for (let i = 0; i < ticks - 1; i++) sim.tick(live);
    expect(w.globalStageIndex).toBe(10);
    expect(w.enemies[0]).toBe(corpse); // the fallen boss is still on the field
    sim.tick(live);
    expect(w.bossDown).toBeUndefined();
    expect(w.globalStageIndex).toBe(11); // first clear → the next world's first stage
    expect(w.phase).toBe('advancing');
  });

  it('live: rewards are granted at the kill, not at the end of the beat', () => {
    const sim = atWorldBoss(12);
    const w = sim.world;
    w.pending.gold = 0;
    w.pending.xp = 0;
    w.pending.bossKills = 0;
    // Tick until the killing blow; pending is drained by the engine every frame, so count what one tick adds.
    killBoss(sim, live);
    expect(w.pending.bossKills).toBe(1);
    const gold = w.pending.gold;
    const xp = w.pending.xp;
    expect(gold).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) sim.tick(live);
    expect(w.pending.gold).toBe(gold); // nothing more during the beat
    expect(w.pending.xp).toBe(xp);
    expect(w.pending.bossKills).toBe(1);
  });

  it('live: a re-clear waits too, then drops back to W-9', () => {
    const sim = atWorldBoss(13);
    const w = sim.world;
    w.maxClearedStage = 10; // already beaten: farming it
    killBoss(sim, live);
    expect(w.bossDown?.firstClear).toBe(false);
    for (let i = 0; i < Math.ceil(BOSS_DOWN_MS.worldBoss / TICK_MS); i++) sim.tick(live);
    expect(w.globalStageIndex).toBe(9);
    expect(w.maxClearedStage).toBe(10);
  });

  it('live: travelling away ends the beat and keeps the win', () => {
    const sim = atWorldBoss(14);
    const w = sim.world;
    killBoss(sim, live);
    sim.travelTo(3);
    expect(w.bossDown).toBeUndefined();
    expect(w.globalStageIndex).toBe(3);
    expect(w.maxClearedStage).toBe(10);
  });

  it('no rng is drawn during the beat (the stream is where the kill left it)', () => {
    const sim = atWorldBoss(15);
    killBoss(sim, live);
    const state = sim.world.rngState;
    for (let i = 0; i < 10; i++) sim.tick(live);
    expect(sim.world.rngState).toBe(state);
  });

  it('a stage boss gets no beat (its stage is in the same world)', () => {
    expect(BOSS_DOWN_MS.stageBoss).toBe(0);
  });
});

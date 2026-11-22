import { describe, expect, it } from 'vitest';
import { getBonuses } from '@/sim/bonuses';
import { newClock } from '@/sim/stripEvents';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { godHero } from './_helpers';

// The strip events (user, 2026-11-21): a runaway chest and a wandering merchant, about every 12 minutes of live
// play, never in away-time or the probes, on their own stream.

const bonuses = getBonuses({}, {});
const live: TickContext = { bonuses, ownedPetKeys: [], retryStage: true, stripEvents: true };

// The strip events' long live run (the slow tier: `npm run test:slow`).
describe('strip events', () => {
  it('the clock runs only in live play, and the combat stream does not move with it', () => {
    const run = (ctx: TickContext): { stage: number; rng: number; count: number } => {
      const world = createWorld(5, [godHero('h0'), godHero('h1')]);
      world.stripEvents = newClock(5, 0);
      const sim = new Simulation(world);
      for (let i = 0; i < (40 * 60_000) / TICK_MS; i++) sim.tick(ctx);
      return { stage: world.globalStageIndex, rng: world.rngState, count: world.stripEvents.count };
    };
    const off = run({ ...live, stripEvents: false });
    const on = run(live);
    expect(off.count).toBe(0);
    expect(on.count).toBeGreaterThanOrEqual(2); // 40 minutes: two to five events
    expect(on.count).toBeLessThanOrEqual(5);
    expect(on.rng).toBe(off.rng); // the same fight, byte for byte
    expect(on.stage).toBe(off.stage);
    expect(run({ ...live, offline: true }).count).toBe(0); // never away-time
  });
});

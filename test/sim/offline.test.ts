import { describe, it, expect } from 'vitest';
import { simulateOffline } from '@/sim/offline';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant } from '@/sim/loadout';
import { getBonuses } from '@/sim/bonuses';
import { CHEST_CONFIG } from '@/data/chests';

function makeSim(): Simulation {
  const hero = buildHeroCombatant(
    { id: 'h1', classKey: 'knight', level: 10, equipment: {}, talents: { knight_guard: 1 } },
    [],
  );
  const world = createWorld(777, [hero]);
  world.globalStageIndex = 4;
  return new Simulation(world);
}

const baseCtx = (offlineMult: number): TickContext => ({
  bonuses: { ...getBonuses({}, []), offlineMult },
  ownedPetKeys: [],
});

const THIRTY_MIN = 30 * 60 * 1000;

describe('offline catch-up', () => {
  it('yields gold/xp over time and respects per-type chest caps', () => {
    const summary = simulateOffline(makeSim(), baseCtx(1), THIRTY_MIN);
    expect(summary.gold).toBeGreaterThan(0);
    expect(summary.xp).toBeGreaterThan(0);
    expect(summary.toStage).toBeGreaterThanOrEqual(1); // may retreat if undergeared
    for (const c of summary.chests) {
      expect(c.count).toBeLessThanOrEqual(CHEST_CONFIG.capacity[c.type]);
    }
  });

  it('is deterministic from the seed', () => {
    const a = simulateOffline(makeSim(), baseCtx(1), THIRTY_MIN);
    const b = simulateOffline(makeSim(), baseCtx(1), THIRTY_MIN);
    expect(a).toEqual(b);
  });

  it('scales gold/xp by offlineMult', () => {
    const single = simulateOffline(makeSim(), baseCtx(1), THIRTY_MIN);
    const doubled = simulateOffline(makeSim(), baseCtx(2), THIRTY_MIN);
    expect(doubled.gold).toBeGreaterThan(single.gold * 1.9);
  });

  it('caps elapsed time at 12 hours', () => {
    const summary = simulateOffline(makeSim(), baseCtx(1), 100 * 60 * 60 * 1000);
    expect(summary.cappedMs).toBe(12 * 60 * 60 * 1000);
  });
});

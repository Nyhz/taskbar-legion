import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant } from '@/sim/loadout';
import { getBonuses } from '@/sim/bonuses';
import { paperHero } from './_helpers';

const ctx: TickContext = { bonuses: getBonuses({}, []), ownedPetKeys: [] };

function snapshot(sim: Simulation): string {
  const w = sim.world;
  return JSON.stringify({
    stage: w.globalStageIndex,
    waves: w.wavesThisStage,
    phase: w.phase,
    rng: w.rngState,
    gold: w.pending.gold,
    hp: w.heroes.map((h) => Math.round(h.hp)),
    enemyHp: w.enemies.map((e) => Math.round(e.hp)),
  });
}

describe('combat', () => {
  it('is deterministic: same seed + same initial state ⇒ identical stream', () => {
    const makeSim = (): Simulation => {
      const hero = buildHeroCombatant(
        { id: 'h1', classKey: 'knight', level: 5, equipment: {}, talents: { knight_guard: 1 } },
        [],
      );
      return new Simulation(createWorld(20240531, [hero]));
    };
    const a = makeSim();
    const b = makeSim();
    for (let i = 0; i < 1500; i++) {
      a.tick(ctx);
      b.tick(ctx);
    }
    expect(snapshot(a)).toBe(snapshot(b));
  });

  it('on party wipe, retreats one stage and revives (no permadeath)', () => {
    const world = createWorld(3, [paperHero()]);
    world.globalStageIndex = 49; // far beyond the paper hero's power (X-9, normal waves; not the X-10 boss gate)
    const sim = new Simulation(world);
    let retreated = false;
    for (let i = 0; i < 3000; i++) {
      sim.tick(ctx);
      if (world.globalStageIndex < 49) {
        retreated = true;
        break;
      }
    }
    expect(retreated).toBe(true);
    expect(world.heroes[0]?.alive).toBe(true); // revived after retreat
  });
});

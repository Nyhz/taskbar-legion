import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant } from '@/sim/loadout';
import { heroAttack } from '@/sim/combat';
import { aggregate } from '@/sim/stats';
import { makeRng } from '@/sim/rng';
import { classDef } from '@/data/classes';
import { getBonuses } from '@/sim/bonuses';
import { paperHero } from './_helpers';
import type { Combatant, CombatEvent } from '@/sim/world';

function unit(over: Partial<Combatant> & { id: string; side: 'hero' | 'enemy' }): Combatant {
  return {
    classKey: 'knight', hp: 1000, maxHp: 1000, baseStats: {}, staticMods: [], effects: [],
    cooldowns: {}, attackTimerMs: 0, x: 0, range: 30, moveSpeed: 0, abilities: [], alive: true,
    ...over,
  };
}

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

  it('Priest auto-attack splashes 50% to nearby enemies (full to primary, nothing outside radius)', () => {
    // The Priest carries autoSplash {coeff:0.5, radius:45} (data/classes.ts).
    expect(classDef('priest').autoSplash).toEqual({ coeff: 0.5, radius: 45 });
    // crit forced to 0 so the primary↔splash ratio is exactly the coeff (no crit noise).
    const priest = unit({
      id: 'p', side: 'hero', classKey: 'priest', x: 100,
      baseStats: { attackDamage: 100, critChance: 0, damageIncrease: 0 },
      autoSplash: { coeff: 0.5, radius: 45 },
    });
    const stats = aggregate(priest.baseStats, []);
    const primary = unit({ id: 'e0', side: 'enemy', x: 100, hp: 1e9, maxHp: 1e9 }); // the target
    const near = unit({ id: 'e1', side: 'enemy', x: 135, hp: 1e9, maxHp: 1e9 }); // within 45px → splashed
    const far = unit({ id: 'e2', side: 'enemy', x: 160, hp: 1e9, maxHp: 1e9 }); // 60px away → spared
    const enemies = [primary, near, far];
    const events: CombatEvent[] = [];
    heroAttack(priest, stats, primary, enemies, makeRng(7), events);

    const dmgTo = (id: string): number => events.filter((e) => e.type === 'damage' && e.targetId === id).reduce((s, e) => s + (e.amount ?? 0), 0);
    expect(dmgTo('e0')).toBeCloseTo(100, 5); // primary: full 100
    expect(dmgTo('e1')).toBeCloseTo(50, 5); // nearby: 50%
    expect(dmgTo('e2')).toBe(0); // outside radius: untouched
    expect(events.find((e) => e.targetId === 'e1')?.splash).toBe(true); // tagged splash
    expect(far.hp).toBe(1e9); // truly unharmed
  });

  it('a single-target class (knight) draws no splash and leaves clustered enemies alone', () => {
    const knight = unit({ id: 'k', side: 'hero', classKey: 'knight', x: 100, baseStats: { attackDamage: 100, critChance: 0, multistrike: 0 } });
    expect(classDef('knight').autoSplash).toBeUndefined();
    const primary = unit({ id: 'e0', side: 'enemy', x: 100, hp: 1e9, maxHp: 1e9 });
    const near = unit({ id: 'e1', side: 'enemy', x: 110, hp: 1e9, maxHp: 1e9 });
    const events: CombatEvent[] = [];
    heroAttack(knight, aggregate(knight.baseStats, []), primary, [primary, near], makeRng(7), events);
    expect(near.hp).toBe(1e9); // no splash without autoSplash
    expect(events.filter((e) => e.type === 'damage')).toHaveLength(1); // exactly the one primary hit
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

import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { makeRng } from '@/sim/rng';
import { TICK_MS } from '@/sim/Simulation';
import type { Combatant, CombatEvent } from '@/sim/world';
import { base, unit } from './_kit';

// Round 12 (2026-11-17; user: «arreglar y reafinar todo»): the swing timer keeps the overflow of a tick and lets a
// combatant faster than the tick swing several times in it, so the real swings a second ARE the attack speed — before,
// the interval rounded up to whole ticks (9.65 a second swung 5 times).

function swingsPerSec(attackSpeed: number): number {
  const hero = unit({ id: 'h', side: 'hero', hp: 1e9, maxHp: 1e9, x: 0, range: 400, baseStats: base({ health: 1e9, attackDamage: 1, attackSpeed, critChance: 0, multistrike: 0 }), attackTimerMs: 0 });
  const dummy = unit({ id: 'd', side: 'enemy', hp: 1e15, maxHp: 1e15, x: 30, range: 0, enemyDamage: 0, enemyAttackSpeed: 0.05, attackTimerMs: 1e12 });
  const world = createWorld(7, [hero]);
  world.globalStageIndex = 5;
  world.enemies = [dummy];
  world.phase = 'fighting';
  const rng = makeRng(3);
  const seconds = 60;
  let swings = 0;
  for (let t = 0; t < (seconds * 1000) / TICK_MS; t++) {
    const events: CombatEvent[] = resolveCombatTick(world, TICK_MS, rng);
    swings += events.filter((e) => e.type === 'damage' && e.sourceId === 'h' && e.targetId === 'd' && e.multi !== true && e.splash !== true).length;
  }
  return swings / seconds;
}

describe('the swing timer', () => {
  it.each([2.4, 4.9, 9.65, 15])('swings %s times a second when its attack speed says so (±1 %)', (as) => {
    const real = swingsPerSec(as);
    expect(Math.abs(real / as - 1)).toBeLessThan(0.01);
  });

  it('a combatant with nothing to swing at stays ready without banking the wait', () => {
    const hero: Combatant = unit({ id: 'h', side: 'hero', hp: 100, maxHp: 100, baseStats: base({ health: 100, attackSpeed: 5 }), attackTimerMs: 0 });
    const world = createWorld(7, [hero]);
    world.enemies = [];
    world.phase = 'fighting';
    for (let t = 0; t < 20; t++) resolveCombatTick(world, TICK_MS, makeRng(1));
    expect(hero.attackTimerMs).toBe(0);
  });
});

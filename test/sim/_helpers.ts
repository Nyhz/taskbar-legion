import type { Combatant } from '@/sim/world';

// A near-invincible hero that one-shots anything — used to drive stage flow in
// tests without depending on combat balance.
export function godHero(id = 'h1'): Combatant {
  return {
    id,
    side: 'hero',
    classKey: 'knight',
    hp: 1e15,
    maxHp: 1e15,
    baseStats: { attackDamage: 1e12, health: 1e15, attackSpeed: 5, armor: 1e12 },
    staticMods: [],
    effects: [],
    cooldowns: {},
    attackTimerMs: 0,
    x: 0,
    range: 30,
    moveSpeed: 0,
    abilities: [],
    alive: true,
  };
}

// A deliberately fragile hero that dies quickly to high-stage enemies.
export function paperHero(id = 'h1'): Combatant {
  return {
    id,
    side: 'hero',
    classKey: 'knight',
    hp: 30,
    maxHp: 30,
    baseStats: { attackDamage: 1, health: 30, attackSpeed: 0.5, armor: 0 },
    staticMods: [],
    effects: [],
    cooldowns: {},
    attackTimerMs: 0,
    x: 0,
    range: 30,
    moveSpeed: 0,
    abilities: [],
    alive: true,
  };
}

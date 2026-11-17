import { describe, it, expect } from 'vitest';
import { createWorld, TICK_MS } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { makeRng } from '@/sim/rng';
import { CADENCE, cadenceHitMult, heroSwingsPerSec } from '@/data/cadence';
import type { CombatEvent } from '@/sim/world';
import { base, unit } from './_kit';

// Round 12 (2026-11-17; user: «curva suave»): a hero swings what the cadence curve gives; each hit carries the rest,
// so the damage a second from attack speed is unchanged.

describe('the cadence curve', () => {
  it('gives the Ranger the preview the user approved', () => {
    expect(heroSwingsPerSec('ranger', 1.5)).toBeCloseTo(1.5, 9);
    expect(heroSwingsPerSec('ranger', 3)).toBeCloseTo(2.3, 1);
    expect(heroSwingsPerSec('ranger', 5)).toBeCloseTo(2.7, 1);
    expect(heroSwingsPerSec('ranger', 10)).toBeCloseTo(3.0, 1);
  });

  it('is the speed itself up to the class\'s base, then rises ever more slowly toward its pace — the Ranger the fastest', () => {
    for (const [cls, c] of Object.entries(CADENCE)) {
      expect(heroSwingsPerSec(cls, c.start * 0.8)).toBeCloseTo(c.start * 0.8, 9);
      let prev = heroSwingsPerSec(cls, c.start);
      let prevGain = Number.POSITIVE_INFINITY;
      for (let raw = c.start + 0.25; raw <= 20; raw += 0.25) {
        const s = heroSwingsPerSec(cls, raw);
        expect(s).toBeGreaterThan(prev);
        expect(s).toBeLessThan(c.pace);
        expect(s - prev).toBeLessThanOrEqual(prevGain + 1e-12);
        prevGain = s - prev;
        prev = s;
      }
    }
    for (const raw of [3, 5, 10]) {
      expect(heroSwingsPerSec('ranger', raw)).toBeGreaterThan(heroSwingsPerSec('knight', raw));
      expect(heroSwingsPerSec('knight', raw)).toBeGreaterThan(heroSwingsPerSec('priest', raw));
    }
    expect(heroSwingsPerSec(undefined, 10)).toBe(10); // a foe: its raw speed
  });

  it.each([1.5, 3, 5, 10])('keeps the damage a second of a Ranger at %s attacks/s (±1 %)', (raw) => {
    const hero = unit({ id: 'h', side: 'hero', classKey: 'ranger', hp: 1e9, maxHp: 1e9, x: 0, range: 400, baseStats: base({ health: 1e9, attackDamage: 100, attackSpeed: raw, critChance: 0, multistrike: 0 }), attackTimerMs: 0 });
    const dummy = unit({ id: 'd', side: 'enemy', hp: 1e15, maxHp: 1e15, x: 30, range: 0, enemyDamage: 0, enemyAttackSpeed: 0.05, attackTimerMs: 1e12 });
    const world = createWorld(7, [hero]);
    world.globalStageIndex = 5;
    world.enemies = [dummy];
    world.phase = 'fighting';
    const rng = makeRng(3);
    const seconds = 60;
    let dealt = 0;
    let swings = 0;
    for (let t = 0; t < (seconds * 1000) / TICK_MS; t++) {
      for (const e of resolveCombatTick(world, TICK_MS, rng) as CombatEvent[]) {
        if (e.type === 'damage' && e.sourceId === 'h' && e.targetId === 'd' && e.splash !== true) {
          dealt += e.amount ?? 0;
          swings += 1;
        }
      }
    }
    expect(Math.abs(dealt / seconds / (100 * raw) - 1)).toBeLessThan(0.01);
    expect(Math.abs(swings / seconds / heroSwingsPerSec('ranger', raw) - 1)).toBeLessThan(0.01);
    expect(cadenceHitMult('ranger', raw)).toBeCloseTo(raw / heroSwingsPerSec('ranger', raw), 9);
  });
});

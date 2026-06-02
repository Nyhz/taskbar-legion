import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { resumeStageFor, highestUnlockedWorld, worldFirstStage } from '@/data/stageScaling';
import { godHero } from './_helpers';

const ctx: TickContext = { bonuses: getBonuses({}, []), ownedPetKeys: [] };

describe('zone-key gate (W-10)', () => {
  it('W-9 does not auto-advance to W-10 without a key', () => {
    const world = createWorld(1, [godHero()]);
    world.globalStageIndex = 9;
    const sim = new Simulation(world);
    let maxStage = 9;
    let sawZoneBoss = false;
    for (let i = 0; i < 2000; i++) {
      sim.tick(ctx);
      maxStage = Math.max(maxStage, world.globalStageIndex);
      if (world.phase === 'zoneBoss') sawZoneBoss = true;
    }
    expect(maxStage).toBe(9); // never reached W-10
    expect(sawZoneBoss).toBe(false);
  });

  it('enterZoneBoss spends a key, enters W-10; win advances to (W+1)-1; keys stockpile', () => {
    const world = createWorld(2, [godHero()]);
    world.globalStageIndex = 9; // stage 9 is in world 1
    world.zoneKeys = { 1: 3 }; // three keys stockpiled for world 1
    const sim = new Simulation(world);
    // Beat W-9 first so the gate opens (maxClearedStage reaches 9).
    for (let i = 0; i < 4000 && world.maxClearedStage < 9; i++) sim.tick(ctx);
    expect(world.maxClearedStage).toBe(9);
    // Can't enter another zone's boss (no key there), and entry needs a held key.
    expect(sim.enterZoneBoss(5)).toBe(false);
    // Spend a key to enter world 1's W-10 boss.
    expect(sim.enterZoneBoss()).toBe(true);
    expect(world.globalStageIndex).toBe(10);
    expect(world.phase).toBe('zoneBoss');
    expect(world.zoneKeys[1]).toBe(2); // one of three spent on entry
    // Win the world boss → advance to (W+1)-1 = 11; the remaining keys stockpile.
    let reached11 = false;
    for (let i = 0; i < 4000; i++) {
      sim.tick(ctx);
      if (world.globalStageIndex >= 11) { reached11 = true; break; }
    }
    expect(reached11).toBe(true);
    expect(world.zoneKeys[1]).toBe(2);
  });
});

describe('travel unlocks + frontier resume', () => {
  it('beating stage bosses raises maxClearedStage monotonically', () => {
    const world = createWorld(3, [godHero()]);
    world.globalStageIndex = 1;
    const sim = new Simulation(world);
    for (let i = 0; i < 6000 && world.globalStageIndex < 4; i++) sim.tick(ctx);
    // We've cleared at least stages 1..3's bosses to be sitting on stage ≥4.
    expect(world.globalStageIndex).toBeGreaterThanOrEqual(4);
    expect(world.maxClearedStage).toBe(world.globalStageIndex - 1);
  });

  it('travelTo jumps the stage but never lowers maxClearedStage', () => {
    const world = createWorld(4, [godHero()]);
    world.globalStageIndex = 1;
    const sim = new Simulation(world);
    for (let i = 0; i < 6000 && world.maxClearedStage < 3; i++) sim.tick(ctx);
    const cleared = world.maxClearedStage;
    expect(cleared).toBeGreaterThanOrEqual(3);

    sim.travelTo(2); // farm an earlier zone
    expect(world.globalStageIndex).toBe(2);
    expect(world.maxClearedStage).toBe(cleared); // unchanged — frontier preserved
    expect(world.phase).toBe('advancing');
    expect(world.heroes.every((h) => h.alive && h.hp === h.maxHp)).toBe(true);
  });

  it('resumeStageFor: next stage normally, holds at W-9 (key gate), advances past W-10', () => {
    expect(resumeStageFor(0)).toBe(1); // fresh game
    expect(resumeStageFor(4)).toBe(5); // beat 1-4 → 1-5
    expect(resumeStageFor(9)).toBe(9); // beat 1-9 → stay (W-10 is key-gated)
    expect(resumeStageFor(20)).toBe(21); // beat 2-10 → 3-1
  });

  it('highestUnlockedWorld / worldFirstStage define the travel set', () => {
    expect(highestUnlockedWorld(0)).toBe(0); // nothing cleared
    expect(highestUnlockedWorld(4)).toBe(1); // cleared into world 1
    expect(highestUnlockedWorld(21)).toBe(3); // cleared 3-1 → world 3 unlocked
    expect(worldFirstStage(3)).toBe(21); // 3-1
  });
});

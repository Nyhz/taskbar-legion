import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { activeHeroAbilities } from '@/sim/loadout';
import { RESPAWN_MS } from '@/data/field';
import { godHero } from './_helpers';

const ctx: TickContext = { bonuses: getBonuses({}, []), ownedPetKeys: [] };
const RESPAWN_TICKS = RESPAWN_MS / 100;

describe('death → respawn', () => {
  it('revives a fallen hero after RESPAWN_MS while an ally survives', () => {
    const dead = godHero('h0');
    const alive = godHero('h1');
    // The surviving ally must NOT be able to clear the stage: a stage advance runs
    // reviveParty(), which revives EVERY hero (cancelling in-flight respawns) — that's a
    // different revive path and would mask the timer we're testing. Zero its attack so it
    // tanks forever without killing anything; the stage stays in progress the whole time.
    alive.baseStats = { ...alive.baseStats, attackDamage: 0 };
    const world = createWorld(1, [dead, alive]);
    const sim = new Simulation(world);

    // h0 falls; h1 (an unkillable, harmless ally) keeps the party standing.
    dead.alive = false;
    dead.hp = 0;
    dead.respawnMs = RESPAWN_MS;

    // Just before the timer elapses it's still down…
    for (let i = 0; i < RESPAWN_TICKS - 2; i++) sim.tick(ctx);
    expect(dead.alive).toBe(false);

    // …and shortly after, it's back at full HP with the timer cleared.
    for (let i = 0; i < 4; i++) sim.tick(ctx);
    expect(dead.alive).toBe(true);
    expect(dead.hp).toBe(dead.maxHp);
    expect(dead.respawnMs).toBeUndefined();
  });

  it('does NOT respawn mid-timer if the whole party is down (wipe handles it)', () => {
    const a = godHero('h0');
    const b = godHero('h1');
    const world = createWorld(1, [a, b]);
    const sim = new Simulation(world);
    world.phase = 'fighting';
    for (const h of [a, b]) { h.alive = false; h.hp = 0; h.respawnMs = RESPAWN_MS; }

    sim.tick(ctx); // all dead → handleWipe revives everyone immediately, not via the 60s timer
    expect(a.alive).toBe(true);
    expect(b.alive).toBe(true);
    expect(a.respawnMs).toBeUndefined();
  });
});

describe('wipe retreat ↔ RETRY toggle', () => {
  function stageAfterWipe(stage: number, retryStage: boolean): number {
    const a = godHero('h0');
    const b = godHero('h1');
    const world = createWorld(1, [a, b]);
    world.globalStageIndex = stage;
    world.phase = 'fighting';
    for (const h of [a, b]) { h.alive = false; h.hp = 0; }
    new Simulation(world).tick({ ...ctx, retryStage });
    return world.globalStageIndex;
  }

  it('retreats one stage on a wipe when RETRY is off (default)', () => {
    expect(stageAfterWipe(3, false)).toBe(2);
  });

  it('keeps the party on its stage on a wipe when RETRY is on', () => {
    expect(stageAfterWipe(3, true)).toBe(3);
  });
});

describe('active abilities (≤2)', () => {
  const talents = { warrior_guard: 1, warrior_debilitate: 1, warrior_bulwark: 1 }; // 3 abilities unlocked

  it('undefined selection (harness) fires the whole kit', () => {
    expect(activeHeroAbilities('warrior', talents, undefined)).toHaveLength(3);
  });

  it('empty selection (live default) fires the first two unlocked', () => {
    expect(activeHeroAbilities('warrior', talents, [])).toHaveLength(2);
  });

  it('an explicit selection fires exactly those (capped at 2, in order)', () => {
    const chosen = activeHeroAbilities('warrior', talents, ['warrior_bulwark', 'warrior_guard', 'warrior_debilitate']);
    expect(chosen.map((a) => a.def.key)).toEqual(['warrior_bulwark', 'warrior_guard']);
  });

  it('ignores selected keys the hero has not ranked', () => {
    const chosen = activeHeroAbilities('warrior', { warrior_guard: 1 }, ['warrior_debilitate', 'warrior_guard']);
    expect(chosen.map((a) => a.def.key)).toEqual(['warrior_guard']);
  });
});

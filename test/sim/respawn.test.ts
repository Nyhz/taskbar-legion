import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { activeHeroAbilities } from '@/sim/loadout';
import { RESPAWN_MS, WIPE_TOTAL_MS } from '@/data/field';
import { godHero } from './_helpers';

const ctx: TickContext = { bonuses: getBonuses({}, []), ownedPetKeys: [] };
const animCtx: TickContext = { ...ctx, animateWipe: true }; // live-game wipe cinematic
const WIPE_TICKS = WIPE_TOTAL_MS / 100; // ticks the cinematic runs before the party respawns
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

  it('plays the wipe cinematic — the party stays dead through it, then revives at the end', () => {
    const a = godHero('h0');
    const b = godHero('h1');
    const world = createWorld(1, [a, b]);
    const sim = new Simulation(world);
    world.phase = 'fighting';
    for (const h of [a, b]) { h.alive = false; h.hp = 0; h.respawnMs = RESPAWN_MS; }

    sim.tick(animCtx); // all dead → starts the cinematic (party held dead so death anims play)
    expect(a.alive).toBe(false);
    expect(world.wipeMs).toBeDefined();

    for (let i = 0; i < WIPE_TICKS + 1; i++) sim.tick(animCtx); // run out the cinematic → revive together
    expect(world.wipeMs).toBeUndefined();
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
    // No death-hold here (probe-style ctx) → the wipe retreats instantly the same tick.
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
  const talents = { knight_guard: 1, knight_debilitate: 1, knight_bulwark: 1 }; // 3 abilities unlocked

  it('undefined selection (full-kit probe) fires the whole kit', () => {
    expect(activeHeroAbilities('knight', talents, undefined)).toHaveLength(3);
  });

  it('empty selection (live) fires NOTHING — unselecting an ability stops it', () => {
    expect(activeHeroAbilities('knight', talents, [])).toHaveLength(0);
  });

  it('empty selection WITH autoDefault (balance harness) fires the first two unlocked', () => {
    expect(activeHeroAbilities('knight', talents, [], true)).toHaveLength(2);
  });

  it('an explicit selection fires exactly those (capped at 2, in order)', () => {
    const chosen = activeHeroAbilities('knight', talents, ['knight_bulwark', 'knight_guard', 'knight_debilitate']);
    expect(chosen.map((a) => a.def.key)).toEqual(['knight_bulwark', 'knight_guard']);
  });

  it('ignores selected keys the hero has not ranked', () => {
    const chosen = activeHeroAbilities('knight', { knight_guard: 1 }, ['knight_debilitate', 'knight_guard']);
    expect(chosen.map((a) => a.def.key)).toEqual(['knight_guard']);
  });
});

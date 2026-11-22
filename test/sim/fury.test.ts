import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { spawnZoneBoss } from '@/sim/stages';
import { resolveCombatTick } from '@/sim/combat';
import { makeRng } from '@/sim/rng';
import { globalStageOf } from '@/data/difficulties';
import { BOSS_FURY_GRACE_MS, OPENING_ENRAGE_MS, ZONE_ENRAGE_MS, zoneEnrageMs } from '@/data/stageScaling';
import type { Combatant } from '@/sim/world';
import { base, unit } from './_kit';

// Round 10 (2026-11-17): from Torment a world boss's enrage has an end — BOSS_FURY_GRACE_MS past its window its fury
// wipes the party (held at Eternal's — none — through Torment 1–2 like the rest of a difficulty's new pressure).

const hero = (id: string): Combatant => unit({ id, side: 'hero', hp: 1e9, maxHp: 1e9, baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1 }) });

function wallAt(S: number): Combatant | undefined {
  const w = createWorld(7, [hero('tank'), hero('back')]);
  w.globalStageIndex = S;
  w.phase = 'fighting';
  spawnZoneBoss(w, makeRng(1));
  return w.enemies[0];
}

describe('the fury', () => {
  it('is a Torment world boss\'s, from world 3, and no one else\'s', () => {
    expect(wallAt(globalStageOf(3, 5, 10))?.furyMs).toBeUndefined();
    expect(wallAt(globalStageOf(4, 2, 10))?.furyMs).toBeUndefined();
    expect(wallAt(globalStageOf(4, 5, 10))?.furyMs).toBe(ZONE_ENRAGE_MS + BOSS_FURY_GRACE_MS[4]);
  });

  it('wipes every hero standing once the fight reaches it', () => {
    const tank = hero('tank');
    const back = hero('back');
    const boss = unit({ id: 'boss', side: 'enemy', isBoss: true, hp: 1e12, maxHp: 1e12, x: 20, range: 400, enemyDamage: 0, enemyAttackSpeed: 0.01, fightMs: 63_950, enrageMs: 60_000, furyMs: 64_000, attackTimerMs: 1e9 });
    const world = createWorld(7, [tank, back]);
    world.globalStageIndex = globalStageOf(4, 5, 10);
    world.enemies = [boss];
    world.phase = 'fighting';
    resolveCombatTick(world, 100, makeRng(3));
    expect(world.heroes.every((h) => !h.alive)).toBe(true);
  });
});

// Round 11 gave a difficulty's opening wall a longer clock; retired 2026-11-22 (user: each world a little harder than
// the one before — the wall curve eases a difficulty in instead). Every wall has the same clock.
describe('the opening wall', () => {
  it('has the usual clock, like every other wall', () => {
    expect(OPENING_ENRAGE_MS).toBe(ZONE_ENRAGE_MS);
    for (const d of [0, 1, 2, 3, 4]) for (const w of [1, 2]) expect(zoneEnrageMs(globalStageOf(d, w, 10))).toBe(ZONE_ENRAGE_MS);
    expect(wallAt(globalStageOf(3, 1, 10))?.enrageMs).toBe(ZONE_ENRAGE_MS);
  });
});

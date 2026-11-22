import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { spawnZoneBoss } from '@/sim/stages';
import { resolveCombatTick } from '@/sim/combat';
import { makeRng } from '@/sim/rng';
import { abilityDef, worldBossAbilityKeys } from '@/data/abilities';
import { BACK_SPLASH_SHARE } from '@/data/bossKit';
import { globalStageOf } from '@/data/difficulties';
import { expectedDefense } from '@/data/stageScaling';
import { areaBlowSplash } from '@/sim/enemyScale';
import { referenceParty } from '@/sim/reference';
import type { Combatant, CombatEvent } from '@/sim/world';
import { base, unit } from './_kit';

// Round 8 (2026-11-17; user: «sí» to anchoring the area blow on the back line): from Inferno a world boss's
// shockwave takes, from each hero behind the front one, a fixed share of the TYPICAL back-line hero's life at that wall
// (data/bossKit BACK_SPLASH_SHARE × sim/reference backLife, since the power curve) through on-level defence.

const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1e9, maxHp: 1e9, baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1 }), ...over });

describe('the area blow on the back line', () => {
  it('is anchored from Inferno — a world boss carries it, before Inferno it keeps the formula', () => {
    expect(BACK_SPLASH_SHARE[0]).toBe(0);
    expect(BACK_SPLASH_SHARE[1]).toBe(0);
    for (const d of [2, 3, 4]) expect(BACK_SPLASH_SHARE[d]).toBeGreaterThan(0);
    const wallAt = (S: number): Combatant | undefined => {
      const w = createWorld(7, [hero('tank'), hero('back')]);
      w.globalStageIndex = S;
      w.phase = 'fighting';
      spawnZoneBoss(w, makeRng(1));
      return w.enemies[0];
    };
    expect(wallAt(globalStageOf(1, 5, 10))?.backSplash).toBeUndefined();
    const S = globalStageOf(3, 5, 10);
    expect(wallAt(S)?.backSplash).toBeCloseTo(areaBlowSplash(S, BACK_SPLASH_SHARE[3]), 6);
    expect(referenceParty(S).backLife).toBeGreaterThan(0);
  });

  it('takes its share of the average back-line life from a hero who wears on-level defence, more from one who wears none', () => {
    const S = globalStageOf(3, 5, 10);
    const share = BACK_SPLASH_SHARE[3];
    const life = referenceParty(S).backLife;
    const blow = abilityDef(worldBossAbilityKeys()[0] ?? 'boss_shockwave');
    const onLevel = expectedDefense(S);
    const boss = unit({ id: 'boss', side: 'enemy', isBoss: true, hp: 1e12, maxHp: 1e12, x: 20, range: 400, enemyDamage: 1, enemyAttackSpeed: 1, magicShare: 0.5, backSplash: areaBlowSplash(S, share), fightMs: 0, enrageMs: Number.POSITIVE_INFINITY, abilities: [{ def: blow, rank: 1 }], attackTimerMs: 100_000 });
    const world = createWorld(7, [
      hero('tank'),
      hero('geared', { baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1, armor: onLevel, magicResist: onLevel }) }),
      hero('bare'),
    ]);
    world.globalStageIndex = S;
    world.enemies = [boss];
    world.phase = 'fighting';
    const rng = makeRng(9);
    const landed: CombatEvent[] = [];
    for (let t = 0; t < 400 && landed.length < 3; t++) {
      for (const ev of resolveCombatTick(world, 100, rng)) if (ev.type === 'damage' && ev.abilityKey === blow.key) landed.push(ev);
    }
    const on = (id: string): number => landed.find((e) => e.targetId === id)?.amount ?? Number.NaN;
    expect(on('geared')).toBeCloseTo(share * life, 3);
    expect(on('bare')).toBeGreaterThan(1.5 * share * life);
  });
});

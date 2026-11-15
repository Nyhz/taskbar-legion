import { describe, expect, it } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { heroAttack, heroStats, resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities } from '@/sim/abilities';
import { applyEffect } from '@/sim/effects';
import { effectDef } from '@/data/effects';
import { abilityDef } from '@/data/abilities';
import { RANGE, RESPAWN_MS } from '@/data/field';
import { buildHeroCombatant, type HeroConfig } from '@/sim/loadout';
import { dealtMult, liveStats } from '@/sim/liveStats';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { anyMoment, base, effect, luckyRng, quietRng, unit } from './_kit';

// The fifteen EFFECT passives (second combat wave, B — agreed 2026-11-15): each one end to end, from the talent
// a hero holds to what happens in the fight. Their figures are per rank; the tests use rank 5 unless they say so.

const TICK = 100;
const cfg = (id: string, classKey: string, talents: Record<string, number>, level = 60): HeroConfig => ({
  id, classKey, level, equipment: {}, talents, activeAbilities: [],
});
/** A hero of the class with these talents that cannot die of the test and has no defences to muddy the numbers. */
function holder(id: string, classKey: string, talents: Record<string, number>, over: Partial<Combatant> = {}): Combatant {
  const h = buildHeroCombatant(cfg(id, classKey, talents), []);
  return { ...h, baseStats: base({ health: 1000, attackDamage: 100, attackSpeed: 0.1 }), staticMods: [], hp: 1000, maxHp: 1000, abilities: [], autoSplash: undefined, ...over };
}
const plainHero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }), ...over });
const foe = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'enemy', hp: 1e9, maxHp: 1e9, x: 20, range: 400, enemyDamage: 100, enemyAttackSpeed: 1, engaged: true, ...over });

function fight(heroes: Combatant[], enemies: Combatant[]): WorldState {
  const world = createWorld(7, heroes);
  world.globalStageIndex = 1;
  world.enemies = enemies;
  world.phase = 'fighting';
  return world;
}
const dealt = (events: readonly CombatEvent[], id: string): number =>
  events.filter((e) => e.type === 'damage' && e.targetId === id).reduce((a, e) => a + (e.amount ?? 0), 0);

describe('Knight', () => {
  it('Guardian: he takes 4% per rank of a hit aimed at a hero behind him, through his own defences', () => {
    const knight = holder('k', 'knight', { knight_guardian: 5 }, { x: 10 });
    const archer = plainHero('r', { x: 0 });
    // A shooter that always aims behind the front hero.
    const world = fight([knight, archer], [foe('s', { backShotChance: 1 })]);
    const events = resolveCombatTick(world, TICK, luckyRngNoBlock());
    expect(dealt(events, 'r')).toBeCloseTo(80, 6); // 100 − 20 %
    expect(dealt(events, 'k')).toBeCloseTo(20, 6); // …which he takes (no armour here)
    expect(events.find((e) => e.targetId === 'k')?.splash).toBe(true); // a number on him, not a swing at him
    // Nothing moves when the hit is aimed at him, or when he is down.
    const solo = fight([holder('k', 'knight', { knight_guardian: 5 })], [foe('s')]);
    expect(dealt(resolveCombatTick(solo, TICK, quietRng()), 'k')).toBeCloseTo(100, 6);
    knight.alive = false;
    const fallen = fight([knight, plainHero('r')], [foe('s')]);
    expect(dealt(resolveCombatTick(fallen, TICK, quietRng()), 'r')).toBeCloseTo(100, 6);
  });

  it('Guardian: the share he takes is cut by HIS armour, not the archer’s', () => {
    const knight = holder('k', 'knight', { knight_guardian: 5 }, { x: 10 });
    knight.baseStats = { ...knight.baseStats, damageReduction: 50 };
    const world = fight([knight, plainHero('r', { x: 0 })], [foe('s', { backShotChance: 1 })]);
    const events = resolveCombatTick(world, TICK, luckyRngNoBlock());
    expect(dealt(events, 'k')).toBeCloseTo(10, 6);
  });

  it('Close Ranks: his allies take 2% less per rank from area blows — not he, not from aimed hits', () => {
    const knight = holder('k', 'knight', { knight_close_ranks: 5 }, { x: 10 });
    const archer = plainHero('r', { x: 0 });
    const brute = foe('b', { enemyAttackSpeed: 0.01, attackTimerMs: 1e9, abilities: [{ def: abilityDef('enemy_smash'), rank: 1 }] });
    const world = fight([knight, archer], [brute]);
    const events = resolveCombatTick(world, TICK, quietRng());
    const onKnight = dealt(events, 'k');
    expect(onKnight).toBeGreaterThan(0);
    const splash = abilityDef('enemy_smash').power?.splashCoeff ?? 0;
    const main = abilityDef('enemy_smash').power?.coeff ?? 0;
    expect(dealt(events, 'r') / onKnight).toBeCloseTo((splash / main) * 0.9, 6);
  });

  it('Shelter: an ally dropping under half its life takes 3% less per rank for 6s — once per drop', () => {
    const knight = holder('k', 'knight', { knight_shelter: 5 }, { x: 10 });
    const archer = plainHero('r', { hp: 600 });
    const world = fight([knight, archer], []);
    resolveCombatTick(world, TICK, quietRng());
    expect(effect(archer, 'buff_shelter')).toBeUndefined();
    archer.hp = 450;
    resolveCombatTick(world, TICK, quietRng());
    expect(effect(archer, 'buff_shelter')).toMatchObject({ value: 15 });
    expect(liveStats(archer).damageReduction).toBe(15);
    expect(effect(archer, 'buff_shelter')?.remainingMs).toBeGreaterThan(5800);
    // Still under the line when it runs out: not given again until it has been back over it.
    archer.effects = [];
    resolveCombatTick(world, TICK, quietRng());
    expect(effect(archer, 'buff_shelter')).toBeUndefined();
    archer.hp = 700;
    resolveCombatTick(world, TICK, quietRng());
    archer.hp = 300;
    resolveCombatTick(world, TICK, quietRng());
    expect(effect(archer, 'buff_shelter')).toBeDefined();
    // He does not shelter himself.
    knight.hp = 100;
    resolveCombatTick(world, TICK, quietRng());
    expect(effect(knight, 'buff_shelter')).toBeUndefined();
  });

  it('Weathered Hide: each blocked hit is 1% less per rank on what follows, to 5; five in a row unblocked lose it all', () => {
    const knight = holder('k', 'knight', { knight_weathered_hide: 2 });
    const world = fight([knight], [foe('g')]);
    const hit = (blocked: boolean): number => {
      for (const e of world.enemies) e.attackTimerMs = 0;
      return dealt(resolveCombatTick(world, TICK, blocked ? luckyRng() : quietRng()), 'k');
    };
    expect(hit(true)).toBeCloseTo(50, 6); // blocked: half, and no stack yet when it landed
    expect(knight.hideStacks).toBe(1);
    expect(hit(false)).toBeCloseTo(98, 6); // 1 stack × 2 %
    for (let i = 0; i < 7; i++) hit(true);
    expect(knight.hideStacks).toBe(5); // capped
    expect(liveStats(knight).damageReduction).toBe(10);
    // One unblocked hit already went by above; a block wipes the count of misses.
    for (let i = 0; i < 4; i++) expect(hit(false)).toBeCloseTo(90, 6);
    expect(knight.hideStacks).toBe(5);
    hit(false); // the fifth in a row
    expect(knight.hideStacks).toBe(0);
    expect(hit(false)).toBeCloseTo(100, 6);
  });

  it('Endurance: a hit for more than 15% of his life is cut 3% per rank; a smaller one is not', () => {
    const knight = holder('k', 'knight', { knight_endurance: 5 });
    const big = fight([knight], [foe('g', { enemyDamage: 200 })]);
    expect(dealt(resolveCombatTick(big, TICK, quietRng()), 'k')).toBeCloseTo(170, 6);
    const small = fight([holder('k', 'knight', { knight_endurance: 5 })], [foe('g', { enemyDamage: 150 })]);
    expect(dealt(resolveCombatTick(small, TICK, quietRng()), 'k')).toBeCloseTo(150, 6);
  });
});

describe('Ranger', () => {
  const shoot = (ranger: Combatant, target: Combatant, enemies: Combatant[] = [target]): CombatEvent[] => {
    const events: CombatEvent[] = [];
    heroAttack(ranger, heroStats(ranger), target, enemies, quietRng(), events, [ranger]);
    return events;
  };

  it('First Blood: +6% per rank on her first hit on each enemy, and only on that one', () => {
    const ranger = holder('r', 'ranger', { ranger_first_blood: 5 });
    const a = foe('a');
    const b = foe('b');
    expect(shoot(ranger, a)[0]?.amount).toBeCloseTo(130, 6);
    expect(shoot(ranger, a)[0]?.amount).toBeCloseTo(100, 6);
    expect(shoot(ranger, b)[0]?.amount).toBeCloseTo(130, 6);
    // Another hero's hit does not spend hers.
    const c = foe('c');
    shoot(holder('k', 'knight', {}), c);
    expect(shoot(ranger, c)[0]?.amount).toBeCloseTo(130, 6);
  });

  it('Countersniper: +4% per rank to enemies that fight from range', () => {
    const ranger = holder('r', 'ranger', { ranger_countersniper: 5 });
    expect(dealtMult(ranger, foe('archer', { range: RANGE.ranged }), 'damage')).toBeCloseTo(1.2, 6);
    expect(dealtMult(ranger, foe('grunt', { range: RANGE.melee }), 'damage')).toBe(1);
    expect(dealtMult(ranger, foe('boss', { range: RANGE.melee + 60, isBoss: true }), 'damage')).toBe(1);
  });

  it('Hemorrhage: her critical hits also leave a bleed worth 4% of that hit per rank over 3s', () => {
    const ranger = holder('r', 'ranger', { ranger_hemorrhage: 5 });
    ranger.baseStats = { ...ranger.baseStats, critChance: 100, critDamage: 100 };
    const crit = (target: Combatant): number => {
      const events: CombatEvent[] = [];
      heroAttack(ranger, heroStats(ranger), target, [target], luckyRng(), events, [ranger]);
      return events[0]?.amount ?? 0;
    };
    const target = foe('g', { hp: 1e6, maxHp: 1e6 });
    expect(crit(target)).toBeCloseTo(200, 6); // 100 × 2
    // 20 % of the 200 over 3 s: a real bleed, 40 in all.
    expect(effect(target, 'fx_hemorrhage')).toMatchObject({ remainingMs: 3000, sourceId: 'r' });
    expect((effect(target, 'fx_hemorrhage')?.value ?? 0) * 3).toBeCloseTo(40, 6);
    expect(effectDef('fx_hemorrhage').kind.type).toBe('dot');
    expect(target.lastHitBy).toBe('r');
    // It ticks like any bleed: a second of it deals a third.
    const world = fight([ranger], [target]);
    ranger.attackTimerMs = 1e9; // she does not shoot meanwhile
    const before = target.hp;
    for (let i = 0; i < 10; i++) resolveCombatTick(world, TICK, quietRng());
    expect(before - target.hp).toBeCloseTo(40 / 3, 4);
    // A weaker crit on a bleeding enemy starts the 3 s again but never lowers what was left to deal…
    const left = (effect(target, 'fx_hemorrhage')?.value ?? 0) * 2; // 2 s of it left
    ranger.baseStats = { ...ranger.baseStats, attackDamage: 10 };
    crit(target);
    expect(effect(target, 'fx_hemorrhage')?.remainingMs).toBe(3000);
    expect((effect(target, 'fx_hemorrhage')?.value ?? 0) * 3).toBeCloseTo(left, 6);
    // …and a stronger one replaces it: bleeds do not pile up.
    ranger.baseStats = { ...ranger.baseStats, attackDamage: 500 };
    crit(target);
    expect((effect(target, 'fx_hemorrhage')?.value ?? 0) * 3).toBeCloseTo(200, 6); // 20 % of 1000
    expect(target.effects.filter((e) => e.defKey === 'fx_hemorrhage')).toHaveLength(1);
  });

  it('Hemorrhage: no crit, no bleed; an ability’s crit bleeds too; and Cruelty counts it as bleeding', () => {
    const ranger = holder('r', 'ranger', { ranger_hemorrhage: 5, ranger_cruelty: 5 });
    const calm = foe('a', { hp: 1e6, maxHp: 1e6 });
    heroAttack(ranger, heroStats(ranger), calm, [calm], quietRng(), [], [ranger]);
    expect(effect(calm, 'fx_hemorrhage')).toBeUndefined();
    // Aimed Shot with the modifier that always crits.
    const shot = { ...anyMoment(abilityDef('ranger_aimedshot')) };
    shot.power = { ...(shot.power ?? { coeff: 1 }), alwaysCrit: true };
    ranger.abilities = [{ def: shot, rank: 1 }];
    ranger.charges = { ranger_aimedshot: 99 };
    ranger.range = 400;
    const target = foe('b', { hp: 1e6, maxHp: 1e6 });
    const events: CombatEvent[] = [];
    castReadyAbilities(ranger, [ranger], [target], 1, quietRng(), events);
    const hit = events.find((e) => e.type === 'damage')?.amount ?? 0;
    expect(hit).toBeGreaterThan(0);
    expect((effect(target, 'fx_hemorrhage')?.value ?? 0) * 3).toBeCloseTo(hit * 0.2, 6);
    expect(dealtMult(ranger, target, 'damage')).toBeCloseTo(1.15, 6); // it bleeds: Cruelty applies
  });

  it('Pierce Through: a killing shot sends 10% per rank of the damage left over into the enemy behind, once', () => {
    const ranger = holder('r', 'ranger', { ranger_pierce_through: 5 });
    const front = foe('a', { hp: 40, maxHp: 40, x: 20 });
    const behind = foe('b', { hp: 1000, maxHp: 1000, x: 60 });
    const last = foe('c', { hp: 1000, maxHp: 1000, x: 90 });
    const events = shoot(ranger, front, [front, behind, last]);
    expect(front.alive).toBe(false);
    expect(behind.hp).toBeCloseTo(1000 - 60 * 0.5, 6); // 60 left over, half of it
    expect(last.hp).toBe(1000);
    expect(events.find((e) => e.targetId === 'b')).toMatchObject({ sourceId: 'r', splash: true });
    // It can kill the one behind, and stops there.
    const weak = foe('w', { hp: 10, maxHp: 10, x: 60 });
    const head = foe('h', { hp: 40, maxHp: 40, x: 20 });
    shoot(ranger, head, [head, weak, last]);
    expect(weak.alive).toBe(false);
    expect(last.hp).toBe(1000);
    // Nobody behind: nothing happens. Without the talent: nothing either.
    const alone = foe('z', { hp: 40, maxHp: 40 });
    expect(shoot(ranger, alone, [alone])).toHaveLength(2); // the hit and the death
  });

  it('Cruelty: +3% per rank to enemies that bleed, burn or are slowed', () => {
    const ranger = holder('r', 'ranger', { ranger_cruelty: 5 });
    const clean = foe('a');
    expect(dealtMult(ranger, clean, 'damage')).toBe(1);
    const bleeding = foe('b');
    applyEffect(bleeding.effects, effectDef('fx_dot'), 'r', 5);
    expect(dealtMult(ranger, bleeding, 'damage')).toBeCloseTo(1.15, 6);
    const slowed = foe('c');
    applyEffect(slowed.effects, effectDef('debuff_cripple'), 'k', -20);
    expect(dealtMult(ranger, slowed, 'damage')).toBeCloseTo(1.15, 6);
    const marked = foe('d'); // a mark is neither
    applyEffect(marked.effects, effectDef('fx_mark'), 'r', 25);
    expect(dealtMult(ranger, marked, 'damage')).toBe(1);
  });
});

describe('Priest', () => {
  it('Overflow: healing that does not fit becomes a shield of up to 1% of life per rank, while she lives', () => {
    // A rolling heal on a full bar: 100 a second, all of it spare.
    const priest = holder('p', 'priest', { priest_overflow: 5 });
    const tank = plainHero('k', { x: 10 });
    applyEffect(tank.effects, effectDef('fx_hot'), 'p', 100);
    const world = fight([tank, priest], []);
    for (let i = 0; i < 3; i++) resolveCombatTick(world, TICK, quietRng());
    expect(effect(tank, 'fx_overflow')?.value).toBeCloseTo(30, 6);
    for (let i = 0; i < 10; i++) resolveCombatTick(world, TICK, quietRng());
    expect(effect(tank, 'fx_overflow')?.value).toBeCloseTo(50, 6); // capped at 5 % of 1000
    expect(tank.hp).toBe(1000);
    // An instant heal overflows the same way: 60 on a hero missing 10.
    const healer = holder('p', 'priest', { priest_overflow: 2 }, { range: 400, abilities: [{ def: anyMoment(abilityDef('priest_purify')), rank: 1 }] });
    healer.baseStats = { ...healer.baseStats, healPower: 0 };
    const ally = plainHero('k', { x: 10, hp: 990 });
    const second = fight([ally, healer], [foe('g', { enemyDamage: 0 })]);
    resolveCombatTick(second, TICK, quietRng());
    expect(ally.hp).toBe(1000);
    expect(effect(ally, 'fx_overflow')?.value).toBeCloseTo(20, 6); // 50 spare, capped at 2 % of 1000
    // The shield soaks the next hit.
    // With her down nothing overflows.
    const other = plainHero('k2');
    const fallen = holder('p', 'priest', { priest_overflow: 5 }, { alive: false });
    applyEffect(other.effects, effectDef('fx_hot'), 'p', 100);
    const late = fight([other, fallen], []);
    for (let i = 0; i < 5; i++) resolveCombatTick(late, TICK, quietRng());
    expect(effect(other, 'fx_overflow')).toBeUndefined();
  });

  it('Mantle: the hero with the least life takes 2% less per rank', () => {
    const priest = holder('p', 'priest', { priest_mantle: 5 });
    const tank = plainHero('k', { x: 10, hp: 400 });
    const world = fight([tank, priest], [foe('g')]);
    expect(dealt(resolveCombatTick(world, TICK, quietRng()), 'k')).toBeCloseTo(90, 6);
    // Someone else is lower: the tank takes the whole hit.
    priest.hp = 100;
    for (const e of world.enemies) e.attackTimerMs = 0;
    expect(dealt(resolveCombatTick(world, TICK, quietRng()), 'k')).toBeCloseTo(100, 6);
  });

  it('Revive: fallen heroes come back 6% sooner per rank', () => {
    const priest = holder('p', 'priest', { priest_revive: 5 });
    const tank = plainHero('k', { x: 10, hp: 1 });
    const world = fight([tank, priest], [foe('g')]);
    resolveCombatTick(world, TICK, quietRng());
    expect(tank.alive).toBe(false);
    expect(tank.respawnMs).toBeCloseTo(RESPAWN_MS * 0.7, 6);
    const lone = plainHero('k', { x: 10, hp: 1 });
    resolveCombatTick(fight([lone, plainHero('x')], [foe('g')]), TICK, quietRng());
    expect(lone.respawnMs).toBe(RESPAWN_MS);
  });

  it('Searing Light: +6% per rank on her attacks and her damage abilities', () => {
    const priest = holder('p', 'priest', { priest_searing_light: 5 });
    const target = foe('g');
    expect(dealtMult(priest, target, 'damage')).toBeCloseTo(1.3, 6);
    expect(dealtMult(priest, target, 'heal')).toBe(1);
    const events: CombatEvent[] = [];
    heroAttack(priest, heroStats(priest), target, [target], quietRng(), events, [priest]);
    expect(events[0]?.amount).toBeCloseTo(130, 6);
  });

  it('Condemn: an enemy hit by her damage abilities takes 2% more per rank from everyone for 4s', () => {
    const priest = holder('p', 'priest', { priest_condemn: 5 }, { range: 400, abilities: [{ def: anyMoment(abilityDef('priest_nova')), rank: 1 }] });
    const target = foe('g', { hp: 1e6, maxHp: 1e6 });
    castReadyAbilities(priest, [priest], [target], 1, quietRng(), []);
    expect(effect(target, 'debuff_condemn')).toMatchObject({ value: 10, remainingMs: 4000 });
    // Anyone's hit lands harder on it.
    const knight = holder('k', 'knight', {});
    const events: CombatEvent[] = [];
    heroAttack(knight, heroStats(knight), target, [target], quietRng(), events, [knight]);
    expect(events[0]?.amount).toBeCloseTo(110, 6);
    // Her basic attack does not condemn.
    const other = foe('o');
    heroAttack(priest, heroStats(priest), other, [other], quietRng(), [], [priest]);
    expect(effect(other, 'debuff_condemn')).toBeUndefined();
  });
});

describe('Purify', () => {
  const purify = (rank = 1): Combatant =>
    plainHero('p', { classKey: 'priest', range: 400, baseStats: base({ health: 1000, healPower: 0 }), abilities: [{ def: abilityDef('priest_purify'), rank }] });

  it('lifts every harmful effect from the ally that carries most of them and heals it 6% of its life', () => {
    const priest = purify();
    const tank = plainHero('k', { hp: 500 });
    applyEffect(tank.effects, effectDef('debuff_mortal_wound'), 'b', 25);
    applyEffect(tank.effects, effectDef('fx_shield'), 'p', 80); // a good effect stays
    const clean = plainHero('r', { hp: 300 }); // lower, but nothing to lift
    expect(castReadyAbilities(priest, [tank, clean, priest], [foe('g')], 1, quietRng(), [])).toEqual(['priest_purify']);
    expect(tank.effects.map((e) => e.defKey)).toEqual(['fx_shield']);
    expect(tank.hp).toBeCloseTo(560, 6); // the full 6 %: the wound that cut healing went first
    expect(clean.hp).toBe(300);
  });

  it('with nothing to lift it is a small heal on an ally under 60%, and is kept otherwise', () => {
    const priest = purify(5);
    const hurt = plainHero('k', { hp: 500 });
    expect(castReadyAbilities(priest, [hurt, priest], [foe('g')], 1, quietRng(), [])).toEqual(['priest_purify']);
    expect(hurt.hp).toBeCloseTo(600, 6); // 10 % at rank 5
    const idle = purify();
    expect(castReadyAbilities(idle, [plainHero('k', { hp: 700 }), idle], [foe('g')], 1, quietRng(), [])).toEqual([]);
  });
});

/** Only what is certain happens: a chance of 1 succeeds (the shooter that always aims behind), anything less fails
 *  (no block, no crit). */
function luckyRngNoBlock(): ReturnType<typeof quietRng> {
  const rng = quietRng();
  (rng as { chance: (p: number) => boolean }).chance = (p: number): boolean => p >= 1;
  return rng;
}

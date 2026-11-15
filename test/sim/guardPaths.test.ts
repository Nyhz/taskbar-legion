import { describe, expect, it } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { armBoss } from '@/sim/bossMechanics';
import { applyEffect } from '@/sim/effects';
import { recentlyHit } from '@/sim/recent';
import { buildHeroCombatant, type HeroConfig } from '@/sim/loadout';
import { makeRng, type Rng } from '@/sim/rng';
import { abilityDef } from '@/data/abilities';
import { BOSS_AFFIX, MECHANIC, mechanicAbility } from '@/data/bossKit';
import { effectDef } from '@/data/effects';
import { mitigation } from '@/data/stageScaling';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { base, effect, quietRng, unit } from './_kit';

// The guard passives and the "recently hit" memory on the damage of the BOSS KIT (affixes and world-boss
// mechanics), each by its own rule (second combat wave, B + C/D, 2026-11-15):
//   · Guardian takes his share of what is AIMED at a hero behind the front one — Deadeye's shot, a crow's peck —
//     and of nothing that is an area blow.
//   · Close Ranks cuts area blows for his allies — Chain Lightning, the bolt and its jumps.
//   · Shelter, Mantle, Endurance, Weathered Hide and Unyielding apply wherever a hero takes a hit.
//   · Damage over time (venom) is not a hit: "takes X % less damage" counts (the damage-reduction stat and
//     Mantle); armour, block, Guardian, Close Ranks and Endurance do not.
//   · Culpa's toll (world 4) is not a hit either, and nobody aimed it: the same rule as damage over time.
//   · Resaca's wave (world 6) is an area blow on all three: Close Ranks cuts it, Guardian takes none of it.
//   · Silencio dorado (world 5) deals no damage: nothing for a guard passive to act on.
//   · Esporas (world 7) are damage over time, like venom. The burning ground of Hoja al rojo (world 8) is a toll
//     like Culpa's. Balanza (world 9) takes life, it deals no damage: nothing reduces it. What Espejos (world 10)
//     reflects is an ability like any other: a volley is an area blow, a single shot is aimed.
//   · Every one of them counts as being hit for the abilities that react.

const TICK = 100;
const S = 20;
const cfg = (id: string, classKey: string, talents: Record<string, number>): HeroConfig => ({ id, classKey, level: 60, equipment: {}, talents, activeAbilities: [] });
/** A hero of the class holding these talents, with plain numbers: 1000 life, no defences unless given, no attacks. */
function holder(id: string, classKey: string, talents: Record<string, number>, stats: Record<string, number> = {}, over: Partial<Combatant> = {}): Combatant {
  const h = buildHeroCombatant(cfg(id, classKey, talents), []);
  return { ...h, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1, ...stats }), staticMods: [], hp: 1000, maxHp: 1000, abilities: [], autoSplash: undefined, attackTimerMs: 1e12, ...over };
}
const plain = (id: string, stats: Record<string, number> = {}, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1, ...stats }), attackTimerMs: 1e12, ...over });
/** The party as it stands in a fight: the tank in front, the others behind him. */
function column(tank: Combatant, ...behind: Combatant[]): Combatant[] {
  tank.x = 240;
  tank.range = 60;
  behind.forEach((h, i) => { h.x = 130 - i * 35; h.range = 170 + i * 35; });
  return [tank, ...behind];
}
const boss = (over: Partial<Combatant> = {}): Combatant =>
  unit({ id: 'boss', side: 'enemy', hp: 1e9, maxHp: 1e9, x: 300, range: 400, enemyDamage: 100, enemyAttackSpeed: 0.05, attackTimerMs: 1e12, isBoss: true, affixes: [], bossRank: 'stage', enrageMs: Number.POSITIVE_INFINITY, fightMs: 0, ...over });
function fight(heroes: Combatant[], enemies: Combatant[]): WorldState {
  const world = createWorld(7, heroes);
  world.globalStageIndex = S;
  world.enemies = enemies;
  world.phase = 'fighting';
  return world;
}
function run(world: WorldState, ms: number, rng: Rng = quietRng()): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let t = 0; t < ms; t += TICK) out.push(...resolveCombatTick(world, TICK, rng));
  return out;
}
const on = (events: readonly CombatEvent[], id: string): CombatEvent[] => events.filter((e) => e.type === 'damage' && e.targetId === id);

describe('Deadeye (the Certero affix): a shot aimed at one hero', () => {
  const def = abilityDef(BOSS_AFFIX.deadeye.abilityKey);
  const raw = 100 * (def.power?.coeff ?? 0); // the boss hits for 100
  const deadeye = (damage = 100): Combatant => boss({ enemyDamage: damage, abilities: [{ def, rank: 1 }] });
  /** The first Deadeye shot of a fight, and everything that landed in that tick. */
  const firstShot = (world: WorldState): { shot: CombatEvent; tick: CombatEvent[] } => {
    for (let t = 0; t < 12_000; t += TICK) {
      const events = resolveCombatTick(world, TICK, quietRng());
      const shot = events.find((e) => e.type === 'damage' && e.abilityKey === def.key);
      if (shot !== undefined) return { shot, tick: events };
    }
    throw new Error('no Deadeye shot');
  };

  it('Guardian takes his share of the shot at a hero behind him, through his own armour — and none when it is at him', () => {
    const knight = holder('k', 'knight', { knight_guardian: 5 }, { armor: 500 });
    const archer = plain('r'); // no armour: the one Deadeye picks
    const { shot, tick } = firstShot(fight(column(knight, archer), [deadeye()]));
    expect(shot.targetId).toBe('r');
    expect(shot.amount).toBeCloseTo(raw * 0.8, 6);
    const taken = on(tick, 'k');
    expect(taken).toHaveLength(1);
    expect(taken[0]).toMatchObject({ splash: true });
    expect(taken[0]?.sourceId).toBeUndefined(); // a number on him, not a swing at him
    expect(taken[0]?.amount).toBeCloseTo(raw * 0.2 * (1 - mitigation(500, S)), 6);
    // The least armoured is the Knight himself: the whole shot is his.
    const bare = holder('k', 'knight', { knight_guardian: 5 });
    const own = firstShot(fight(column(bare, plain('r', { armor: 500 })), [deadeye()]));
    expect(own.shot.targetId).toBe('k');
    expect(own.shot.amount).toBeCloseTo(raw, 6);
    expect(on(own.tick, 'k')).toHaveLength(1);
  });

  it('Mantle cuts it for the hero with the least life; Shelter for an ally under half its life', () => {
    const priest = holder('p', 'priest', { priest_mantle: 5 }, { armor: 500 });
    const hurt = plain('r', {}, { hp: 700 });
    expect(firstShot(fight(column(plain('k', { armor: 500 }), hurt, priest), [deadeye()])).shot.amount).toBeCloseTo(raw * 0.9, 6);
    const knight = holder('k', 'knight', { knight_shelter: 5 }, { armor: 500 });
    const low = plain('r', {}, { hp: 400 });
    const world = fight(column(knight, low), [deadeye()]);
    const { shot } = firstShot(world);
    expect(shot.targetId).toBe('r');
    expect(shot.amount).toBeCloseTo(raw * 0.85, 6); // Shelter was on her when it landed (and re-given: 6 s)
  });

  it('Endurance, Weathered Hide and Unyielding cut it on the Knight when the shot is his', () => {
    const others = (): Combatant => plain('r', { armor: 500 });
    // Endurance: 200 is over 15 % of his 1000 life.
    const tough = holder('k', 'knight', { knight_endurance: 5 });
    expect(firstShot(fight(column(tough, others()), [deadeye(250)])).shot.amount).toBeCloseTo(200 * 0.85, 6);
    expect(firstShot(fight(column(holder('k', 'knight', { knight_endurance: 5 }), others()), [deadeye(100)])).shot.amount).toBeCloseTo(raw, 6);
    // Weathered Hide: three blocked hits banked, 5 % each at rank 5.
    const hide = holder('k', 'knight', { knight_weathered_hide: 5 }, {}, { hideStacks: 3 });
    expect(firstShot(fight(column(hide, others()), [deadeye()])).shot.amount).toBeCloseTo(raw * 0.85, 6);
    // Unyielding: under 40 % of his life, 3 % less per rank.
    const low = holder('k', 'knight', { knight_unyielding: 5 }, {}, { hp: 300 });
    expect(firstShot(fight(column(low, others()), [deadeye()])).shot.amount).toBeCloseTo(raw * 0.85, 6);
  });

  it('counts as being hit, also when a shield soaks it', () => {
    const archer = plain('r');
    archer.effects.push({ defKey: 'fx_shield', sourceId: 'p', remainingMs: 60_000, totalMs: 60_000, stacks: 1, value: 1e6 });
    const world = fight(column(plain('k', { armor: 500 }), archer), [deadeye()]);
    firstShot(world);
    expect(archer.hp).toBe(1000);
    expect(recentlyHit(archer)).toBe(true);
    expect(archer.recentDamage ?? 0).toBeGreaterThan(0);
  });
});

describe('the Flock: the crows’ pecks at the back line', () => {
  const flockBoss = (): Combatant =>
    boss({ bossRank: 'world', mechanic: 'flock', enemyDamage: 0, abilities: [{ def: mechanicAbility(abilityDef('boss_flock'), 'flock', 0), rank: 1 }] });
  /** Every tick in which a crow pecked, with all that landed in it. */
  const peckTicks = (world: WorldState): CombatEvent[][] => {
    const out: CombatEvent[][] = [];
    const rng = makeRng(4);
    for (let t = 0; t < MECHANIC.flock.openerMs + MECHANIC.flock.castMs + 7000; t += TICK) {
      const events = resolveCombatTick(world, TICK, rng);
      if (events.some((e) => e.type === 'damage' && e.sourceId?.includes('_crow_') === true)) out.push(events);
    }
    return out;
  };
  const pecksIn = (events: readonly CombatEvent[]): CombatEvent[] => events.filter((e) => e.type === 'damage' && e.sourceId?.includes('_crow_') === true);

  it('Guardian takes his share of every peck — as a number on him — and the pecked hero counts as being hit', () => {
    const plainRun = peckTicks(fight(column(plain('k'), plain('r')), [flockBoss()]));
    const peck = pecksIn(plainRun[0] ?? [])[0]?.amount ?? 0;
    expect(peck).toBeGreaterThan(0);
    expect(plainRun.every((events) => on(events, 'k').length === 0)).toBe(true); // nothing reaches a Knight without it

    const knight = holder('k', 'knight', { knight_guardian: 5 });
    const archer = plain('r');
    const guarded = peckTicks(fight(column(knight, archer), [flockBoss()]));
    expect(guarded.length).toBeGreaterThan(3);
    for (const events of guarded) {
      const pecks = pecksIn(events);
      expect(pecks.every((e) => e.targetId === 'r')).toBe(true);
      for (const e of pecks) expect(e.amount).toBeCloseTo(peck * 0.8, 6);
      const his = on(events, 'k');
      expect(his).toHaveLength(1); // one number for the tick, whatever the pecks in it
      expect(his[0]).toMatchObject({ splash: true });
      expect(his[0]?.amount).toBeCloseTo(peck * 0.2 * pecks.length, 6);
    }
    expect(archer.recentDamage ?? 0).toBeGreaterThan(0);
    expect(knight.recentDamage ?? 0).toBeGreaterThan(0); // what he took on himself counts for him too
  });

  it('Mantle cuts the pecks on the hero with the least life', () => {
    const base0 = pecksIn(peckTicks(fight(column(plain('k'), plain('r', {}, { hp: 600 })), [flockBoss()]))[0] ?? [])[0]?.amount ?? 0;
    const priest = holder('p', 'priest', { priest_mantle: 5 });
    const world = fight(column(plain('k'), plain('r', {}, { hp: 600 }), priest), [flockBoss()]);
    const onArcher = peckTicks(world).flatMap(pecksIn).filter((e) => e.targetId === 'r');
    expect(onArcher.length).toBeGreaterThan(0);
    for (const e of onArcher) expect(e.amount).toBeCloseTo(base0 * 0.9, 6);
  });
});

describe('Chain Lightning: an area blow', () => {
  const def = mechanicAbility(abilityDef('boss_chain_bolt'), 'chainBolt', 1); // Hell: the bolt is the boss's hit, a jump half
  const bolts = (heroes: Combatant[], rng: Rng): CombatEvent[] => {
    const b = boss({ bossRank: 'world', mechanic: 'chainBolt', enemyDamage: 1000, abilities: [{ def, rank: 1 }] });
    return run(fight(heroes, [b]), MECHANIC.chainBolt.openerMs + MECHANIC.chainBolt.castMs + 200, rng);
  };
  /** An rng that picks the LAST of a list: the bolt falls on the hero furthest back. */
  const lastPick = (): Rng => {
    const rng = quietRng();
    (rng as { pick: <T>(items: readonly T[]) => T }).pick = <T,>(items: readonly T[]): T => items[items.length - 1] as T;
    return rng;
  };
  const party = (talents: Record<string, number>): Combatant[] =>
    column(holder('k', 'knight', talents, {}, { hp: 1e6, maxHp: 1e6 }), plain('r', {}, { hp: 1e6, maxHp: 1e6 }), plain('p', {}, { hp: 1e6, maxHp: 1e6 }));

  it('Close Ranks cuts the bolt and its jumps for his allies, not for him', () => {
    // The bolt on the Knight (the first of the list), the jumps on the two behind.
    const front = bolts(party({ knight_close_ranks: 5 }), quietRng()).filter((e) => e.abilityKey === 'boss_chain_bolt');
    expect(on(front, 'k')[0]?.amount).toBeCloseTo(1000, 3);
    expect(on(front, 'r')[0]?.amount).toBeCloseTo(500 * 0.9, 3);
    expect(on(front, 'p')[0]?.amount).toBeCloseTo(500 * 0.9, 3);
    // The bolt on the hero furthest back: cut for her too, and the jump on the Knight whole.
    const back = bolts(party({ knight_close_ranks: 5 }), lastPick()).filter((e) => e.abilityKey === 'boss_chain_bolt');
    expect(on(back, 'p')[0]).toMatchObject({ splash: undefined });
    expect(on(back, 'p')[0]?.amount).toBeCloseTo(1000 * 0.9, 3);
    expect(on(back, 'r')[0]?.amount).toBeCloseTo(500 * 0.9, 3);
    expect(on(back, 'k')[0]?.amount).toBeCloseTo(500, 3);
  });

  it('Guardian takes none of it, even when the bolt falls behind him', () => {
    const events = bolts(party({ knight_guardian: 5 }), lastPick());
    const hits = events.filter((e) => e.abilityKey === 'boss_chain_bolt');
    expect(on(hits, 'p')[0]?.amount).toBeCloseTo(1000, 3);
    expect(on(hits, 'r')[0]?.amount).toBeCloseTo(500, 3);
    expect(on(events, 'k')).toHaveLength(1); // his own jump, and nothing handed over
    expect(on(events, 'k')[0]?.amount).toBeCloseTo(500, 3);
  });

  it('Mantle and Endurance apply to it like to any hit, and everyone it touches counts as being hit', () => {
    const knight = holder('k', 'knight', { knight_endurance: 5 }); // 1000 life: a jump of 500 is a big hit
    const archer = plain('r', {}, { hp: 1e6, maxHp: 1e6 });
    const priest = holder('p', 'priest', { priest_mantle: 5 }, {}, { hp: 5e5, maxHp: 1e6 }); // half her life: the lowest
    const heroes = column(knight, archer, priest);
    const b = boss({ bossRank: 'world', mechanic: 'chainBolt', enemyDamage: 1000, abilities: [{ def, rank: 1 }] });
    const world = fight(heroes, [b]);
    knight.hp = 1e5; // enough to stand it, and far from the least life (share of a 1000 bar aside)
    knight.maxHp = 1000;
    const hits = run(world, MECHANIC.chainBolt.openerMs + MECHANIC.chainBolt.castMs + 200, lastPick()).filter((e) => e.abilityKey === 'boss_chain_bolt');
    expect(on(hits, 'p')[0]?.amount).toBeCloseTo(1000 * 0.9, 3); // Mantle
    expect(on(hits, 'k')[0]?.amount).toBeCloseTo(500 * 0.85, 3); // Endurance: over 15 % of his life
    expect(on(hits, 'r')[0]?.amount).toBeCloseTo(500, 3);
    for (const h of heroes) expect(recentlyHit(h), h.id).toBe(true);
  });
});

describe('venom (the Venenoso affix): damage over time', () => {
  const venom = effectDef(BOSS_AFFIX.venomous.effectKey);
  /** Five stacks of venom on `h`: 5 % of its life a second. */
  const poison = (h: Combatant): void => {
    for (let i = 0; i < 5; i++) applyEffect(h.effects, venom, 'boss', h.maxHp * 0.01);
  };
  const lostInOneSecond = (heroes: Combatant[], id: string): number => {
    const h = heroes.find((x) => x.id === id) as Combatant;
    poison(h);
    const before = h.hp;
    run(fight(heroes, []), 1000);
    return before - h.hp;
  };

  it('unreduced on a hero with nothing: 5 % of its life a second at five stacks', () => {
    expect(lostInOneSecond([plain('k')], 'k')).toBeCloseTo(50, 6);
  });

  it('"takes less damage" counts: the damage-reduction stat (Vanguard’s kind), Shelter, Weathered Hide, Unyielding — and Mantle', () => {
    expect(lostInOneSecond([plain('k', { damageReduction: 20 })], 'k')).toBeCloseTo(50 * 0.8, 6);
    // Shelter on the ally under half its life (given at once: 15 % for rank 5).
    const sheltered = lostInOneSecond([holder('k', 'knight', { knight_shelter: 5 }), plain('r', {}, { hp: 400 })], 'r');
    expect(sheltered).toBeCloseTo(50 * 0.85, 6);
    // Weathered Hide: two stacks banked at rank 5.
    expect(lostInOneSecond([holder('k', 'knight', { knight_weathered_hide: 5 }, {}, { hideStacks: 2 })], 'k')).toBeCloseTo(50 * 0.9, 6);
    // Unyielding: under 40 % of his life.
    expect(lostInOneSecond([holder('k', 'knight', { knight_unyielding: 5 }, {}, { hp: 300 })], 'k')).toBeCloseTo(50 * 0.85, 6);
    // Mantle: the hero with the least life.
    expect(lostInOneSecond([plain('k', {}, { hp: 900 }), holder('p', 'priest', { priest_mantle: 5 })], 'k')).toBeCloseTo(50 * 0.9, 6);
  });

  it('armour does nothing to it, and Guardian, Close Ranks and Endurance have nothing to act on', () => {
    expect(lostInOneSecond([plain('k', { armor: 5000, magicResist: 5000, block: 100 })], 'k')).toBeCloseTo(50, 6);
    const knight = holder('k', 'knight', { knight_guardian: 5, knight_close_ranks: 5 });
    const party = column(knight, plain('r'));
    expect(lostInOneSecond(party, 'r')).toBeCloseTo(50, 6);
    expect(knight.hp).toBe(1000); // none of her venom is his
    // Endurance is about single blows: a tick is never one.
    const big = holder('k', 'knight', { knight_endurance: 5 });
    for (let i = 0; i < 5; i++) applyEffect(big.effects, venom, 'boss', 100); // 500 a second at five stacks
    const before = big.hp;
    run(fight([big, plain('r')], []), 1000);
    expect(before - big.hp).toBeCloseTo(500, 6);
  });

  it('a poisoned hero counts as being hit while it lasts', () => {
    const archer = plain('r');
    poison(archer);
    const world = fight([plain('k'), archer], []);
    run(world, 500);
    expect(recentlyHit(archer)).toBe(true);
    expect(effect(archer, venom.key)).toBeDefined();
  });
});

describe('Culpa: the toll of the mark is not a hit', () => {
  const guilt = effectDef('debuff_guilt');
  /** What the marked hero `id` loses in three seconds while the boss loses 1 % of its life a second (a bleed on
   *  it): at a mark of 2, 2 % of his own life a second — 60 of his 1000. */
  const tollIn3s = (heroes: Combatant[], id: string): number => {
    const b = boss({ hp: 100_000, maxHp: 100_000, bossRank: 'world', mechanic: 'guilt' });
    armBoss(b);
    applyEffect(b.effects, effectDef('fx_dot'), 'k', 1000, 60_000);
    const target = heroes.find((h) => h.id === id);
    if (target === undefined) throw new Error(`no hero ${id}`);
    applyEffect(target.effects, guilt, 'boss', 2, 60_000);
    const before = target.hp;
    run(fight(heroes, [b]), 3000);
    return before - target.hp;
  };

  it('armour and block do nothing to it; Guardian, Close Ranks and Endurance have nothing to act on', () => {
    expect(tollIn3s(column(plain('k'), plain('r')), 'r')).toBeCloseTo(60, 4);
    expect(tollIn3s(column(plain('k'), plain('r', { armor: 5000, magicResist: 5000, block: 100 })), 'r')).toBeCloseTo(60, 4);
    const knight = holder('k', 'knight', { knight_guardian: 5, knight_close_ranks: 5 });
    expect(tollIn3s(column(knight, plain('r')), 'r')).toBeCloseTo(60, 4);
    expect(knight.hp).toBe(1000); // none of her guilt is his
    expect(tollIn3s(column(holder('k', 'knight', { knight_endurance: 5 }), plain('r')), 'k')).toBeCloseTo(60, 4);
  });

  it('"takes X % less damage" counts: the damage-reduction stat and Mantle; a shield soaks it', () => {
    expect(tollIn3s(column(plain('k'), plain('r', { damageReduction: 20 })), 'r')).toBeCloseTo(60 * 0.8, 4);
    const priest = holder('p', 'priest', { priest_mantle: 5 });
    expect(tollIn3s(column(plain('k'), plain('r', {}, { hp: 700 }), priest), 'r')).toBeCloseTo(60 * 0.9, 4);
    const shielded = plain('r');
    shielded.effects.push({ defKey: 'fx_shield', sourceId: 'p', remainingMs: 60_000, totalMs: 60_000, stacks: 1, value: 1e6 });
    expect(tollIn3s(column(plain('k'), shielded), 'r')).toBe(0);
    expect(recentlyHit(shielded)).toBe(true); // …and he still counts as being under attack
  });
});

describe('Resaca: the wave is an area blow on all three', () => {
  const def = mechanicAbility(abilityDef('boss_undertow'), 'undertow', 1); // Hell: 60 % of its hit on each
  const waveOn = (heroes: Combatant[]): CombatEvent[] => {
    const b = boss({ bossRank: 'world', mechanic: 'undertow', enemyDamage: 1000, abilities: [{ def, rank: 1 }] });
    return run(fight(heroes, [b]), MECHANIC.undertow.openerMs + MECHANIC.undertow.castMs + 200);
  };
  const sturdy = { hp: 1e6, maxHp: 1e6 };

  it('Close Ranks cuts it for his allies, not for him; Guardian takes none of it', () => {
    const bare = waveOn(column(plain('k', {}, sturdy), plain('r', {}, sturdy), plain('p', {}, sturdy))).filter((e) => e.abilityKey === 'boss_undertow');
    for (const id of ['k', 'r', 'p']) expect(on(bare, id)[0]?.amount).toBeCloseTo(600, 3);
    const knight = holder('k', 'knight', { knight_close_ranks: 5, knight_guardian: 5 }, {}, sturdy);
    const events = waveOn(column(knight, plain('r', {}, sturdy), plain('p', {}, sturdy)));
    const wave = events.filter((e) => e.abilityKey === 'boss_undertow');
    expect(on(wave, 'k')[0]?.amount).toBeCloseTo(600, 3);
    expect(on(wave, 'r')[0]?.amount).toBeCloseTo(600 * 0.9, 3);
    expect(on(wave, 'p')[0]?.amount).toBeCloseTo(600 * 0.9, 3);
    expect(on(events, 'k')).toHaveLength(1); // his own share of the wave and nothing handed over
  });

  it('every hero it reaches counts as being hit', () => {
    const heroes = column(plain('k', {}, sturdy), plain('r', {}, sturdy), plain('p', {}, sturdy));
    waveOn(heroes);
    expect(heroes.every((h) => recentlyHit(h))).toBe(true);
  });
});

describe('worlds 7–10: spores, the burning ground, the scales, the mirror', () => {
  const sturdy = { hp: 1e6, maxHp: 1e6 };

  it('spores are damage over time: reduction and Mantle count, armour and the Knight\'s guards do not', () => {
    const spores = effectDef(MECHANIC.spores.effectKey);
    const lost = (heroes: Combatant[], id: string): number => {
      const target = heroes.find((h) => h.id === id);
      if (target === undefined) throw new Error(`no hero ${id}`);
      applyEffect(target.effects, spores, 'boss', 50);
      const before = target.hp;
      run(fight(heroes, []), 1000);
      return before - target.hp;
    };
    expect(lost(column(holder('k', 'knight', { knight_guardian: 5, knight_close_ranks: 5 }), plain('r', { armor: 5000 })), 'r')).toBeCloseTo(50, 6);
    expect(lost(column(plain('k'), plain('r', { damageReduction: 20 })), 'r')).toBeCloseTo(40, 6);
    expect(lost(column(plain('k'), plain('r', {}, { hp: 700 }), holder('p', 'priest', { priest_mantle: 5 })), 'r')).toBeCloseTo(45, 6);
  });

  it('the burning ground is a toll: Guardian and Close Ranks have nothing to act on, Mantle cuts it for the most hurt', () => {
    const burn = (heroes: Combatant[]): void => {
      const b = boss({ bossRank: 'world', mechanic: 'redBlade' });
      b.groundFire = { leftMs: 3000, dps: 20 };
      run(fight(heroes, [b]), 3000);
    };
    const knight = holder('k', 'knight', { knight_guardian: 5, knight_close_ranks: 5 });
    const archer = plain('r');
    burn(column(knight, archer));
    expect(1000 - archer.hp).toBeCloseTo(60, 4);
    expect(1000 - knight.hp).toBeCloseTo(60, 4); // his own share, nothing of hers
    const hurt = plain('r', {}, { hp: 700 });
    burn(column(plain('k'), hurt, holder('p', 'priest', { priest_mantle: 5 })));
    expect(700 - hurt.hp).toBeCloseTo(60 * 0.9, 4);
    expect(recentlyHit(hurt)).toBe(true);
  });

  it('the scales take life, they deal no damage: no guard passive, no reduction changes where a hero ends', () => {
    const def = mechanicAbility(abilityDef('boss_scales'), 'scales', 1);
    const knight = holder('k', 'knight', { knight_guardian: 5, knight_close_ranks: 5, knight_shelter: 5 }, { armor: 5000, damageReduction: 40 });
    const archer = plain('r', {}, { hp: 300 });
    const priest = holder('p', 'priest', { priest_mantle: 5 });
    const b = boss({ bossRank: 'world', mechanic: 'scales', abilities: [{ def, rank: 1 }] });
    run(fight(column(knight, archer, priest), [b]), MECHANIC.scales.openerMs + MECHANIC.scales.castMs + 200);
    expect([knight.hp, archer.hp, priest.hp]).toEqual([300, 300, 300]);
    expect(recentlyHit(knight)).toBe(true); // …and it counts as being hit
  });

  it('a reflected volley is an area blow (Close Ranks cuts it); a reflected single shot is aimed (Guardian takes his share)', () => {
    const mirror = (last: string): Combatant =>
      boss({ bossRank: 'world', mechanic: 'mirror', enemyDamage: 1000, lastHeroCast: { key: last, rank: 1 }, abilities: [{ def: mechanicAbility(abilityDef('boss_mirror'), 'mirror', 0), rank: 1 }] });
    const until = MECHANIC.mirror.openerMs + MECHANIC.mirror.castMs + 200;
    // Raining Arrows back on everyone: 1000 × 1.2 × 25 % = 300 each.
    const ranks = column(holder('k', 'knight', { knight_close_ranks: 5 }, {}, sturdy), plain('r', {}, sturdy), plain('p', {}, sturdy));
    const volley = run(fight(ranks, [mirror('ranger_multishot')]), until).filter((e) => e.abilityKey === 'boss_mirror');
    expect(on(volley, 'k')[0]?.amount).toBeCloseTo(300, 3);
    expect(on(volley, 'r')[0]?.amount).toBeCloseTo(300 * 0.9, 3);
    // Aimed Shot back on one hero, the rng's pick (the last of the list here): 1000 × 1.8 × 25 % = 450, a fifth of it the Knight's.
    const rng = quietRng();
    (rng as { pick: <T>(items: readonly T[]) => T }).pick = <T,>(items: readonly T[]): T => items[items.length - 1] as T;
    const guard = column(holder('k', 'knight', { knight_guardian: 5 }, {}, sturdy), plain('r', {}, sturdy));
    const shot = run(fight(guard, [mirror('ranger_aimedshot')]), until, rng);
    expect(on(shot.filter((e) => e.abilityKey === 'boss_mirror'), 'r')[0]?.amount).toBeCloseTo(450 * 0.8, 3);
    expect(on(shot, 'k').find((e) => e.splash === true)?.amount).toBeCloseTo(450 * 0.2, 3);
  });

  it('the breaking of the six mirrors is an area blow: Close Ranks cuts it for his allies, Guardian takes none of it', () => {
    const def = mechanicAbility(abilityDef('boss_shatter'), 'mirror', 0); // Normal: 120 % of its hit on each
    const breaking = (heroes: Combatant[]): CombatEvent[] => {
      const b = boss({ bossRank: 'world', mechanic: 'mirror', enemyDamage: 1000, abilities: [{ def, rank: 1 }] });
      for (let pane = 0; pane < MECHANIC.mirror.panes; pane++) applyEffect(b.effects, effectDef(MECHANIC.mirror.paneEffectKey), b.id, 5);
      return run(fight(heroes, [b]), MECHANIC.mirror.shatter.castMs + 300);
    };
    // (The panes go dark before the blow lands: it is the plain 120 %, not 120 % × the six panes' +30 %.)
    const bare = breaking(column(plain('k', {}, sturdy), plain('r', {}, sturdy), plain('p', {}, sturdy))).filter((e) => e.abilityKey === 'boss_shatter');
    for (const id of ['k', 'r', 'p']) expect(on(bare, id)[0]?.amount).toBeCloseTo(1200, 3);
    const events = breaking(column(holder('k', 'knight', { knight_close_ranks: 5, knight_guardian: 5 }, {}, sturdy), plain('r', {}, sturdy), plain('p', {}, sturdy)));
    const blow = events.filter((e) => e.abilityKey === 'boss_shatter');
    expect(on(blow, 'k')[0]?.amount).toBeCloseTo(1200, 3);
    expect(on(blow, 'r')[0]?.amount).toBeCloseTo(1200 * 0.9, 3);
    expect(on(blow, 'p')[0]?.amount).toBeCloseTo(1200 * 0.9, 3);
    expect(on(events, 'k')).toHaveLength(1); // his own share and nothing handed over
    // The lit mirrors are the boss's own boon: nothing on a hero for Purify to lift.
    expect(effectDef(MECHANIC.mirror.paneEffectKey).beneficial).toBe(true);
  });

  it('the dark reflection strikes ONE hero behind the tank: Guardian takes his share of each blow, Close Ranks has nothing to cut', () => {
    const twinHits = (knight: Combatant): { r: number; k: number } => {
      const b = boss({
        bossRank: 'world', mechanic: 'mirror', enemyDamage: 1, lastHeroCast: { key: 'knight_battlecry', rank: 1, heroId: 'r' },
        abilities: [{ def: mechanicAbility(abilityDef('boss_mirror'), 'mirror', 0), rank: 1 }],
      });
      const events = run(fight(column(knight, plain('r', {}, sturdy)), [b]), MECHANIC.mirror.openerMs + MECHANIC.mirror.castMs + MECHANIC.mirror.everyMs + 6000);
      const blows = events.filter((e) => e.type === 'damage' && e.sourceId?.includes('_reflection_') === true);
      expect(blows.length).toBeGreaterThan(1);
      expect(blows.every((e) => e.targetId === 'r')).toBe(true); // the hero it is the double of, never the tank
      // (What Guardian takes over reaches the Knight as a share of its own: `splash`.)
      return { r: blows[0]?.amount ?? 0, k: on(events, 'k').find((e) => e.splash === true)?.amount ?? 0 };
    };
    const bare = twinHits(plain('k', {}, sturdy));
    expect(bare.r).toBeGreaterThan(0);
    expect(bare.k).toBe(0);
    const ranks = twinHits(holder('k', 'knight', { knight_close_ranks: 5 }, {}, sturdy));
    expect(ranks.r).toBeCloseTo(bare.r, 6);
    const guarded = twinHits(holder('k', 'knight', { knight_guardian: 5 }, {}, sturdy));
    expect(guarded.r).toBeCloseTo(bare.r * 0.8, 6);
    expect(guarded.k).toBeCloseTo(bare.r * 0.2, 6);
  });
});

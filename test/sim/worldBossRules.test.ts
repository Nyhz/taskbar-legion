import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities, tickCooldowns } from '@/sim/abilities';
import { armBoss } from '@/sim/bossMechanics';
import { applyEffect } from '@/sim/effects';
import { makeRng, type Rng } from '@/sim/rng';
import { abilityDef } from '@/data/abilities';
import { MECHANIC, mechanicAbility, worldBossMechanic } from '@/data/bossKit';
import { effectDef } from '@/data/effects';
import { WALK_SPEED } from '@/data/field';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { base, effect, quietRng, unit } from './_kit';

// The world bosses' mechanics of worlds 4–6 (docs/redesign/PROGRESS.md "Combate, segunda ola", D): Culpa (the
// Scapegoat), Silencio dorado (the Gilded Abbot), Resaca (the Ninth Wave). Numbers in data/bossKit.ts MECHANIC;
// rules in sim/worldBossRules.ts.

const TICK = 100;

/** A hero who never swings unless a test arms him. */
const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1000, maxHp: 1000, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }), attackTimerMs: 1e12, ...over });
/** A hero who does swing: once a second for `damage`. */
const striker = (id: string, damage: number, over: Partial<Combatant> = {}): Combatant =>
  hero(id, { baseStats: base({ health: 1000, attackDamage: damage, attackSpeed: 1 }), attackTimerMs: 0, ...over });
/** Where the party stands in a fight with the boss at x = 300: the tank in reach, the others behind. */
const PLACES = [{ x: 240, reach: 60 }, { x: 130, reach: 170 }, { x: 95, reach: 205 }] as const;
const column = (tank: Combatant, archer: Combatant, healer: Combatant): Combatant[] => [tank, archer, healer];
const boss = (mechanic: 'guilt' | 'gildedSilence' | 'undertow', d: number, over: Partial<Combatant> = {}): Combatant =>
  unit({
    id: 'boss', side: 'enemy', hp: 100_000, maxHp: 100_000, x: 300, range: 400, moveSpeed: 60, enemyDamage: 100, enemyAttackSpeed: 0.05, attackTimerMs: 1e12,
    isBoss: true, affixes: [], bossRank: 'world', mechanic, enrageMs: Number.POSITIVE_INFINITY, fightMs: 0,
    abilities: [{ def: mechanicAbility(abilityDef(MECHANIC[mechanic].abilityKey), mechanic, d), rank: 1 }], ...over,
  });
function fight(heroes: Combatant[], enemies: Combatant[], stage = 40): WorldState {
  const world = createWorld(7, heroes);
  // The fight is already joined: everyone stands where his reach puts him (a column of three).
  if (heroes.length === PLACES.length) heroes.forEach((h, i) => { h.x = PLACES[i]?.x ?? h.x; h.range = PLACES[i]?.reach ?? h.range; });
  world.partyX = Math.max(world.partyX, 300 - 50);
  world.globalStageIndex = stage;
  world.enemies = enemies;
  world.phase = 'fighting';
  return world;
}
function run(world: WorldState, ms: number, rng: Rng = quietRng()): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let t = 0; t < ms; t += TICK) out.push(...resolveCombatTick(world, TICK, rng));
  return out;
}
const marked = (w: WorldState): Combatant | undefined => w.heroes.find((h) => effect(h, 'debuff_guilt') !== undefined);

describe('the figures of worlds 4–6 carry them', () => {
  it('the Scapegoat, the Gilded Abbot and the Ninth Wave', () => {
    expect([40, 50, 60].map(worldBossMechanic)).toEqual(['guilt', 'gildedSilence', 'undertow']);
    for (const key of ['guilt', 'gildedSilence', 'undertow'] as const) {
      expect(abilityDef(MECHANIC[key].abilityKey).castTimeMs).toBe(1500); // telegraphed: a cast bar fills first
    }
  });
});

describe('Culpa (the Scapegoat)', () => {
  it('marks one hero, the rng\'s pick, for 8 s — and again after its cooldown', () => {
    const picked = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const world = fight(column(hero('tank'), hero('archer'), hero('healer')), [boss('guilt', 0)]);
      run(world, MECHANIC.guilt.openerMs + MECHANIC.guilt.castMs + 200, makeRng(seed));
      const who = marked(world);
      expect(world.heroes.filter((h) => effect(h, 'debuff_guilt') !== undefined)).toHaveLength(1);
      if (who !== undefined) picked.add(who.id);
    }
    expect(picked.size).toBe(3);
    const world = fight(column(hero('tank'), hero('archer'), hero('healer')), [boss('guilt', 0)]);
    run(world, MECHANIC.guilt.openerMs + MECHANIC.guilt.castMs - 200);
    expect(marked(world)).toBeUndefined();
    run(world, 400);
    expect(effect(marked(world), 'debuff_guilt')?.value).toBe(1.5); // Normal
    expect(MECHANIC.guilt.lifePerBossPct).toEqual([1.5, 1.75, 2, 2.25, 2.5]);
    run(world, MECHANIC.guilt.holdMs);
    expect(marked(world)).toBeUndefined();
    run(world, MECHANIC.guilt.everyMs[0] - MECHANIC.guilt.holdMs);
    expect(marked(world)).toBeDefined();
  });

  it('while marked he loses his share of life for every 1 % of its life the boss loses — whoever takes it off', () => {
    for (const [d, share] of [[0, 1.5], [1, 1.75], [4, 2.5]] as const) {
      const b = boss('guilt', d, { abilities: [] });
      armBoss(b); // as a spawned boss: its life is on record from the first moment
      const tank = striker('tank', 1000); // 1 % of the boss's life a swing
      const archer = hero('archer');
      const world = fight(column(tank, archer, hero('healer')), [b]);
      applyEffect(archer.effects, effectDef('debuff_guilt'), 'boss', share, 60_000);
      const events = run(world, 5000);
      const lostPct = ((b.maxHp - b.hp) / b.maxHp) * 100;
      expect(lostPct).toBeGreaterThan(1);
      expect(archer.maxHp - archer.hp).toBeCloseTo((lostPct * share * archer.maxHp) / 100, 4);
      expect(tank.hp).toBe(tank.maxHp); // only the marked one pays
      // Shown as numbers on him every half second, tagged with the mechanic, adding up to what he lost.
      const shown = events.filter((e) => e.type === 'damage' && e.targetId === 'archer' && e.tick === true && e.abilityKey === 'boss_guilt');
      expect(shown.length).toBeGreaterThan(2);
      expect(shown.reduce((s, e) => s + (e.amount ?? 0), 0)).toBeCloseTo(archer.maxHp - archer.hp, 4);
    }
  });

  it('damage over time on the boss counts too, and nothing is paid while the party deals nothing', () => {
    const b = boss('guilt', 0, { abilities: [] });
    const archer = hero('archer');
    const world = fight(column(hero('tank'), archer, hero('healer')), [b]);
    applyEffect(archer.effects, effectDef('debuff_guilt'), 'boss', 2, 60_000);
    run(world, 2000);
    expect(archer.hp).toBe(archer.maxHp);
    applyEffect(b.effects, effectDef('fx_dot'), 'tank', 1000, 5000); // 1 % of its life a second
    run(world, 3000);
    expect(archer.maxHp - archer.hp).toBeCloseTo(3 * 2 * 10, 0);
  });

  it('it can kill: the marked hero falls when it takes the last of his life', () => {
    const b = boss('guilt', 4, { abilities: [] });
    const archer = hero('archer', { hp: 20 });
    const world = fight(column(striker('tank', 1000), archer, hero('healer')), [b]);
    applyEffect(archer.effects, effectDef('debuff_guilt'), 'boss', 3.5, 60_000);
    const events = run(world, 3000);
    expect(archer.alive).toBe(false);
    expect(events.some((e) => e.type === 'death' && e.targetId === 'archer')).toBe(true);
  });

  it('Purify lifts the mark', () => {
    const archer = hero('archer', { hp: 900 });
    applyEffect(archer.effects, effectDef('debuff_guilt'), 'boss', 2, 8000);
    const priest = hero('healer', { classKey: 'priest', abilities: [{ def: abilityDef('priest_purify'), rank: 1 }] });
    expect(castReadyAbilities(priest, [archer, priest], [boss('guilt', 0)], 40, quietRng(), [])).toEqual(['priest_purify']);
    expect(effect(archer, 'debuff_guilt')).toBeUndefined();
    expect(effectDef('debuff_guilt').beneficial).toBe(false);
  });
});

describe('Silencio dorado (the Gilded Abbot)', () => {
  it('every hero\'s cooldowns stand still for 6 s, then run again', () => {
    const heroes = column(hero('tank'), hero('archer'), hero('healer'));
    for (const h of heroes) {
      h.cooldowns = { some_ability: 20_000 };
      h.cooldownTotals = { some_ability: 20_000 };
    }
    const world = fight(heroes, [boss('gildedSilence', 1)], 50);
    const until = MECHANIC.gildedSilence.openerMs + MECHANIC.gildedSilence.castMs;
    run(world, until - 200);
    const before = heroes.map((h) => h.cooldowns.some_ability ?? 0);
    expect(before.every((v) => v < 20_000 - 9000)).toBe(true); // they were running
    run(world, 400);
    expect(heroes.every((h) => effect(h, 'debuff_gilded') !== undefined)).toBe(true);
    const frozen = heroes.map((h) => h.cooldowns.some_ability ?? 0);
    run(world, MECHANIC.gildedSilence.holdMs - 600);
    expect(heroes.map((h) => h.cooldowns.some_ability ?? 0)).toEqual(frozen);
    run(world, 1200);
    expect(heroes.every((h) => effect(h, 'debuff_gilded') === undefined)).toBe(true);
    expect(heroes.every((h, i) => (h.cooldowns.some_ability ?? 0) < (frozen[i] ?? 0))).toBe(true);
  });

  it('an ability that is ready is still cast, and charges still build: only the clocks stop', () => {
    const priest = hero('healer', { classKey: 'priest', abilities: [{ def: abilityDef('priest_purify'), rank: 1 }] });
    const archer = hero('archer', { hp: 500 });
    applyEffect(priest.effects, effectDef('debuff_gilded'), 'boss', 0);
    applyEffect(archer.effects, effectDef('debuff_gilded'), 'boss', 0);
    expect(castReadyAbilities(priest, [archer, priest], [boss('gildedSilence', 0)], 50, quietRng(), [])).toEqual(['priest_purify']);
    // …it lifted it from the ally it was cast on, and its own cooldown, just started, does not run while she is silenced.
    expect(effect(archer, 'debuff_gilded')).toBeUndefined();
    const started = priest.cooldowns.priest_purify ?? 0;
    expect(started).toBeGreaterThan(0);
    tickCooldowns(priest, 3000);
    expect(priest.cooldowns.priest_purify).toBe(started);
    tickCooldowns(archer, 3000); // freed: hers would run
    expect(effectDef('debuff_gilded').beneficial).toBe(false);
  });

  it('it comes more often as the difficulty rises', () => {
    const every = (d: number): number => mechanicAbility(abilityDef('boss_gild'), 'gildedSilence', d).cooldownMs;
    expect([0, 1, 4].map(every)).toEqual([24_000, 20_000, 16_000]);
  });
});

describe('Resaca (the Ninth Wave)', () => {
  const wave = (d: number): { world: WorldState; b: Combatant; heroes: Combatant[]; events: CombatEvent[] } => {
    const b = boss('undertow', d, { enemyDamage: 100 });
    const heroes = column(hero('tank'), hero('archer'), hero('healer'));
    const world = fight(heroes, [b], 60);
    const events = run(world, MECHANIC.undertow.openerMs + MECHANIC.undertow.castMs + 100);
    return { world, b, heroes, events };
  };

  it('the wave strikes all three for the same share of its hit and drags them back', () => {
    for (const [d, coeff, drag] of [[0, 0.5, 50], [1, 0.6, 70], [4, 0.9, 120]] as const) {
      const { heroes, events } = wave(d);
      const hits = events.filter((e) => e.type === 'damage' && e.abilityKey === 'boss_undertow');
      expect(hits.map((e) => e.targetId).sort()).toEqual(['archer', 'healer', 'tank']);
      for (const hit of hits) expect(hit.amount).toBeCloseTo(100 * coeff, 4);
      // (the tick they were dragged on they are already walking back: within a step of the full drag)
      const step = (WALK_SPEED * TICK) / 1000;
      expect(240 - (heroes[0]?.x ?? 0)).toBeGreaterThan(drag - 2 * step - 0.01);
      expect(240 - (heroes[0]?.x ?? 0)).toBeLessThanOrEqual(drag);
    }
  });

  it('nobody attacks until he has walked back; the boss holds its ground and cannot reach them meanwhile', () => {
    const b = boss('undertow', 4, { enemyDamage: 100, range: 70, enemyAttackSpeed: 2, attackTimerMs: 0, hp: 1e9, maxHp: 1e9 });
    const sturdy = { hp: 1e6, maxHp: 1e6 };
    const tank = striker('tank', 10, sturdy);
    const archer = striker('archer', 10, sturdy);
    const heroes = column(tank, archer, hero('healer', sturdy));
    const world = fight(heroes, [b], 60);
    const until = MECHANIC.undertow.openerMs + MECHANIC.undertow.castMs;
    const calm = run(world, until - 300);
    expect(calm.filter((e) => e.type === 'damage' && e.targetId === 'boss').length).toBeGreaterThan(8);
    expect(calm.filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined).length).toBeGreaterThan(4);
    run(world, 400); // the wave lands
    expect(tank.x).toBeLessThan(240 - 60);
    const away = run(world, 500); // 120 px at the party's pace is more than a second
    expect(away.filter((e) => e.type === 'damage' && e.targetId === 'boss')).toHaveLength(0);
    expect(away.filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined)).toHaveLength(0);
    expect(b.x).toBe(300); // it did not follow them
    const back = run(world, 3000);
    expect(tank.x).toBeCloseTo(240, 0);
    expect(archer.x).toBeCloseTo(135, 0); // (two shooters keep a column's gap between them)
    expect(back.filter((e) => e.type === 'damage' && e.targetId === 'boss').length).toBeGreaterThan(3);
    expect(back.filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined).length).toBeGreaterThan(1);
  });

  it('it breaks off what a hero was winding up: his swing starts over, and an ability it cut short was never cast', () => {
    const b = boss('undertow', 0);
    const sturdy = { hp: 1e6, maxHp: 1e6 };
    const ready = abilityDef('priest_purify');
    const tank = striker('tank', 10, { ...sturdy, abilities: [{ def: ready, rank: 1 }] });
    const heroes = column(tank, hero('archer', sturdy), hero('healer', sturdy));
    const world = fight(heroes, [b], 60);
    const until = MECHANIC.undertow.openerMs + MECHANIC.undertow.castMs;
    run(world, until - 100);
    tank.attackTimerMs = 100; // a tenth of a second from his next action
    run(world, 200); // the wave lands
    expect(tank.x).toBeLessThan(240 - 20);
    expect(tank.attackTimerMs).toBeGreaterThan(700); // a whole swing to wind again (he swings once a second)
    expect(tank.cooldowns[ready.key] ?? 0).toBe(0); // nothing was cast, nothing was spent
    // A hero whose swing was further off than a whole one keeps his own time.
    const slow = hero('archer', sturdy);
    const w2 = fight(column(hero('tank', sturdy), slow, hero('healer', sturdy)), [boss('undertow', 0)], 60);
    run(w2, until + 100);
    expect(slow.attackTimerMs).toBeGreaterThan(1e11);
  });

  it('wave after wave the fight stays where it was', () => {
    const b = boss('undertow', 4, { range: 70 });
    const heroes = column(hero('tank'), hero('archer'), hero('healer'));
    const world = fight(heroes, [b], 60);
    const partyX = world.partyX;
    const events = run(world, 60_000);
    expect(events.filter((e) => e.type === 'cast' && e.abilityKey === 'boss_undertow').length).toBeGreaterThanOrEqual(4);
    run(world, 3000 - ((60_000 - MECHANIC.undertow.openerMs - MECHANIC.undertow.castMs) % MECHANIC.undertow.everyMs)); // let the last one settle
    expect(b.x).toBe(300);
    expect(heroes.map((h) => Math.round(h.x))).toEqual([240, 135, 95]);
    expect(world.partyX).toBe(partyX);
  });

  it('a hero who has fallen is not moved', () => {
    const b = boss('undertow', 0);
    const heroes = column(hero('tank'), hero('archer', { alive: false, hp: 0 }), hero('healer'));
    const world = fight(heroes, [b], 60);
    run(world, MECHANIC.undertow.openerMs + MECHANIC.undertow.castMs + 100);
    expect(heroes[1]?.x).toBe(130);
  });
});

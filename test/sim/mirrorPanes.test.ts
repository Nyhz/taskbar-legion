import { describe, it, expect } from 'vitest';
import { createWorld, Simulation, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { resolveCombatTick } from '@/sim/combat';
import { armBoss, bossKit } from '@/sim/bossMechanics';
import { litPanes } from '@/sim/mirror';
import { makeRng, type Rng } from '@/sim/rng';
import { abilityDef } from '@/data/abilities';
import { MECHANIC, MECHANIC_EXTRAS, SUMMONS, mechanicAbility } from '@/data/bossKit';
import { TRASH_DMG_FRACTION, TRASH_HP_FRACTION, enemyDamage, enemyHp, trashDmgTune } from '@/data/stageScaling';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { base, effect, quietRng, unit } from './_kit';

// Espejos, the Unmaker's own mechanic, beyond the reflected ability (test/sim/worldBossesLate.test.ts): its six
// mirrors lighting one by one and breaking over the party, and the dark reflection that steps out of every
// second one (user, 2026-11-15). Numbers in data/bossKit.ts MECHANIC.mirror; rules in sim/mirror.ts.

const TICK = 100;
const M = MECHANIC.mirror;
const PANES = M.paneEffectKey;
const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1e6, maxHp: 1e6, baseStats: base({ health: 1e6, attackDamage: 0, attackSpeed: 0.1 }), attackTimerMs: 1e12, ...over });
const PLACES = [{ x: 240, reach: 60 }, { x: 130, reach: 170 }, { x: 95, reach: 205 }] as const;
const party = (over: [Partial<Combatant>?, Partial<Combatant>?, Partial<Combatant>?] = []): Combatant[] =>
  [hero('tank', over[0]), hero('archer', over[1]), hero('healer', over[2])];
/** The Unmaker as it spawns at difficulty `d`: the breaking of the mirrors, Espejos, nothing else. */
const unmaker = (d: number, over: Partial<Combatant> = {}): Combatant =>
  unit({
    id: 'boss', side: 'enemy', hp: 1e12, maxHp: 1e12, x: 300, range: 400, moveSpeed: 60, enemyDamage: 100, enemyAttackSpeed: 0.05, attackTimerMs: 1e12,
    isBoss: true, affixes: [], bossRank: 'world', mechanic: 'mirror', enrageMs: Number.POSITIVE_INFINITY, fightMs: 0,
    abilities: [M.shatter.abilityKey, M.abilityKey].map((key) => ({ def: mechanicAbility(abilityDef(key), 'mirror', d), rank: 1 })), ...over,
  });
function fight(heroes: Combatant[], enemies: Combatant[], stage = 100): WorldState {
  const world = createWorld(7, heroes);
  if (heroes.length === PLACES.length) heroes.forEach((h, i) => { h.x = PLACES[i]?.x ?? h.x; h.range = PLACES[i]?.reach ?? h.range; });
  world.partyX = Math.max(world.partyX, 250);
  world.globalStageIndex = stage;
  world.enemies = enemies;
  world.phase = 'fighting';
  for (const e of enemies) if (e.isBoss === true) armBoss(e);
  return world;
}
function run(world: WorldState, ms: number, rng: Rng = quietRng()): CombatEvent[] {
  const out: CombatEvent[] = [];
  for (let t = 0; t < ms; t += TICK) out.push(...resolveCombatTick(world, TICK, rng));
  return out;
}
const firstMirror = M.openerMs + M.castMs;
const reflections = (w: WorldState): Combatant[] => w.enemies.filter((e) => e.summon?.key === 'reflection' && e.alive);

describe('the kit of the Unmaker', () => {
  it('holds the breaking of its mirrors ahead of Espejos, with the difficulty\'s numbers', () => {
    expect(MECHANIC_EXTRAS.mirror).toEqual([M.shatter.abilityKey]);
    expect(bossKit(1, 100, 'world').abilities.map((a) => a.def.key)).toEqual(['boss_shatter', 'boss_mirror', 'boss_shockwave']);
    const shatter = (d: number): number => mechanicAbility(abilityDef('boss_shatter'), 'mirror', d).power?.coeff ?? 0;
    expect([0, 1, 2, 3, 4].map(shatter)).toEqual([1.2, 1.45, 1.7, 1.95, 2.2]);
    expect(abilityDef('boss_shatter').castTimeMs).toBe(1500);
    expect(M.paneDamagePct).toEqual([5, 6, 7, 8, 10]);
  });
});

describe('the six mirrors', () => {
  it('every Espejos lights one: each is more damage for the rest of the fight — with or without something to reflect', () => {
    for (const [d, pct] of [[0, 5], [4, 10]] as const) {
      const b = unmaker(d, { enemyAttackSpeed: 1, attackTimerMs: 0 });
      const world = fight(party(), [b]);
      const before = run(world, firstMirror - 300).filter((e) => e.type === 'damage' && e.targetId === 'tank');
      expect(litPanes(b, PANES)).toBe(0);
      expect(before[0]?.amount).toBeCloseTo(100, 4);
      const events = run(world, 500);
      expect(litPanes(b, PANES)).toBe(1);
      expect(events.filter((e) => e.type === 'cue' && e.cue === 'pane').map((e) => e.amount)).toEqual([1]);
      expect(run(world, 2000).filter((e) => e.type === 'damage' && e.targetId === 'tank')[0]?.amount).toBeCloseTo(100 * (1 + pct / 100), 4);
      run(world, M.everyMs * 2);
      expect(litPanes(b, PANES)).toBe(3);
      expect(run(world, 2000).filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined)[0]?.amount).toBeCloseTo(100 * (1 + (3 * pct) / 100), 4);
    }
  });

  it('with the six lit — the 49th second, a mirror every 8 s — it breaks them: an area blow on all three, behind its own cast bar', () => {
    for (const [d, coeff] of [[0, 1.2], [4, 2.2]] as const) {
      const b = unmaker(d);
      const world = fight(party(), [b]);
      const sixth = firstMirror + M.everyMs * 5;
      const early = run(world, sixth - 300);
      expect(litPanes(b, PANES)).toBe(5);
      expect(early.some((e) => e.type === 'cast' && e.abilityKey === 'boss_shatter')).toBe(false);
      run(world, 500); // the sixth lights
      expect(litPanes(b, PANES)).toBe(6);
      expect(b.casting?.key).toBe('boss_shatter'); // …and it starts winding the blow up at once
      const events = run(world, M.shatter.castMs + 200);
      expect(M.everyMs).toBe(8000);
      expect(sixth + M.shatter.castMs).toBe(49_000); // eleven seconds before the enrage
      const blow = events.filter((e) => e.type === 'damage' && e.abilityKey === 'boss_shatter');
      expect(blow.map((e) => e.targetId).sort()).toEqual(['archer', 'healer', 'tank']);
      // The panes went dark BEFORE the blow landed: it is the plain one, the same on everyone.
      for (const hit of blow) expect(hit.amount).toBeCloseTo(100 * coeff, 4);
      expect(litPanes(b, PANES)).toBe(0);
      expect(effect(b, PANES)).toBeUndefined();
      expect(events.some((e) => e.type === 'cue' && e.cue === 'shatter')).toBe(true);
      // …and it starts lighting them again.
      run(world, M.everyMs);
      expect(litPanes(b, PANES)).toBe(1);
    }
  });
});

describe('the dark reflection', () => {
  const copied = (heroId: string): Partial<Combatant> => ({ lastHeroCast: { key: 'ranger_multishot', rank: 1, heroId } });

  it('steps out of every second mirror: a reflection of the hero whose ability was copied, with its own life', () => {
    const b = unmaker(1, copied('archer'));
    const heroes = party([{}, { classKey: 'ranger', baseStats: base({ health: 1e6, attackSpeed: 1.2 }) }]);
    const world = fight(heroes, [b]);
    run(world, firstMirror + 200);
    expect(reflections(world)).toHaveLength(0); // the first mirror: none
    run(world, M.everyMs);
    const [twin] = reflections(world);
    expect(twin?.summon?.of).toEqual({ heroId: 'archer', classKey: 'ranger' });
    expect(twin?.maxHp).toBeCloseTo(enemyHp(100) * TRASH_HP_FRACTION * (SUMMONS.reflection?.hpOfGrunt ?? 0), 6);
    expect(twin?.enemyDamage).toBeCloseTo(enemyDamage(100) * TRASH_DMG_FRACTION * trashDmgTune(100) * 0.95, 6); // Hell
    expect(twin?.enemyAttackSpeed).toBeCloseTo(1.2, 6); // the pace of the hero it reflects
    expect(M.reflection.every).toEqual([2, 2, 2, 2, 2]);
    expect(M.reflection.hitOfTrash).toEqual([0.8, 0.95, 1.1, 1.25, 1.4]);
    // Gone after its 8 s; the next comes with the fourth mirror, not the third.
    run(world, (SUMMONS.reflection?.lifeMs ?? 0) + 200);
    expect(reflections(world)).toHaveLength(0);
    run(world, 2000);
    expect(litPanes(b, PANES)).toBe(3);
    expect(reflections(world)).toHaveLength(0);
    run(world, M.everyMs);
    expect(reflections(world)).toHaveLength(1);
  });

  it('goes for its own hero when he stands behind the front one; a front hero\'s reflection goes for whoever is behind', () => {
    const hitBy = (heroId: string, seed: number): string[] => {
      const world = fight(party(), [unmaker(0, copied(heroId))]);
      run(world, firstMirror + M.everyMs + 300, makeRng(seed));
      const twin = reflections(world)[0];
      return run(world, 6000, makeRng(seed)).filter((e) => e.type === 'damage' && e.sourceId === twin?.id).map((e) => e.targetId);
    };
    const onHealer = hitBy('healer', 3);
    expect(onHealer.length).toBeGreaterThanOrEqual(3); // 6 s at the slowest pace a reflection keeps (0.6 a second)
    expect(onHealer.every((id) => id === 'healer')).toBe(true);
    const fromTank = hitBy('tank', 3);
    expect(fromTank.length).toBeGreaterThanOrEqual(3);
    expect(fromTank.every((id) => id !== 'tank')).toBe(true);
    // (Which of the two behind him it strikes is picked at random each time.)
  });

  it('the heroes behind can kill it, the front hero cannot reach it; no reflection of a fallen hero or with nothing copied', () => {
    const striker = { baseStats: base({ health: 1e6, attackDamage: 1e9, attackSpeed: 2 }), attackTimerMs: 0 };
    const front = fight(party([striker]), [unmaker(0, copied('archer'))]);
    run(front, firstMirror + M.everyMs + 2000);
    expect(reflections(front)).toHaveLength(1);
    const back = fight(party([{}, striker]), [unmaker(0, copied('healer'))]);
    const events = run(back, firstMirror + M.everyMs + 2000);
    expect(reflections(back)).toHaveLength(0);
    expect(events.some((e) => e.type === 'death' && e.targetId.includes('_reflection_'))).toBe(true);

    const fallen = fight(party([{}, { alive: false, hp: 0 }]), [unmaker(0, copied('archer'))]);
    run(fallen, firstMirror + M.everyMs + 300);
    expect(reflections(fallen)).toHaveLength(0);
    const nothing = fight(party(), [unmaker(0)]);
    run(nothing, firstMirror + M.everyMs + 300);
    expect(reflections(nothing)).toHaveLength(0);
    expect(litPanes(nothing.enemies[0] as Combatant, PANES)).toBe(2); // the mirrors light all the same
  });

  it('stands half-way between the back line and the front hero, on its own', () => {
    const world = fight(party(), [unmaker(0, copied('healer'))]);
    run(world, firstMirror + M.everyMs + 3000);
    const [twin] = reflections(world);
    const [tank, archer] = world.heroes;
    expect(twin?.x).toBeCloseTo(((tank?.x ?? 0) + (archer?.x ?? 0)) / 2, 6);
    expect(twin?.summon?.toX).toBe(twin?.x);
    expect(SUMMONS.reflection?.between).toBe(0.5);
  });

  it('never two at once: one that is due while the last still stands waits for it to fall or run out', () => {
    // (With the data's numbers it cannot happen — one every 16 s, each gone after 8 — so the mirror is hurried
    // here: one every 3 s, a reflection out of each.)
    const hurried = mechanicAbility(abilityDef(M.abilityKey), 'mirror', 0);
    const special = hurried.special?.kind === 'mirror' ? { ...hurried.special, reflectionEvery: 1 } : undefined;
    const b = unmaker(0, { ...copied('archer'), abilities: [{ def: { ...hurried, cooldownMs: 3000, special }, rank: 1 }] });
    const world = fight(party(), [b]);
    let most = 0;
    const born: number[] = [];
    const seen = new Set<string>();
    for (let t = 0; t < 30_000; t += TICK) {
      resolveCombatTick(world, TICK, quietRng());
      const live = reflections(world);
      most = Math.max(most, live.length);
      for (const twin of live) if (!seen.has(twin.id)) { seen.add(twin.id); born.push(t); }
    }
    expect(most).toBe(1);
    expect(born.length).toBeGreaterThanOrEqual(3);
    // Each next one steps out the moment the last has run its 8 s — not at the mirror that owed it.
    const life = SUMMONS.reflection?.lifeMs ?? 0;
    for (let i = 1; i < born.length; i++) {
      const apart = (born[i] ?? 0) - (born[i - 1] ?? 0);
      expect(apart).toBeGreaterThanOrEqual(life - TICK);
      expect(apart).toBeLessThanOrEqual(life);
    }
    // …and when the last one is killed instead, the one that was owed steps out at once.
    const [twin] = reflections(world);
    if (twin === undefined) throw new Error('no reflection');
    b.reflectionOwed = { summon: 'reflection', hit: 0.8, stage: 100 };
    twin.alive = false;
    resolveCombatTick(world, TICK, quietRng());
    expect(reflections(world)).toHaveLength(1);
    expect(reflections(world)[0]?.id).not.toBe(twin.id);
  });

  it('is no kill for the purse and goes down with the Unmaker', () => {
    const world = createWorld(3, [hero('tank', { baseStats: base({ health: 1e9, attackDamage: 1, attackSpeed: 1 }), attackTimerMs: 0, range: 50 }), hero('archer', { range: 160 }), hero('healer', { range: 200 })]);
    world.globalStageIndex = 99;
    world.maxClearedStage = 99;
    const sim = new Simulation(world);
    expect(sim.enterZoneBoss()).toBe(true);
    const ctx: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: [] };
    const w = sim.world;
    const b = w.enemies.find((e) => e.isBoss === true) as Combatant;
    b.maxHp = 1e12;
    b.hp = 1e12;
    b.lastHeroCast = { key: 'ranger_multishot', rank: 1, heroId: 'archer' };
    for (let t = 0; t < 900 && reflections(w).length === 0; t++) sim.tick(ctx);
    expect(reflections(w)).toHaveLength(1);
    const kills = w.pending.kills;
    b.hp = 0.5;
    let deaths = 0;
    for (let t = 0; t < 100 && b.alive; t++) deaths += sim.tick(ctx).filter((e) => e.type === 'death').length;
    expect(b.alive).toBe(false);
    expect(deaths).toBe(2); // it and its reflection
    expect(w.pending.kills).toBe(kills);
  });
});

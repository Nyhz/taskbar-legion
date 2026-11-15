import { describe, expect, it } from 'vitest';
import { buildHeroCombatant, refreshHeroLoadout, type HeroConfig } from '@/sim/loadout';
import { heroAttack, heroStats, resolveCombatTick } from '@/sim/combat';
import { onBlock, onEffectsEnded, type TriggerCtx } from '@/sim/triggers';
import { Simulation, createWorld } from '@/sim/Simulation';
import { isInvulnerable, vulnerabilityMult, weakenMult } from '@/sim/effects';
import type { TriggerDef } from '@/data/triggers';
import type { Combatant, CombatEvent } from '@/sim/world';
import { effect, luckyRng, quietRng, unit } from './_kit';

// Generic triggers (docs/redesign/CLASSES.md, F5): the class ultimates run through them, and so do Riposte's
// charges, two modifiers and five of the six capstones.

const hero = (id: string, classKey: string, talents: Record<string, number>, level = 100): Combatant => {
  const config: HeroConfig = { id, classKey, level, equipment: {}, talents };
  return buildHeroCombatant(config, []);
};
const foe = (over: Partial<Combatant> & { id: string }): Combatant =>
  unit({ side: 'enemy', hp: 1e9, maxHp: 1e9, range: 1000, enemyDamage: 1, enemyAttackSpeed: 1, ...over });
const ctxOf = (heroes: Combatant[], enemies: Combatant[] = [], events: CombatEvent[] = []): TriggerCtx => ({ heroes, enemies, events });

describe('what a hero carries', () => {
  it('no ultimate before level 30, and nothing at all for a hero without kit', () => {
    expect(hero('k', 'knight', {}, 29).triggers).toBeUndefined();
    expect(hero('k', 'knight', {}, 30).triggers?.map((t) => t.key)).toEqual(['knight_laststand']);
  });

  it('a capstone transforms the ultimate; a modifier or an ability brings its own trigger', () => {
    expect(hero('k', 'knight', { knight_cap_living_wall: 1 }).triggers?.map((t) => t.key)).toEqual(['knight_laststand', 'knight_cap_living_wall']);
    expect(hero('k', 'knight', { knight_riposte: 1 }, 10).triggers?.map((t) => t.key)).toEqual(['knight_riposte_charge']);
    expect(hero('k', 'knight', { knight_bulwark: 1, knight_mod_mending_bulwark: 1 }, 10).triggers?.map((t) => t.key)).toEqual(['knight_mod_mending_bulwark']);
    // A modifier whose ability is not in use brings nothing.
    expect(hero('k', 'knight', { knight_mod_mending_bulwark: 1 }, 10).triggers).toBeUndefined();
  });

  it('a mid-fight refresh re-resolves them', () => {
    const k = hero('k', 'knight', {}, 10);
    refreshHeroLoadout(k, { id: 'k', classKey: 'knight', level: 10, equipment: {}, talents: { knight_riposte: 1 } }, []);
    expect(k.triggers?.map((t) => t.key)).toEqual(['knight_riposte_charge']);
    refreshHeroLoadout(k, { id: 'k', classKey: 'knight', level: 10, equipment: {}, talents: {} }, []);
    expect(k.triggers).toBeUndefined();
  });
});

describe('on block', () => {
  it('Riposte banks one charge per blocked hit, up to what it needs to fire, and none on an unblocked one', () => {
    const k = hero('k', 'knight', { knight_riposte: 1 }, 10);
    const enemy = foe({ id: 'e', x: 0 });
    const blocked = createWorld(1, [k]);
    blocked.enemies = [enemy];
    const events = resolveCombatTick(blocked, 100, luckyRng()); // every chance succeeds: the hit is blocked
    expect(events.some((e) => e.blocked === true)).toBe(true);
    expect(k.charges?.knight_riposte).toBe(1);
    for (let i = 0; i < 9; i++) onBlock(k, enemy, ctxOf([k], [enemy]));
    expect(k.charges?.knight_riposte).toBe(4); // capped at the charges it fires at

    const k2 = hero('k', 'knight', { knight_riposte: 1 }, 10);
    const open = createWorld(1, [k2]);
    open.enemies = [foe({ id: 'e', x: 0 })];
    resolveCombatTick(open, 100, quietRng()); // every chance fails: not blocked
    expect(k2.charges?.knight_riposte ?? 0).toBe(0);
  });

  it('Thirst for Battle: every blocked hit lengthens a running Bloodlust by 1s, and does nothing without one', () => {
    const k = hero('k', 'knight', { knight_bloodlust: 1, knight_mod_thirst_for_battle: 1 }, 10);
    const enemy = foe({ id: 'e' });
    onBlock(k, enemy, ctxOf([k]));
    expect(k.effects).toHaveLength(0);
    k.effects.push(
      { defKey: 'buff_bloodlust_as', sourceId: 'k', remainingMs: 3000, totalMs: 8000, stacks: 1, value: 24 },
      { defKey: 'buff_bloodlust_ls', sourceId: 'k', remainingMs: 3000, totalMs: 8000, stacks: 1, value: 8 },
      { defKey: 'buff_guard_block', sourceId: 'k', remainingMs: 3000, totalMs: 6000, stacks: 1, value: 20 },
    );
    onBlock(k, enemy, ctxOf([k]));
    onBlock(k, enemy, ctxOf([k]));
    expect(effect(k, 'buff_bloodlust_as')?.remainingMs).toBe(5000);
    expect(effect(k, 'buff_bloodlust_ls')?.remainingMs).toBe(5000);
    expect(effect(k, 'buff_guard_block')?.remainingMs).toBe(3000);
  });
});

describe('on an effect ending', () => {
  const party = (): { k: Combatant; r: Combatant } => {
    const k = hero('k', 'knight', { knight_bulwark: 1, knight_mod_mending_bulwark: 1 }, 10);
    const r = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 500 });
    k.hp = k.maxHp / 2;
    return { k, r };
  };

  it('Mending Bulwark: when his Bulwark runs out, the party heals 6% of its life', () => {
    const { k, r } = party();
    k.effects.push({ defKey: 'fx_shield', sourceId: 'k', remainingMs: 100, stacks: 1, value: 50 });
    const world = createWorld(1, [k, r]);
    const events = resolveCombatTick(world, 100, quietRng());
    expect(r.hp).toBeCloseTo(560, 6);
    expect(events.filter((e) => e.type === 'heal' && e.sourceId === 'k')).toHaveLength(2);
  });

  it('…and when it is broken by damage', () => {
    const { k, r } = party();
    k.effects.push({ defKey: 'fx_shield', sourceId: 'k', remainingMs: 8000, stacks: 1, value: 5 });
    const world = createWorld(1, [k, r]);
    world.enemies = [foe({ id: 'e', x: 0, enemyDamage: 100 })];
    resolveCombatTick(world, 100, quietRng()); // the hit spends the shield
    expect(r.hp).toBe(500);
    resolveCombatTick(world, 100, quietRng()); // the spent shield drops → the party is healed
    expect(r.hp).toBeCloseTo(560, 6);
  });

  it('someone else’s shield ending on him does not count, nor his own with the Knight down', () => {
    const { k, r } = party();
    onEffectsEnded(k, [{ defKey: 'fx_shield', sourceId: 'p', remainingMs: 0, stacks: 1, value: 0 }], ctxOf([k, r]));
    expect(r.hp).toBe(500);
    k.alive = false;
    onEffectsEnded(k, [{ defKey: 'fx_shield', sourceId: 'k', remainingMs: 0, stacks: 1, value: 0 }], ctxOf([k, r]));
    expect(r.hp).toBe(500);
  });
});

describe('a hero about to fall', () => {
  it('Living Wall: the Last Stand charge also saves an ALLY — left at 1 life, invulnerable 3s', () => {
    const k = hero('k', 'knight', { knight_cap_living_wall: 1 });
    const r = hero('r', 'ranger', {}, 20);
    r.hp = -5; // a blow that would kill
    const world = createWorld(1, [k, r]);
    resolveCombatTick(world, 100, quietRng());
    expect(r.alive).toBe(true);
    expect(r.hp).toBe(1);
    expect(effect(r, 'fx_invuln')?.remainingMs).toBe(3000);
    expect(k.ultCharge).toBe(0); // the one charge of the stage is spent…
    r.effects = [];
    r.hp = -5;
    resolveCombatTick(world, 100, quietRng());
    expect(r.alive).toBe(false); // …so the next fall is final
  });

  it('without the capstone an ally just falls; the Knight’s own Last Stand is untouched', () => {
    const k = hero('k', 'knight', {});
    const r = hero('r', 'ranger', {}, 20);
    r.hp = -5;
    resolveCombatTick(createWorld(1, [k, r]), 100, quietRng());
    expect(r.alive).toBe(false);
    expect(k.ultCharge).toBe(1);
  });

  it('the Knight falling uses his own Last Stand first (healed to 40%, 6s), not the ally clause', () => {
    const k = hero('k', 'knight', { knight_cap_living_wall: 1 });
    k.hp = -5;
    resolveCombatTick(createWorld(1, [k]), 100, quietRng());
    expect(k.alive).toBe(true);
    expect(k.hp).toBeGreaterThanOrEqual(k.maxHp * 0.4);
    expect(effect(k, 'fx_invuln')?.remainingMs).toBe(6000);
    expect(isInvulnerable(k.effects)).toBe(true);
  });

  it('Vengeance: when Last Stand fires, the enemies in his reach deal 30% less and are 30% slower for 6s', () => {
    const k = hero('k', 'knight', { knight_cap_vengeance: 1 });
    k.hp = 1;
    const near = foe({ id: 'near', x: 20, enemyDamage: 1e9 });
    const far = foe({ id: 'far', x: 5000, range: 10 });
    const world = createWorld(1, [k]);
    world.enemies = [near, far];
    resolveCombatTick(world, 100, quietRng());
    expect(k.alive).toBe(true);
    expect(k.ultCharge).toBe(0);
    expect(weakenMult(near.effects)).toBeCloseTo(0.7, 9);
    expect(effect(near, 'debuff_vengeance_slow')).toMatchObject({ value: -30, remainingMs: 6000 });
    expect(far.effects).toHaveLength(0);
    // The plain Last Stand leaves the enemies alone.
    const plain = hero('k', 'knight', {});
    plain.hp = 1;
    const e = foe({ id: 'e', x: 20, enemyDamage: 1e9 });
    const w2 = createWorld(1, [plain]);
    w2.enemies = [e];
    resolveCombatTick(w2, 100, quietRng());
    expect(plain.alive).toBe(true);
    expect(e.effects).toHaveLength(0);
  });
});

describe('on engaging an enemy or a wave', () => {
  const engage = (heroes: Combatant[], enemies: Combatant[]): CombatEvent[] => {
    const world = createWorld(1, heroes);
    world.enemies = enemies;
    return resolveCombatTick(world, 100, quietRng());
  };

  it('the base ultimates fire against a boss only, once', () => {
    const r = hero('r', 'ranger', {});
    const p = hero('p', 'priest', {});
    const elite = foe({ id: 'elite', x: 0, isElite: true });
    engage([r, p], [elite]);
    expect(elite.effects).toHaveLength(0);
    expect(effect(r, 'buff_enrage_as')).toBeUndefined();
    const boss = foe({ id: 'boss', x: 0, isBoss: true });
    const events = engage([r, p], [boss]);
    expect(vulnerabilityMult(boss.effects)).toBeCloseTo(1.25, 9);
    expect(effect(r, 'buff_enrage_as')).toMatchObject({ value: 25, remainingMs: 10000 });
    expect(events.filter((e) => e.type === 'cast' && e.abilityKey === 'ranger_mark')).toEqual([
      { type: 'cast', targetId: 'r', sourceId: 'boss', abilityKey: 'ranger_mark' },
    ]);
  });

  it('Crusade: Battle Enrage also fires against elites and lasts 15s', () => {
    const p = hero('p', 'priest', { priest_cap_crusade: 1 });
    const k = hero('k', 'knight', {});
    engage([k, p], [foe({ id: 'elite', x: 0, isElite: true })]);
    for (const h of [k, p]) {
      expect(effect(h, 'buff_enrage_cdr')).toMatchObject({ value: 25, remainingMs: 15000 });
      expect(effect(h, 'buff_enrage_as')).toMatchObject({ value: 25, remainingMs: 15000 });
    }
    const p2 = hero('p', 'priest', { priest_cap_crusade: 1 });
    engage([p2], [foe({ id: 'grunt', x: 0 })]); // a plain enemy: nothing
    expect(p2.effects).toHaveLength(0);
  });

  it('Relentless Mark: the mark also goes on elites, and jumps to the enemy in front when its bearer dies', () => {
    const r = hero('r', 'ranger', { ranger_cap_relentless_mark: 1 });
    const elite = foe({ id: 'elite', x: 0, isElite: true });
    const back = foe({ id: 'back', x: 300, range: 10 });
    const front = foe({ id: 'front', x: 200, range: 10 });
    const world = createWorld(1, [r]);
    world.enemies = [elite, back, front];
    resolveCombatTick(world, 100, quietRng());
    expect(effect(elite, 'fx_mark')?.value).toBe(25);
    const left = effect(elite, 'fx_mark')?.remainingMs ?? 0;
    elite.hp = 1;
    // The ranger's shot kills the elite: the mark moves, as it is, to the nearest enemy still standing.
    const events: CombatEvent[] = [];
    heroAttack(r, heroStats(r), elite, world.enemies, quietRng(), events, world.heroes);
    expect(elite.alive).toBe(false);
    expect(effect(front, 'fx_mark')).toMatchObject({ value: 25, remainingMs: left });
    expect(effect(back, 'fx_mark')).toBeUndefined();
    expect(events.some((e) => e.type === 'cast' && e.abilityKey === 'ranger_mark' && e.sourceId === 'front')).toBe(true);
  });

  it('without the capstone the mark stays with a dead boss; with nobody left it just ends', () => {
    const plain = hero('r', 'ranger', {});
    const boss = foe({ id: 'boss', x: 0, isBoss: true });
    const other = foe({ id: 'other', x: 200, range: 10 });
    const world = createWorld(1, [plain]);
    world.enemies = [boss, other];
    resolveCombatTick(world, 100, quietRng());
    expect(effect(boss, 'fx_mark')?.value).toBe(25);
    boss.hp = 1;
    heroAttack(plain, heroStats(plain), boss, world.enemies, quietRng(), [], world.heroes);
    expect(boss.alive).toBe(false);
    expect(other.effects).toHaveLength(0);

    const r = hero('r', 'ranger', { ranger_cap_relentless_mark: 1 });
    const lone = foe({ id: 'lone', x: 0, isBoss: true });
    const w2 = createWorld(1, [r]);
    w2.enemies = [lone];
    resolveCombatTick(w2, 100, quietRng());
    lone.hp = 1;
    const events: CombatEvent[] = [];
    heroAttack(r, heroStats(r), lone, w2.enemies, quietRng(), events, w2.heroes);
    expect(lone.alive).toBe(false);
    expect(events.filter((e) => e.type === 'cast')).toHaveLength(0);
  });

  it('Killing Field: once per wave, when its first enemy arrives, every enemy takes +10% damage and is 30% slower', () => {
    const r = hero('r', 'ranger', { ranger_cap_killing_field: 1 });
    const first = foe({ id: 'first', x: 0 });
    const walking = foe({ id: 'walking', x: 9000, range: 10 });
    const world = createWorld(1, [r]);
    world.enemies = [first, walking];
    resolveCombatTick(world, 100, quietRng());
    for (const e of [first, walking]) {
      expect(vulnerabilityMult(e.effects)).toBeCloseTo(1.1, 9);
      expect(effect(e, 'debuff_field_slow')).toMatchObject({ value: -30, remainingMs: 6000 });
    }
    // A second enemy of the SAME wave arriving later does not set it off again.
    for (const e of [first, walking]) e.effects = [];
    walking.x = 0;
    walking.range = 1000;
    resolveCombatTick(world, 100, quietRng());
    expect(walking.engaged).toBe(true);
    expect(walking.effects).toHaveLength(0);
    // The next wave does.
    const next = foe({ id: 'next', x: 0 });
    world.enemies = [next];
    resolveCombatTick(world, 100, quietRng());
    expect(vulnerabilityMult(next.effects)).toBeCloseTo(1.1, 9);
  });
});

describe('an ally is low', () => {
  it('Second Wind: once per stage, the first time someone drops under 25%, the party heals 30% and gets a 10% shield', () => {
    const p = hero('p', 'priest', { priest_cap_second_wind: 1 });
    const k = unit({ id: 'k', side: 'hero', hp: 300, maxHp: 1000 });
    const world = createWorld(1, [k, p]);
    resolveCombatTick(world, 100, quietRng());
    expect(k.hp).toBe(300); // 30%: not low enough
    k.hp = 200;
    p.hp = p.maxHp * 0.5;
    resolveCombatTick(world, 100, quietRng());
    expect(k.hp).toBeCloseTo(500, 6);
    expect(p.hp).toBeGreaterThanOrEqual(p.maxHp * 0.8);
    expect(effect(k, 'fx_ward')?.value).toBeCloseTo(100, 6);
    expect(effect(p, 'fx_ward')?.value).toBeCloseTo(p.maxHp * 0.1, 6);
    // Spent for this stage…
    k.hp = 100;
    resolveCombatTick(world, 100, quietRng());
    expect(k.hp).toBe(100);
    // …and back with the next one (the Simulation refills it where it refills the Last Stand charge).
    new Simulation(world).travelTo(2);
    k.hp = 100;
    resolveCombatTick(world, 100, quietRng());
    expect(k.hp).toBeCloseTo(400, 6);
  });
});

describe('the generic events content does not use yet (crit, kill)', () => {
  const custom = (event: TriggerDef['event']): Combatant => {
    const r = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: { attackDamage: 50 } });
    r.triggers = [{ key: 't', event, actions: [{ do: 'apply', effectKey: 'buff_fast_fire', to: 'self' }] }];
    return r;
  };

  it('"on crit" fires for a critical auto-attack and not for a plain one', () => {
    const r = custom({ on: 'crit' });
    heroAttack(r, heroStats(r), foe({ id: 'e' }), [], quietRng(), []);
    expect(r.effects).toHaveLength(0);
    heroAttack(r, { ...heroStats(r), critChance: 100, multistrike: 0 }, foe({ id: 'e' }), [], luckyRng(), []);
    expect(effect(r, 'buff_fast_fire')?.value).toBe(25);
  });

  it('"on kill" fires for the hero whose hit killed', () => {
    const r = custom({ on: 'kill' });
    const other = custom({ on: 'kill' });
    other.id = 'o';
    const victim = foe({ id: 'e', hp: 10 });
    heroAttack(r, heroStats(r), victim, [victim], quietRng(), [], [r, other]);
    expect(victim.alive).toBe(false);
    expect(effect(r, 'buff_fast_fire')).toBeDefined();
    expect(other.effects).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import { createWorld, Simulation, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { resolveCombatTick } from '@/sim/combat';
import { armBoss, bossKit, shellDamage } from '@/sim/bossMechanics';
import { castReadyAbilities } from '@/sim/abilities';
import { applyEffect, effectStatMods } from '@/sim/effects';
import { spawnStageBoss, spawnZoneBoss } from '@/sim/stages';
import { makeRng, type Rng } from '@/sim/rng';
import { abilityDef } from '@/data/abilities';
import { AFFIX_COUNT, AFFIX_POOL, BOSS_AFFIX, BOSS_AFFIX_KEYS, MECHANIC, SUMMONS, WORLD_BOSS_MECHANIC, bossAffixes, bossMagicShare, mechanicAbility, worldBossMechanic } from '@/data/bossKit';
import { globalStageOf } from '@/data/difficulties';
import { effectDef } from '@/data/effects';
import { WORLDS } from '@/data/worlds';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { base, effect, quietRng, unit } from './_kit';

// The boss kit (docs/redesign/PROGRESS.md "Combate, segunda ola", C and D): a boss is its area blow + affixes +,
// for a world boss, the mechanic of its figure. Numbers in data/bossKit.ts, rules in sim/bossMechanics.ts.

const TICK = 100;

const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1e6, maxHp: 1e6, baseStats: base({ health: 1e6, attackDamage: 0, attackSpeed: 0.1 }), attackTimerMs: 1e12, ...over });

/** A hero who does swing: once a second for `damage`. */
const striker = (id: string, damage: number, over: Partial<Combatant> = {}): Combatant =>
  hero(id, { baseStats: base({ health: 1e6, attackDamage: damage, attackSpeed: 1 }), attackTimerMs: 0, ...over });

/** The party as it stands in a real fight: the tank in reach of the boss, the shooter and the healer well behind. */
const column = (tank: Combatant, archer: Combatant, healer?: Combatant): Combatant[] => {
  const place = (h: Combatant, x: number, reach: number): void => {
    h.x = x;
    if (h.range === 30) h.range = reach; // the kit's bare default: give it the reach that keeps it there
  };
  place(tank, 240, 60);
  place(archer, 130, 170);
  if (healer !== undefined) place(healer, 95, 205);
  return healer === undefined ? [tank, archer] : [tank, archer, healer];
};

/** A boss already in reach of the front hero, swinging once a second for 100, with these affixes. */
const boss = (affixes: readonly string[], over: Partial<Combatant> = {}): Combatant =>
  unit({ id: 'boss', side: 'enemy', hp: 1e6, maxHp: 1e6, x: 20, range: 400, enemyDamage: 100, enemyAttackSpeed: 1, isBoss: true, affixes, bossRank: 'stage', enrageMs: Number.POSITIVE_INFINITY, fightMs: 0, ...over });

function fight(heroes: Combatant[], enemies: Combatant[], stage = 20): WorldState {
  const world = createWorld(7, heroes);
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

describe('which affixes a boss carries', () => {
  it('stage bosses: none in Normal, one from Hell, two in Eternal and Torment; world bosses: one from Inferno, two in Torment', () => {
    expect(AFFIX_COUNT.stage).toEqual([0, 1, 1, 2, 2]);
    expect(AFFIX_COUNT.world).toEqual([0, 0, 1, 1, 2]);
    for (let d = 0; d < 5; d++) {
      for (let s = 1; s <= 9; s++) expect(bossAffixes(11, globalStageOf(d, 3, s), 'stage', d)).toHaveLength(AFFIX_COUNT.stage[d] ?? 0);
      expect(bossAffixes(11, globalStageOf(d, 3, 10), 'world', d)).toHaveLength(AFFIX_COUNT.world[d] ?? 0);
    }
  });

  it('are picked from the seed and the stage alone: the same every time, different across stages and runs, never twice the same one', () => {
    const S = globalStageOf(4, 2, 5);
    expect(bossAffixes(99, S, 'stage', 4)).toEqual(bossAffixes(99, S, 'stage', 4));
    const seen = new Set<string>();
    let differs = false;
    for (let s = 101; s <= 200; s++) {
      const picked = bossAffixes(99, s, 'stage', 1);
      for (const k of picked) seen.add(k);
      if (picked.join() !== bossAffixes(100, s, 'stage', 1).join()) differs = true;
      const two = bossAffixes(99, s + 300, 'stage', 4);
      expect(new Set(two).size).toBe(2);
    }
    expect([...seen].sort()).toEqual([...BOSS_AFFIX_KEYS].sort()); // every affix turns up across a difficulty
    expect(differs).toBe(true);
  });

  it('a spawned boss wears them, and spawning one draws nothing from the combat rng', () => {
    const normal = fight([hero('tank')], [], globalStageOf(0, 2, 5));
    spawnStageBoss(normal, makeRng(1));
    expect(normal.enemies[0]?.affixes).toEqual([]);
    // Round 10 («presión desde el mundo 3»): Hell's worlds 1–2 still bring Normal's affixes (none); Hell's own from world 3.
    const early = fight([hero('tank')], [], globalStageOf(1, 2, 5));
    spawnStageBoss(early, makeRng(1));
    expect(early.enemies[0]?.affixes).toEqual([]);
    const hell = fight([hero('tank')], [], globalStageOf(1, 5, 5));
    const rng = quietRng();
    spawnStageBoss(hell, rng);
    expect(hell.enemies[0]?.affixes).toEqual(bossAffixes(hell.seed, hell.globalStageIndex, 'stage', 1));
    expect(hell.enemies[0]?.bossRank).toBe('stage');
    expect(rng.draws).toBe(0); // its physical/magic mix is its own now (data/bossKit BOSS_MAGIC_SHARE), not a coin
    expect(hell.enemies[0]?.magicShare).toBe(bossMagicShare(hell.globalStageIndex, 'stage'));
  });
});

describe('what a boss wields', () => {
  it('a world boss casts its own mechanic first, then the shockwave; one with no mechanic yet just the shockwave', () => {
    // Every world's boss has one, and each its own.
    expect(Object.keys(WORLD_BOSS_MECHANIC).sort()).toEqual(WORLDS.map((w) => w.worldBoss?.key ?? '').sort());
    expect(new Set(Object.values(WORLD_BOSS_MECHANIC)).size).toBe(WORLDS.length);
    expect(WORLDS[0]?.worldBoss?.key).toBe('crowmother');
    expect(worldBossMechanic(10)).toBe('flock');
    expect(worldBossMechanic(20)).toBe('roots');
    expect(worldBossMechanic(30)).toBe('chainBolt');
    expect(worldBossMechanic(40)).toBe('guilt');
    expect([70, 80, 90, 100].map(worldBossMechanic)).toEqual(['spores', 'redBlade', 'scales', 'mirror']);
    expect(bossKit(1, 20, 'world').abilities.map((a) => a.def.key)).toEqual(['boss_roots', 'boss_shockwave']);
    expect(bossKit(1, 70, 'world').abilities.map((a) => a.def.key)).toEqual(['boss_spores', 'boss_shockwave']);
    expect(bossKit(1, 45, 'stage').abilities.map((a) => a.def.key)).toEqual(['boss_slam']); // a stage boss has none
    const wall = fight([hero('tank')], [], 30);
    spawnZoneBoss(wall, makeRng(1));
    expect(wall.enemies[0]?.mechanic).toBe('chainBolt');
    expect(wall.enemies[0]?.bossRank).toBe('world');
  });

  it('Seismic shortens the area blow; Deadeye and Mortal Wound bring their abilities', () => {
    let seismic = 0;
    let deadeye = 0;
    let mortal = 0;
    for (let s = 101; s <= 199; s++) {
      const kit = bossKit(5, s, 'stage');
      const slam = kit.abilities.find((a) => a.def.key === 'boss_slam');
      expect(slam?.def.cooldownMs).toBe(kit.affixes.includes('seismic') ? BOSS_AFFIX.seismic.blowEveryMs : abilityDef('boss_slam').cooldownMs);
      expect(kit.abilities.some((a) => a.def.key === 'boss_deadeye')).toBe(kit.affixes.includes('deadeye'));
      expect(kit.abilities.some((a) => a.def.key === 'boss_mortal_wound')).toBe(kit.affixes.includes('mortalWound'));
      if (kit.affixes.includes('seismic')) seismic++;
      if (kit.affixes.includes('deadeye')) deadeye++;
      if (kit.affixes.includes('mortalWound')) mortal++;
    }
    expect(Math.min(seismic, deadeye, mortal)).toBeGreaterThan(0);
    expect(BOSS_AFFIX.seismic.blowEveryMs).toBeLessThan(abilityDef('boss_slam').cooldownMs);
  });

  it('the mechanics tighten with the difficulty', () => {
    const flock = (d: number): number => {
      const special = mechanicAbility(abilityDef('boss_flock'), 'flock', d).special;
      return special?.kind === 'summon' ? special.count : 0;
    };
    expect([0, 1, 4].map(flock)).toEqual([2, 3, 4]);
    const roots = (d: number): number => mechanicAbility(abilityDef('boss_roots'), 'roots', d).cooldownMs;
    expect(roots(0)).toBeGreaterThan(roots(1));
    expect(roots(1)).toBeGreaterThan(roots(4));
    const bolt = (d: number): number => mechanicAbility(abilityDef('boss_chain_bolt'), 'chainBolt', d).power?.coeff ?? 0;
    expect(bolt(0)).toBeLessThan(bolt(1));
    expect(bolt(1)).toBeLessThan(bolt(4));
  });
});

describe('Armored (Acorazado)', () => {
  it('a shell worth a tenth of its life: hits are cut while it holds, crits wear it twice as fast, and it returns after 15 s', () => {
    const b = boss(['armored'], { hp: 1000, maxHp: 1000 });
    armBoss(b);
    const shell = effect(b, BOSS_AFFIX.armored.effectKey);
    expect(shell?.value).toBe(100);
    expect(shellDamage(b, 40, false)).toBeCloseTo(28, 6); // 30 % less
    expect(shell?.value).toBe(60);
    expect(shellDamage(b, 20, true)).toBeCloseTo(14, 6);
    expect(shell?.value).toBe(20); // the crit wore it by twice its size
    expect(shellDamage(b, 50, false)).toBeCloseTo(35, 6); // the hit that breaks it is still cut
    expect(b.shellBackMs).toBe(BOSS_AFFIX.armored.returnMs);
    expect(shellDamage(b, 50, false)).toBe(50); // broken: the damage as it comes

    const world = fight([hero('tank')], [b]);
    run(world, BOSS_AFFIX.armored.returnMs - 500);
    expect(effect(b, BOSS_AFFIX.armored.effectKey)).toBeUndefined();
    run(world, 600);
    expect(effect(b, BOSS_AFFIX.armored.effectKey)?.value).toBe(100);
  });

  it('a boss without the affix takes its hits whole, and a hero\'s attacks go through the shell in a fight', () => {
    const plain = boss([], { hp: 1000, maxHp: 1000 });
    expect(shellDamage(plain, 40, true)).toBe(40);
    const dealt = (affixes: string[]): number => {
      const b = boss(affixes, { hp: 1e9, maxHp: 1e9, enemyDamage: 0 });
      armBoss(b);
      const world = fight([striker('tank', 100)], [b]);
      return run(world, 5000).filter((e) => e.type === 'damage' && e.targetId === 'boss').reduce((s, e) => s + (e.amount ?? 0), 0);
    };
    expect(dealt(['armored'])).toBeCloseTo(dealt([]) * BOSS_AFFIX.armored.damageTaken, 3);
  });
});

describe('Vampiric (Vampírico)', () => {
  it('heals 3 % of its life with each hit that lands unblocked', () => {
    const healed = (): number => {
      const b = boss(['vampiric'], { hp: 5e5, maxHp: 1e6 });
      const world = fight([hero('tank')], [b]);
      const events = run(world, 1000);
      expect(events.filter((e) => e.type === 'damage' && e.targetId === 'tank')).toHaveLength(1);
      expect(events.filter((e) => e.type === 'heal' && e.targetId === 'boss')).toHaveLength(1);
      return b.hp - 5e5;
    };
    expect(healed()).toBeCloseTo(1e6 * 0.03, 3);
    expect(BOSS_AFFIX.vampiric.healFrac).toBe(0.03);
  });

  it('is a stage boss\'s alone: a world boss draws from the other six', () => {
    expect(AFFIX_POOL.stage).toEqual(BOSS_AFFIX_KEYS);
    expect(AFFIX_POOL.world).toEqual(BOSS_AFFIX_KEYS.filter((k) => k !== 'vampiric'));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (let w = 1; w <= 10; w++) for (const k of bossAffixes(seed, globalStageOf(4, w, 10), 'world', 4)) seen.add(k);
    }
    expect(seen.has('vampiric')).toBe(false);
    expect(seen.size).toBe(6);
  });

  it('a blocked hit feeds it nothing', () => {
    // Block is a steady roll (round 7, sim/steady): a tank with a great deal of it blocks most hits, not every one —
    // the boss heals for the hits that land unblocked, and for those alone.
    const b = boss(['vampiric'], { hp: 5e5, maxHp: 1e6 });
    const tank = hero('tank', { baseStats: base({ health: 1e6, block: 100 }) });
    const world = fight([tank], [b]);
    const events = run(world, 3000, { ...quietRng(), chance: () => true });
    const hits = events.filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.sourceId === b.id);
    expect(hits.some((e) => e.blocked === true)).toBe(true);
    const unblocked = hits.filter((e) => e.blocked !== true).length;
    expect(b.hp).toBeCloseTo(5e5 + unblocked * BOSS_AFFIX.vampiric.healFrac * 1e6, 6);
  });
});

describe('Venomous (Venenoso)', () => {
  it('each hit leaves a stack: 1 % of the hero\'s life per second each, up to five, gone a few seconds after the last hit; it is a harmful effect', () => {
    const def = effectDef(BOSS_AFFIX.venomous.effectKey);
    expect(def.beneficial).toBe(false);
    const b = boss(['venomous']);
    const tank = hero('tank');
    const world = fight([tank], [b]);
    run(world, 1000);
    expect(effect(tank, def.key)?.stacks).toBe(1);
    expect(effect(tank, def.key)?.value).toBeCloseTo(tank.maxHp * 0.01, 6);
    run(world, 9000);
    expect(effect(tank, def.key)?.stacks).toBe(def.maxStacks);
    expect(def.maxStacks).toBe(5);
    // Five stacks tick for 5 % of his life a second.
    b.enemyDamage = 0;
    b.affixes = [];
    const before = tank.hp;
    run(world, 1000);
    expect(before - tank.hp).toBeCloseTo(tank.maxHp * 0.05, 0);
    run(world, def.durationMs);
    expect(effect(tank, def.key)).toBeUndefined();
  });
});

describe('Frenzied (Frenético)', () => {
  it('+5 % attack speed for every 5 s of fight, up to twelve stacks', () => {
    const b = boss(['frenzied'], { enemyDamage: 0 });
    const world = fight([hero('tank')], [b]);
    const speed = (): number => effectStatMods(b.effects).filter((m) => m.key === 'attackSpeed').reduce((s, m) => s + m.value, 0);
    run(world, 4900);
    expect(speed()).toBe(0);
    run(world, 200);
    expect(speed()).toBe(5);
    run(world, 10_000);
    expect(speed()).toBe(15);
    run(world, 120_000);
    expect(effect(b, BOSS_AFFIX.frenzied.effectKey)?.stacks).toBe(BOSS_AFFIX.frenzied.maxStacks);
    expect(speed()).toBe(60);
    // It swings that much faster.
    const swings = run(world, 20_000).filter((e) => e.type === 'damage' && e.targetId === 'tank').length;
    expect(swings).toBeGreaterThan(27); // 20 a plain boss would land in that time (ticks round each swing up)
  });
});

describe('Deadeye (Certero) and Mortal Wound', () => {
  it('every 8 s a shot lands on the hero with the least armour, wherever it stands', () => {
    const def = abilityDef(BOSS_AFFIX.deadeye.abilityKey);
    expect(def.cooldownMs).toBe(8000);
    const b = boss(['deadeye'], { enemyDamage: 100, enemyAttackSpeed: 0.05, attackTimerMs: 1e9, abilities: [{ def, rank: 1 }] });
    const tank = hero('tank', { baseStats: base({ health: 1e6, armor: 500 }) });
    const archer = hero('archer', { baseStats: base({ health: 1e6, armor: 120 }) });
    const healer = hero('healer', { baseStats: base({ health: 1e6, armor: 40 }) });
    const world = fight([tank, archer, healer], [b]);
    const shots = run(world, 30_000).filter((e) => e.type === 'damage' && e.abilityKey === def.key);
    expect(shots.length).toBeGreaterThanOrEqual(3);
    expect(shots.every((e) => e.targetId === 'healer')).toBe(true);
    healer.alive = false;
    const next = run(world, 10_000).filter((e) => e.type === 'damage' && e.abilityKey === def.key);
    expect(next.length).toBeGreaterThan(0);
    expect(next.every((e) => e.targetId === 'archer')).toBe(true);
  });

  it('Mortal Wound is the affix now: its blow leaves the healing cut on the tank, a harmful effect', () => {
    const def = abilityDef(BOSS_AFFIX.mortalWound.abilityKey);
    expect(def.applies.map((a) => a.effectKey)).toContain('debuff_mortal_wound');
    expect(effectDef('debuff_mortal_wound').beneficial).toBe(false);
  });

  it('Mortal Wound lands for 150 % of its hit from a stage boss and 250 % from a world boss', () => {
    const coeff = (rank: 'stage' | 'world'): number | undefined => {
      for (let seed = 1; seed < 400; seed++) {
        const S = globalStageOf(4, 1 + (seed % 10), rank === 'world' ? 10 : 5);
        const wound = bossKit(seed, S, rank).abilities.find((a) => a.def.key === BOSS_AFFIX.mortalWound.abilityKey);
        if (wound !== undefined) return wound.def.power?.coeff;
      }
      return undefined;
    };
    expect(coeff('stage')).toBe(1.5);
    expect(coeff('world')).toBe(2.5);
  });
});

describe('Seismic (Sísmico)', () => {
  it('from the moment the fight is joined the boss carries the marker the strip shakes the ground by; it changes nothing else', () => {
    const b = boss(['seismic'], { x: 900, range: 60, moveSpeed: 100 });
    const tank = hero('tank');
    const world = fight([tank], [b]);
    resolveCombatTick(world, TICK, quietRng());
    expect(effect(b, BOSS_AFFIX.seismic.effectKey)).toBeUndefined(); // still walking up
    run(world, 12_000);
    expect(b.engaged).toBe(true);
    expect(effect(b, BOSS_AFFIX.seismic.effectKey)).toBeDefined();
    expect(effectDef(BOSS_AFFIX.seismic.effectKey).kind.type).toBe('tag');
    expect(effectStatMods(b.effects)).toEqual([]);
    const plain = boss([]);
    run(fight([hero('tank')], [plain]), 3000);
    expect(plain.effects).toEqual([]);
  });
});

describe('the Flock (the Crowmother)', () => {
  const flockBoss = (d: number, over: Partial<Combatant> = {}): Combatant =>
    boss([], { bossRank: 'world', mechanic: 'flock', enemyDamage: 0, x: 300, range: 400, abilities: [{ def: mechanicAbility(abilityDef('boss_flock'), 'flock', d), rank: 1 }], ...over });
  const crows = (w: WorldState): Combatant[] => w.enemies.filter((e) => e.summon !== undefined && e.alive);
  const untilCrows = (w: WorldState): void => {
    for (let t = 0; t < 20_000 && crows(w).length === 0; t += TICK) resolveCombatTick(w, TICK, quietRng());
  };

  it('she looses her crows after the cast; they fly behind the front hero and peck only the back line', () => {
    const world = fight(column(hero('tank'), hero('archer'), hero('healer')), [flockBoss(0)]);
    const early = run(world, MECHANIC.flock.openerMs + MECHANIC.flock.castMs - 300);
    expect(crows(world)).toHaveLength(0);
    expect(early.some((e) => e.type === 'cast')).toBe(false);
    const events = run(world, 600);
    expect(events.some((e) => e.type === 'cast' && e.abilityKey === 'boss_flock')).toBe(true);
    expect(crows(world)).toHaveLength(2); // Normal
    const tank = world.heroes[0] as Combatant;
    const pecks = run(world, 6000, makeRng(4)).filter((e) => e.type === 'damage' && e.sourceId?.includes('_crow_') === true);
    expect(pecks.length).toBeGreaterThan(3);
    expect(pecks.every((e) => e.targetId !== 'tank')).toBe(true);
    for (const c of crows(world)) expect(c.x).toBeLessThan(tank.x);
  });

  it('more crows from Hell on, and harder pecks', () => {
    for (const [d, n] of [[1, 3], [4, 4]] as const) {
      const world = fight(column(hero('tank'), hero('archer')), [flockBoss(d)]);
      untilCrows(world);
      expect(crows(world)).toHaveLength(n);
    }
    const peck = (d: number): number => {
      const world = fight(column(hero('tank'), hero('archer')), [flockBoss(d)], 20);
      untilCrows(world);
      return crows(world)[0]?.enemyDamage ?? 0;
    };
    expect(peck(4)).toBeGreaterThan(peck(0));
  });

  it('they leave on their own after 8 s — no kill, no reward — and she sends more 15 s after the first', () => {
    const world = fight(column(hero('tank'), hero('archer')), [flockBoss(0)]);
    untilCrows(world);
    const first = crows(world).map((c) => c.id);
    const events = run(world, SUMMONS.crow?.lifeMs ?? 0);
    expect(crows(world)).toHaveLength(0);
    expect(events.filter((e) => e.type === 'death' && first.includes(e.targetId))).toHaveLength(2);
    run(world, MECHANIC.flock.everyMs - (SUMMONS.crow?.lifeMs ?? 0));
    const second = crows(world).map((c) => c.id);
    expect(second).toHaveLength(2);
    expect(second.some((id) => first.includes(id))).toBe(false);
  });

  it('the heroes behind shoot them down; the front hero cannot reach them', () => {
    // The tank could reach them by range alone (400): they are behind his back.
    const alone = fight(column(striker('tank', 1e6, { range: 400 }), hero('archer', { range: 200 }), hero('healer', { range: 200 })), [flockBoss(0, { hp: 1e12, maxHp: 1e12 })]);
    untilCrows(alone);
    const ids = crows(alone).map((c) => c.id);
    const hitsOnCrows = run(alone, 5000).filter((e) => e.type === 'damage' && ids.includes(e.targetId));
    expect(hitsOnCrows).toHaveLength(0); // only the tank could hurt anything, and they are behind his back
    expect(crows(alone)).toHaveLength(2);

    const shot = fight(column(hero('tank', { range: 60 }), striker('archer', 1e6, { range: 200 }), hero('healer', { range: 200 })), [flockBoss(0, { hp: 1e12, maxHp: 1e12 })]);
    untilCrows(shot);
    run(shot, 3000);
    expect(crows(shot)).toHaveLength(0);
  });

  it('when she falls her crows go with her, and none of them counts as a kill', () => {
    const world = createWorld(3, [striker('tank', 1, { range: 50 }), hero('archer', { range: 160 })]);
    world.globalStageIndex = 9;
    world.maxClearedStage = 9;
    const sim = new Simulation(world);
    expect(sim.enterZoneBoss()).toBe(true);
    const ctx: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: [] };
    const w = sim.world;
    for (let t = 0; t < 600 && crows(w).length === 0; t++) sim.tick(ctx);
    const b = w.enemies.find((e) => e.isBoss === true);
    expect(b?.mechanic).toBe('flock');
    expect(crows(w)).toHaveLength(2);
    const before = { ...w.pending };
    if (b !== undefined) b.hp = 0.5; // the tank's next hit fells her
    let deaths = 0;
    for (let t = 0; t < 100 && b?.alive === true; t++) deaths += sim.tick(ctx).filter((e) => e.type === 'death').length;
    expect(b?.alive).toBe(false);
    expect(deaths).toBe(3); // her and her two crows
    expect(w.pending.kills).toBe(before.kills);
    expect(w.pending.bossKills).toBe(before.bossKills + 1);
  });
});

describe('Roots (Our Lady of Mistletoe)', () => {
  it('binds the hero who has hurt her most: he neither attacks nor casts for 5 s, then goes back to it', () => {
    const def = mechanicAbility(abilityDef('boss_roots'), 'roots', 1);
    const b = boss([], { bossRank: 'world', mechanic: 'roots', hp: 1e12, maxHp: 1e12, enemyDamage: 0, abilities: [{ def, rank: 1 }] });
    const tank = striker('tank', 10, { range: 400 });
    const archer = striker('archer', 100, { range: 400 });
    const world = fight([tank, archer], [b]);
    const until = MECHANIC.roots.openerMs + MECHANIC.roots.castMs;
    run(world, until - 200);
    expect(archer.dealtToBoss ?? 0).toBeGreaterThan(tank.dealtToBoss ?? 0);
    expect(effect(archer, 'debuff_rooted')).toBeUndefined();
    run(world, 400);
    expect(effect(archer, 'debuff_rooted')).toBeDefined();
    expect(effect(tank, 'debuff_rooted')).toBeUndefined();
    const held = run(world, MECHANIC.roots.holdMs - 600).filter((e) => e.type === 'damage' && e.targetId === 'boss');
    expect(held.length).toBeGreaterThan(2);
    expect(held.every((e) => e.sourceId === 'tank')).toBe(true);
    const after = run(world, 3000).filter((e) => e.type === 'damage' && e.targetId === 'boss' && e.sourceId === 'archer');
    expect(after.length).toBeGreaterThan(0);
    expect(effectDef('debuff_rooted').beneficial).toBe(false);
  });

  it('a heal frees him: what a boss lays on a hero — roots, venom, the mortal wound — is all lifted by the heal on him', () => {
    const archer = hero('archer', { hp: 9e5 });
    for (const key of ['debuff_rooted', 'debuff_venom', 'debuff_mortal_wound']) applyEffect(archer.effects, effectDef(key), 'boss', 1);
    const priest = hero('healer', { classKey: 'priest', abilities: [{ def: abilityDef('priest_healing_light'), rank: 1 }] });
    const cast = castReadyAbilities(priest, [archer, priest], [boss([])], 20, quietRng(), []);
    expect(cast).toEqual(['priest_healing_light']);
    expect(archer.effects.filter((e) => !effectDef(e.defKey).beneficial)).toEqual([]);
  });
});

describe('Chain bolt (the Drowned Moon)', () => {
  it('falls on one hero and jumps to the others for a share, against magic resistance', () => {
    const def = mechanicAbility(abilityDef('boss_chain_bolt'), 'chainBolt', 1);
    expect(def.magic).toBe(true);
    const cast = (mr: number): CombatEvent[] => {
      const b = boss([], { bossRank: 'world', mechanic: 'chainBolt', enemyDamage: 1000, enemyAttackSpeed: 0.05, attackTimerMs: 1e9, enemyMagic: false, abilities: [{ def, rank: 1 }] });
      const stats = base({ health: 1e6, armor: 0, magicResist: mr });
      const world = fight([hero('tank', { baseStats: stats }), hero('archer', { baseStats: stats }), hero('healer', { baseStats: stats })], [b]);
      return run(world, MECHANIC.chainBolt.openerMs + MECHANIC.chainBolt.castMs + 200).filter((e) => e.type === 'damage' && e.abilityKey === 'boss_chain_bolt');
    };
    const bare = cast(0);
    expect(bare).toHaveLength(3);
    const main = bare.filter((e) => e.splash !== true);
    const jumps = bare.filter((e) => e.splash === true);
    expect(main).toHaveLength(1);
    expect(jumps).toHaveLength(2);
    expect(main[0]?.amount).toBeCloseTo(1000 * 1.0, 3); // Hell: the boss's hit
    expect(jumps[0]?.amount).toBeCloseTo(1000 * 0.5, 3);
    expect(new Set(bare.map((e) => e.targetId)).size).toBe(3);
    const warded = cast(5000);
    expect(warded[0]?.amount ?? 0).toBeLessThan(main[0]?.amount ?? 0);
  });

  it('who it falls on is the rng\'s pick', () => {
    const def = mechanicAbility(abilityDef('boss_chain_bolt'), 'chainBolt', 0);
    const first = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const b = boss([], { enemyDamage: 100, enemyAttackSpeed: 0.05, attackTimerMs: 1e9, abilities: [{ def, rank: 1 }] });
      const world = fight([hero('tank'), hero('archer'), hero('healer')], [b]);
      const hit = run(world, 9000, makeRng(seed)).find((e) => e.type === 'damage' && e.abilityKey === 'boss_chain_bolt' && e.splash !== true);
      if (hit !== undefined) first.add(hit.targetId);
    }
    expect(first.size).toBe(3);
  });
});

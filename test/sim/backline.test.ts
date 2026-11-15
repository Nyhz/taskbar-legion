import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities, resolveChanneledCast } from '@/sim/abilities';
import { spawnStageBoss, spawnZoneBoss } from '@/sim/stages';
import { buildHeroCombatant, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { makeRng } from '@/sim/rng';
import { abilityDef, stageBossAbilityKeys, worldBossAbilityKeys, WHOLE_PARTY } from '@/data/abilities';
import { ARCHER_BACK_SHOT_CHANCE, ENEMY_KINDS } from '@/data/enemies';
import { STAGE_ENRAGE_MS, enrageMultiplier } from '@/data/stageScaling';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { base, quietRng, unit } from './_kit';

// The back line takes damage (docs/DIFFICULTY.md §5b, user decision 2026-11-15): shooters aim behind the front
// hero some of the time, and area blows (the brute's Smash, the bosses' telegraphed slam) reach the whole party.
// Each hit is mitigated by its own target.

const TICK = 100;

/** A hero that cannot die or hurt anything much: the tests read who gets hit, not who wins. */
const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1e9, maxHp: 1e9, baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1 }), ...over });

/** An enemy standing in reach of the front hero, swinging once a second for 100. */
const foe = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'enemy', hp: 1e12, maxHp: 1e12, x: 20, range: 400, enemyDamage: 100, enemyAttackSpeed: 1, ...over });

/** A fight already joined: the heroes in their column, the enemies where they were put. */
function fight(heroes: Combatant[], enemies: Combatant[], stage = 20): WorldState {
  const world = createWorld(7, heroes);
  world.globalStageIndex = stage;
  world.enemies = enemies;
  world.phase = 'fighting';
  return world;
}

/** Run `ticks` ticks and return every hit an enemy landed on a hero. */
function hits(world: WorldState, ticks: number, seed = 3): CombatEvent[] {
  const rng = makeRng(seed);
  const ids = new Set(world.heroes.map((h) => h.id));
  const out: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    for (const ev of resolveCombatTick(world, TICK, rng)) if (ev.type === 'damage' && ids.has(ev.targetId) && ev.tick !== true) out.push(ev);
  }
  return out;
}

const share = (events: readonly CombatEvent[], id: string): number => events.filter((e) => e.targetId === id).length / Math.max(1, events.length);

describe('basic attacks', () => {
  it('a melee enemy only ever hits the front hero', () => {
    const world = fight([hero('tank'), hero('archer'), hero('healer')], [foe('grunt', { range: 35 })]);
    const landed = hits(world, 600);
    expect(landed.length).toBeGreaterThan(40);
    expect(landed.every((e) => e.targetId === 'tank')).toBe(true);
  });

  it('a shooter sends its share of shots over the front hero, to the heroes behind in turn', () => {
    const chance = ENEMY_KINDS.find((k) => k.key === 'archer')?.backShotChance ?? 0;
    expect(chance).toBe(ARCHER_BACK_SHOT_CHANCE);
    expect(ENEMY_KINDS.filter((k) => k.style === 'melee').every((k) => k.backShotChance === 0)).toBe(true);
    const world = fight([hero('tank'), hero('archer'), hero('healer')], [foe('shooter', { backShotChance: chance })]);
    const landed = hits(world, 6000);
    expect(landed.length).toBeGreaterThan(500);
    const behind = 1 - share(landed, 'tank');
    expect(behind).toBeGreaterThan(chance - 0.06);
    expect(behind).toBeLessThan(chance + 0.06);
    // Both heroes behind are aimed at, about as often as each other.
    expect(share(landed, 'archer')).toBeGreaterThan(chance / 2 - 0.05);
    expect(share(landed, 'healer')).toBeGreaterThan(chance / 2 - 0.05);
  });

  it('with nobody behind, every shot is the lone hero\'s — and no target is rolled', () => {
    const solo = fight([hero('tank')], [foe('shooter', { backShotChance: 1 })]);
    expect(hits(solo, 300).every((e) => e.targetId === 'tank')).toBe(true);
    // The same fight draws exactly as many random numbers as one against an enemy that never aims behind.
    const draws = (backShotChance: number): number => {
      const world = fight([hero('tank')], [foe('shooter', { backShotChance })]);
      const rng = quietRng();
      for (let i = 0; i < 300; i++) resolveCombatTick(world, TICK, rng);
      return rng.draws;
    };
    expect(draws(1)).toBe(draws(0));
  });

  it('a fallen hero is not a target: the shots go to whoever still stands', () => {
    const dead = hero('archer', { alive: false, hp: 0 });
    const world = fight([hero('tank'), dead], [foe('shooter', { backShotChance: 1 })]);
    const landed = hits(world, 300);
    expect(landed.length).toBeGreaterThan(20);
    expect(landed.every((e) => e.targetId === 'tank')).toBe(true);
  });

  it('a shot aimed behind is mitigated by the hero it lands on, not by the tank', () => {
    const armoured = hero('tank', { baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1, armor: 1e9 }) });
    const world = fight([armoured, hero('archer')], [foe('shooter', { backShotChance: 1 })]);
    const landed = hits(world, 300);
    expect(landed.length).toBeGreaterThan(20);
    expect(landed.every((e) => e.targetId === 'archer')).toBe(true);
    // The archer has no armour: the full 100 (the tank's wall of armour does nothing for him).
    expect(landed.every((e) => Math.abs((e.amount ?? 0) - 100) < 1e-6)).toBe(true);
  });
});

describe('enemy abilities', () => {
  const cast = (caster: Combatant, heroes: Combatant[], stage = 20): CombatEvent[] => {
    const events: CombatEvent[] = [];
    castReadyAbilities(caster, [caster], heroes, stage, makeRng(5), events);
    return events.filter((e) => e.type === 'damage');
  };

  it('the archer\'s Arcing Shot lands behind the front hero; on him when he stands alone', () => {
    const aimed = abilityDef('enemy_aimed');
    expect(aimed.target).toBe('backEnemy');
    const archer = (): Combatant => foe('shooter', { abilities: [{ def: aimed, rank: 1 }] });
    const party = cast(archer(), [hero('tank'), hero('archer'), hero('healer')]);
    expect(party).toHaveLength(1);
    expect(party[0]?.targetId).not.toBe('tank');
    expect(party[0]?.amount).toBeCloseTo((aimed.power?.coeff ?? 0) * 100, 6);
    const alone = cast(archer(), [hero('tank')]);
    expect(alone.map((e) => e.targetId)).toEqual(['tank']);
    // Out of reach of the front hero it does not fire at all (the reach gate is the front hero's).
    expect(cast(foe('far', { x: 2000, abilities: [{ def: aimed, rank: 1 }] }), [hero('tank'), hero('archer')])).toHaveLength(0);
  });

  it('the brute\'s Smash hits the front hero in full and everyone behind for the splash, each by its own armour', () => {
    const smash = abilityDef('enemy_smash');
    expect(smash.power?.splashRadius).toBe(WHOLE_PARTY);
    const full = (smash.power?.coeff ?? 0) * 100;
    const splash = (smash.power?.splashCoeff ?? 0) * 100;
    expect(splash).toBeGreaterThan(0);
    expect(splash).toBeLessThan(full);
    const brute = foe('brute', { range: 35, abilities: [{ def: smash, rank: 1 }] });
    // The healer stands far behind and wears armour worth half the hit at this stage's scale (found by the sim).
    const healer = hero('healer', { x: -300, baseStats: base({ health: 1e9, armor: 1e9 }) });
    const events = cast(brute, [hero('tank'), hero('archer', { x: -40 }), healer]);
    const on = (id: string): CombatEvent | undefined => events.find((e) => e.targetId === id);
    expect(on('tank')?.amount).toBeCloseTo(full, 6);
    expect(on('tank')?.splash).toBeUndefined();
    expect(on('archer')?.amount).toBeCloseTo(splash, 6);
    expect(on('archer')?.splash).toBe(true); // the strip shows a number, not another swing
    expect(on('healer')?.splash).toBe(true);
    expect(on('healer')?.amount ?? splash).toBeLessThan(splash * 0.5); // her own armour, not the tank's
    // Alone, the splash has nobody to reach.
    expect(cast(foe('brute2', { range: 35, abilities: [{ def: smash, rank: 1 }] }), [hero('tank')])).toHaveLength(1);
  });

  it('a hero protected by Last Stand takes nothing from a splash', () => {
    const smash = abilityDef('enemy_smash');
    const archer = hero('archer', { x: -40 });
    archer.effects.push({ defKey: 'fx_invuln', sourceId: 'x', value: 1, remainingMs: 5000, stacks: 1 });
    const events = cast(foe('brute', { range: 35, abilities: [{ def: smash, rank: 1 }] }), [hero('tank'), archer]);
    expect(events.find((e) => e.targetId === 'archer')?.amount).toBe(0); // shown as "invulnerable", not skipped
    expect(archer.hp).toBe(archer.maxHp);
  });
});

describe('party protection reaches the back line', () => {
  const party = (knightTalents: Record<string, number>): { tank: Combatant; archer: Combatant } => {
    const configs: HeroConfig[] = [
      { id: 'tank', classKey: 'knight', level: 60, equipment: {}, talents: knightTalents },
      { id: 'archer', classKey: 'ranger', level: 60, equipment: {}, talents: {} },
    ];
    const auras = partyAuraMods(configs);
    const [tank, archer] = configs.map((c) => buildHeroCombatant(c, auras));
    if (tank === undefined || archer === undefined) throw new Error('party not built');
    return { tank, archer };
  };
  const splashOnArcher = (knightTalents: Record<string, number>): number => {
    const { tank, archer } = party(knightTalents);
    const events: CombatEvent[] = [];
    castReadyAbilities(foe('brute', { range: 400, abilities: [{ def: abilityDef('enemy_smash'), rank: 1 }] }), [], [tank, archer], 20, makeRng(5), events);
    return events.find((e) => e.targetId === 'archer')?.amount ?? Number.NaN;
  };

  it('the Knight\'s Vanguard (the whole party takes less damage) lowers what lands behind him', () => {
    const bare = splashOnArcher({ knight_guard: 5, knight_debilitate: 5 });
    const guarded = splashOnArcher({ knight_guard: 5, knight_debilitate: 5, knight_vanguard: 5 });
    expect(bare).toBeGreaterThan(0);
    expect(guarded).toBeLessThan(bare);
  });
});

describe('boss area blows', () => {
  it('every stage boss carries the slam; world bosses the shockwave on every difficulty (the rest of a kit is affixes and mechanics: bossKit.test)', () => {
    expect(stageBossAbilityKeys()).toEqual(['boss_slam']);
    expect(worldBossAbilityKeys()).toEqual(['boss_shockwave']);
    for (const key of ['boss_slam', 'boss_shockwave']) {
      const def = abilityDef(key);
      expect(def.castTimeMs ?? 0).toBeGreaterThan(0); // telegraphed: the cast bar fills first
      expect(def.holdsAttack).toBe(true);
      expect(def.power?.splashRadius).toBe(WHOLE_PARTY);
      expect(def.power?.splashCoeff ?? 0).toBeLessThan(def.power?.coeff ?? 0); // reduced behind the front hero
    }
    const stage = fight([hero('tank')], [], 15);
    spawnStageBoss(stage, makeRng(1));
    expect(stage.enemies[0]?.abilities.map((a) => a.def.key)).toEqual(['boss_slam']);
    const wall = fight([hero('tank')], [], 10);
    spawnZoneBoss(wall, makeRng(1));
    expect(wall.enemies[0]?.abilities.map((a) => a.def.key)).toEqual(['boss_flock', 'boss_shockwave']); // world 1: her own mechanic first
  });

  it('the boss winds up (no swings meanwhile), then the blow lands on everyone: full in front, less behind', () => {
    const slam = abilityDef('boss_slam');
    const boss = foe('boss', { range: 60, isBoss: true, enrageMs: STAGE_ENRAGE_MS, fightMs: 0, abilities: [{ def: slam, rank: 1 }], attackTimerMs: 100_000 });
    const world = fight([hero('tank'), hero('archer'), hero('healer')], [boss]);
    const rng = makeRng(9);
    const ids = new Set(world.heroes.map((h) => h.id));
    const landed: { tick: number; ev: CombatEvent }[] = [];
    let channelFrom = -1;
    let channelTo = -1;
    for (let t = 0; t < 400; t++) {
      if (boss.casting !== undefined && channelFrom < 0) {
        channelFrom = t;
        boss.attackTimerMs = 0; // its swing comes up during the windup…
      }
      for (const ev of resolveCombatTick(world, TICK, rng)) if (ev.type === 'damage' && ids.has(ev.targetId)) landed.push({ tick: t, ev });
      if (channelFrom >= 0 && boss.casting === undefined && channelTo < 0) channelTo = t;
      if (channelTo >= 0 && t > channelTo + 2) break;
    }
    expect(channelFrom).toBeGreaterThanOrEqual(0);
    expect(channelTo - channelFrom).toBeGreaterThanOrEqual(Math.floor((slam.castTimeMs ?? 0) / TICK) - 1);
    // …but it holds it: nothing lands before the blow resolves.
    expect(landed.filter((l) => l.tick < channelTo)).toHaveLength(0);
    const blow = landed.filter((l) => l.tick === channelTo && l.ev.abilityKey === 'boss_slam').map((l) => l.ev);
    expect(blow.map((e) => e.targetId).sort()).toEqual(['archer', 'healer', 'tank']);
    const on = (id: string): number => blow.find((e) => e.targetId === id)?.amount ?? Number.NaN;
    expect(on('tank')).toBeCloseTo((slam.power?.coeff ?? 0) * 100, 6);
    expect(on('archer')).toBeCloseTo((slam.power?.splashCoeff ?? 0) * 100, 6);
    expect(on('healer')).toBeCloseTo((slam.power?.splashCoeff ?? 0) * 100, 6);
    // The held swing comes as soon as the blow has landed.
    expect(landed.some((l) => l.tick >= channelTo && l.ev.abilityKey === undefined && l.ev.targetId === 'tank')).toBe(true);
  });

  it('once enraged, the blow carries the enrage on the front hero only', () => {
    const slam = abilityDef('boss_slam');
    const fightMs = STAGE_ENRAGE_MS + 10_000;
    const enraged = enrageMultiplier(fightMs, STAGE_ENRAGE_MS);
    expect(enraged).toBeGreaterThan(1);
    const boss = foe('boss', { range: 60, isBoss: true, enrageMs: STAGE_ENRAGE_MS, fightMs, abilities: [{ def: slam, rank: 1 }] });
    boss.casting = { key: 'boss_slam', remainingMs: 0, totalMs: slam.castTimeMs ?? 0 };
    const events: CombatEvent[] = [];
    resolveChanneledCast(boss, [boss], [hero('tank'), hero('archer')], 20, makeRng(2), events);
    const on = (id: string): number => events.find((e) => e.targetId === id)?.amount ?? Number.NaN;
    expect(on('tank')).toBeCloseTo((slam.power?.coeff ?? 0) * 100 * enraged, 4);
    expect(on('archer')).toBeCloseTo((slam.power?.splashCoeff ?? 0) * 100, 6);
  });

  it('a boss facing one hero just hits that hero', () => {
    const slam = abilityDef('boss_slam');
    const boss = foe('boss', { range: 60, isBoss: true, abilities: [{ def: slam, rank: 1 }] });
    boss.casting = { key: 'boss_slam', remainingMs: 0, totalMs: slam.castTimeMs ?? 0 };
    const events: CombatEvent[] = [];
    resolveChanneledCast(boss, [boss], [hero('tank')], 20, makeRng(2), events);
    expect(events.filter((e) => e.type === 'damage').map((e) => e.targetId)).toEqual(['tank']);
  });
});

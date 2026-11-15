import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities, isHarmed } from '@/sim/abilities';
import { liveStats } from '@/sim/liveStats';
import { spawnWave } from '@/sim/stages';
import { makeRng } from '@/sim/rng';
import { abilityDef } from '@/data/abilities';
import { applyEffect } from '@/sim/effects';
import { effectDef } from '@/data/effects';
import {
  ENEMY_KINDS, ROLE_TRAITS, SUPPORT_AURA_COUNT, SUPPORT_AURA_KEYS, SUPPORT_KIND, SUPPORT_MIN_STAGE, SUPPORT_WAVE_CHANCE, TRAIT_TUNING,
  auraValue, supportAuras, traitsOf, type EnemyRole,
} from '@/data/enemies';
import { attackHastePct, focusedHero, foeDamageMult, foeWard, isEnraged, refreshAuras, tickFoeTraits } from '@/sim/enemyTraits';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { anyMoment, base, effect, quietRng, unit } from './_kit';

// The wave enemies' traits by difficulty and the support's auras (docs/redesign/PROGRESS.md «Enemigos», agreed
// 2026-11-15): data in data/enemies.ts, what they do in sim/enemyTraits.ts.

const TICK = 100;
const HELL = 101;
const INFERNO = 201;
const ETERNAL = 301;
const TORMENT = 401;

const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1e9, maxHp: 1e9, baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1 }), ...over });

const foe = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'enemy', hp: 1e12, maxHp: 1e12, x: 20, range: 400, enemyDamage: 100, enemyAttackSpeed: 1, ...over });

function fight(heroes: Combatant[], enemies: Combatant[], stage: number): WorldState {
  const world = createWorld(7, heroes);
  world.globalStageIndex = stage;
  world.enemies = enemies;
  world.phase = 'fighting';
  return world;
}

function run(world: WorldState, ticks: number, seed = 3): CombatEvent[] {
  const rng = makeRng(seed);
  const out: CombatEvent[] = [];
  for (let i = 0; i < ticks; i++) out.push(...resolveCombatTick(world, TICK, rng));
  return out;
}

const hitsOn = (events: readonly CombatEvent[], heroes: readonly Combatant[]): CombatEvent[] => {
  const ids = new Set(heroes.map((h) => h.id));
  return events.filter((e) => e.type === 'damage' && ids.has(e.targetId) && e.tick !== true);
};

describe('the four kinds', () => {
  it('a wave rolls a beast, a soldier, a shooter and a brute — each its own behaviour — and never a support', () => {
    const roles = ENEMY_KINDS.map((k) => k.role).sort();
    expect(roles).toEqual(['beast', 'brute', 'shooter', 'soldier']);
    const of = (role: EnemyRole) => ENEMY_KINDS.find((k) => k.role === role)!;
    // The beast: faster on its feet and with its teeth, and more fragile, than the soldier.
    expect(of('beast').moveSpeed).toBeGreaterThan(of('soldier').moveSpeed);
    expect(of('beast').attackSpeedMult).toBeGreaterThan(1);
    expect(of('beast').hpMult).toBeLessThan(of('soldier').hpMult);
    // The brute: slower, tougher, with an area blow. The shooter: from afar, over the tank.
    expect(of('brute').moveSpeed).toBeLessThan(of('soldier').moveSpeed);
    expect(of('brute').hpMult).toBeGreaterThan(of('soldier').hpMult);
    expect(of('brute').abilities).toEqual(['enemy_smash']);
    expect(of('shooter').backShotChance).toBeGreaterThan(0);
  });

  it('every enemy of a wave carries its kind and that kind\'s traits', () => {
    const world = createWorld(11, [hero('k')]);
    world.globalStageIndex = INFERNO + 30;
    spawnWave(world, makeRng(5));
    expect(world.waveQueue.length).toBeGreaterThan(3);
    for (const { combatant: c } of world.waveQueue) {
      expect(c.enemyRole).toBeDefined();
      expect(c.traits).toEqual(traitsOf(c.enemyRole!, 2));
      expect(c.guardUp).toBe(c.enemyRole === 'soldier' ? true : undefined);
    }
  });
});

describe('traits by difficulty', () => {
  it('accumulate: nothing in Normal, and a kind keeps what it had as it gains more', () => {
    for (const role of Object.keys(ROLE_TRAITS) as EnemyRole[]) {
      expect(traitsOf(role, 0)).toEqual([]);
      for (let d = 1; d <= 4; d++) expect(traitsOf(role, d)).toEqual(expect.arrayContaining(traitsOf(role, d - 1)));
    }
    expect(traitsOf('beast', 1)).toEqual(['rage']);
    expect(traitsOf('beast', 2)).toEqual(['rage', 'charge']);
    expect(traitsOf('beast', 4)).toEqual(['rage', 'charge']);
    expect(traitsOf('soldier', 1)).toEqual(['guard']);
    expect(traitsOf('soldier', 2)).toEqual(['guard', 'lastBreath']);
    expect(traitsOf('shooter', 1)).toEqual([]);
    expect(traitsOf('shooter', 2)).toEqual(['chargedShot']);
    expect(traitsOf('shooter', 3)).toEqual(['chargedShot', 'focusFire']);
    expect(traitsOf('shooter', 4)).toEqual(['chargedShot', 'focusFire']);
    expect(traitsOf('brute', 2)).toEqual(['unstoppable']);
    expect(traitsOf('brute', 4)).toEqual(['unstoppable', 'tremor']);
  });

  it('Rabia: a beast under half its life attacks faster', () => {
    const beast = foe('b', { traits: ['rage'], hp: 1000, maxHp: 1000 });
    expect(isEnraged(beast)).toBe(false);
    expect(attackHastePct(beast)).toBe(0);
    beast.hp = 499;
    expect(isEnraged(beast)).toBe(true);
    expect(attackHastePct(beast)).toBe(TRAIT_TUNING.rage.attackSpeedPct);
    // …and it shows in the fight: more swings in the same time.
    const swings = (hp: number): number => {
      const tank = hero('t');
      const world = fight([tank], [foe('b', { traits: ['rage'], hp, maxHp: 1e12, range: 400 })], HELL);
      return hitsOn(run(world, 300), [tank]).length;
    };
    expect(swings(1e11)).toBeGreaterThan(swings(1e12) * 1.2);
  });

  it('Embestida: from Inferno the first blow of each beast hits twice as hard, and only the first', () => {
    const tank = hero('t');
    const beast = foe('b', { traits: ['rage', 'charge'], enemyRole: 'beast', chargeUp: true });
    const plain = foe('p', { enemyRole: 'beast' });
    const landed = hitsOn(run(fight([tank], [beast, plain], INFERNO), 60), [tank]);
    const of = (id: string): CombatEvent[] => landed.filter((e) => e.sourceId === id);
    expect(of('b').length).toBeGreaterThanOrEqual(3);
    expect(of('b')[0]?.amount).toBeCloseTo((of('p')[0]?.amount ?? 0) * TRAIT_TUNING.charge.mult, 6);
    expect(of('b')[0]?.charged).toBe(true);
    expect(of('b')[1]?.amount).toBeCloseTo(of('p')[0]?.amount ?? 0, 6);
    expect(of('b').slice(1).every((e) => e.charged !== true)).toBe(true);
    expect(beast.chargeUp).toBe(false);
    // A beast is given its charge when it spawns from Inferno on, not before.
    const charging = (stage: number): boolean[] => {
      const world = createWorld(3, [hero('k')]);
      world.globalStageIndex = stage;
      const out: boolean[] = [];
      for (let wave = 0; wave < 10; wave++) {
        world.wavesThisStage = wave;
        spawnWave(world, makeRng(wave + 1));
        for (const { combatant: c } of world.waveQueue) if (c.enemyRole === 'beast') out.push(c.chargeUp === true);
      }
      return out;
    };
    expect(charging(HELL + 20).length).toBeGreaterThan(0);
    expect(charging(HELL + 20).every((v) => !v)).toBe(true);
    expect(charging(INFERNO + 20).every((v) => v)).toBe(true);
    expect(charging(TORMENT + 20).every((v) => v)).toBe(true);
  });

  it('Guardia: a soldier parries the first direct hit whole — not a bleed — and only the first', () => {
    const soldier = foe('s', { guardUp: true, traits: ['guard'] });
    const events: CombatEvent[] = [];
    expect(foeWard(soldier, 50, false, events)).toBe(50); // damage over time is not a hit
    expect(soldier.guardUp).toBe(true);
    expect(foeWard(soldier, 300, true, events)).toBe(0);
    expect(events).toEqual([{ type: 'cue', targetId: 's', cue: 'guard' }]);
    expect(foeWard(soldier, 300, true, events)).toBe(300);
    expect(events).toHaveLength(1);
  });

  it('Guardia holds against a basic attack and against an ability alike', () => {
    const knight = unit({ id: 'k', side: 'hero', x: 0, range: 60, baseStats: base({ health: 1e6, attackDamage: 100, attackSpeed: 2, critChance: 0 }), hp: 1e6, maxHp: 1e6 });
    const soldier = foe('s', { guardUp: true, traits: ['guard'], hp: 1000, maxHp: 1000, x: 50, range: 55, enemyDamage: 0 });
    const world = fight([knight], [soldier], HELL);
    const events = run(world, 12);
    const onFoe = events.filter((e) => e.type === 'damage' && e.targetId === 's');
    expect(onFoe[0]?.amount).toBe(0);
    expect(onFoe[1]?.amount).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === 'cue' && e.cue === 'guard')).toHaveLength(1);

    const ranger = unit({ id: 'r', side: 'hero', range: 200, baseStats: base({ attackDamage: 100, critChance: 0 }), abilities: [{ def: anyMoment(abilityDef('ranger_focus')), rank: 1 }] });
    const guarded = foe('g', { guardUp: true, hp: 1000, maxHp: 1000, x: 10 });
    const open = foe('o', { hp: 1000, maxHp: 1000, x: 30 });
    castReadyAbilities(ranger, [ranger], [guarded, open], HELL, quietRng(), []);
    expect(guarded.hp).toBe(1000);
    expect(open.hp).toBeLessThan(1000);
  });

  it('Último aliento: a soldier\'s death rouses the rest of its wave for a moment', () => {
    const knight = unit({ id: 'k', side: 'hero', x: 0, range: 60, baseStats: base({ health: 1e9, attackDamage: 5000, attackSpeed: 2, critChance: 0 }), hp: 1e9, maxHp: 1e9 });
    const dying = foe('s', { traits: ['guard', 'lastBreath'], enemyRole: 'soldier', hp: 10, maxHp: 10, x: 50, range: 55 });
    const mate = foe('m', { enemyRole: 'beast', x: 52, range: 55 });
    const world = fight([knight], [dying, mate], INFERNO);
    const events = run(world, 10);
    expect(dying.alive).toBe(false);
    expect(events.some((e) => e.type === 'cue' && e.cue === 'lastBreath' && e.targetId === 's')).toBe(true);
    expect(mate.rousedMs).toBeGreaterThan(0);
    expect(attackHastePct(mate)).toBe(TRAIT_TUNING.lastBreath.attackSpeedPct);
    run(world, TRAIT_TUNING.lastBreath.ms / TICK + 2);
    expect(attackHastePct(mate)).toBe(0);
  });

  it('Tiro cargado: one basic shot in four hits twice as hard and is told apart', () => {
    const tank = hero('t');
    const shooter = foe('a', { traits: ['chargedShot'], enemyRole: 'shooter' });
    const world = fight([tank], [shooter], INFERNO);
    const landed = hitsOn(run(world, 200), [tank]);
    expect(landed.length).toBeGreaterThanOrEqual(12);
    landed.forEach((hit, i) => {
      const fourth = (i + 1) % TRAIT_TUNING.chargedShot.every === 0;
      expect(hit.charged === true).toBe(fourth);
      expect(hit.amount).toBeCloseTo((landed[0]?.amount ?? 0) * (fourth ? TRAIT_TUNING.chargedShot.mult : 1), 5);
    });
  });

  it('Fuego concentrado: every shot lofted over the tank lands on the same hero', () => {
    const party = [hero('tank'), hero('archer', { x: -40 }), hero('healer', { x: -80 })];
    const shooters = ['a', 'b', 'c'].map((id) => foe(id, { traits: ['chargedShot', 'focusFire'], enemyRole: 'shooter', backShotChance: 0.25, engaged: true }));
    const world = fight(party, shooters, ETERNAL);
    const marked = focusedHero(world);
    expect(marked).toBeDefined();
    expect(marked?.id).not.toBe('tank');
    const landed = hitsOn(run(world, 1500), party);
    const behind = landed.filter((e) => e.targetId !== 'tank');
    expect(behind.length).toBeGreaterThan(50);
    expect(new Set(behind.map((e) => e.targetId))).toEqual(new Set([marked?.id]));
    // …and more of them go over than a plain shooter's.
    expect(behind.length / landed.length).toBeCloseTo(TRAIT_TUNING.focusFire.backShotChance, 1);
    // With no focusing shooter alive there is nobody marked.
    for (const s of shooters) s.alive = false;
    expect(focusedHero(world)).toBeUndefined();
  });

  it('Imparable: a slow does nothing to a brute that has it', () => {
    const slow = effectDef('debuff_cripple');
    const swings = (traits: string[]): number => {
      const tank = hero('t');
      const brute = foe('b', { traits, enemyRole: 'brute' });
      applyEffect(brute.effects, slow, 'x', -20, 1e9);
      return hitsOn(run(fight([tank], [brute], INFERNO), 600), [tank]).length;
    };
    expect(swings(['unstoppable'])).toBeGreaterThan(swings([]) * 1.15);
  });

  it('Temblor: from Eternal the brute\'s blow is the one that shakes the heroes it reaches', () => {
    const blowAt = (stage: number): string[] => {
      const world = createWorld(3, [hero('k')]);
      world.globalStageIndex = stage;
      const keys = new Set<string>();
      for (let wave = 0; wave < 12; wave++) {
        world.wavesThisStage = wave;
        spawnWave(world, makeRng(wave + 1));
        for (const { combatant: c } of world.waveQueue) if (c.enemyRole === 'brute') for (const a of c.abilities) keys.add(a.def.key);
      }
      return [...keys];
    };
    expect(blowAt(INFERNO + 20)).toEqual(['enemy_smash']);
    expect(blowAt(ETERNAL + 20)).toEqual(['enemy_smash_tremor']);
    expect(blowAt(TORMENT + 20)).toEqual(['enemy_smash_tremor']);

    // The blow lays Temblor on the front hero and — riding the splash — on everyone behind: a visible effect
    // (a chip on the hero) that slows his attacks for a moment.
    const tremor = abilityDef('enemy_smash_tremor');
    const slow = effectDef(TRAIT_TUNING.tremor.effect);
    expect(slow.kind).toEqual({ type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: -20 });
    const party = [hero('tank', { baseStats: base({ health: 1e9, attackSpeed: 1 }) }), hero('archer', { x: -40, baseStats: base({ health: 1e9, attackSpeed: 1 }) })];
    const before = party.map((h) => liveStats(h).attackSpeed);
    const brute = foe('b', { abilities: [{ def: tremor, rank: 1 }] });
    castReadyAbilities(brute, [brute], party, ETERNAL, quietRng(), []);
    party.forEach((h, i) => {
      expect(effect(h, slow.key)?.remainingMs).toBe(slow.durationMs);
      expect(liveStats(h).attackSpeed).toBeCloseTo((before[i] ?? 0) * 0.8, 6);
    });
    // It wears off by itself.
    const world = fight(party, [foe('far', { x: 5000, range: 10, enemyDamage: 0 })], ETERNAL);
    run(world, slow.durationMs / TICK + 1);
    for (const h of party) expect(effect(h, slow.key)).toBeUndefined();
  });

  it('Temblor shows on the hero, and Purify leaves it alone: it neither casts for it, nor picks its bearer, nor removes it', () => {
    const slow = effectDef(TRAIT_TUNING.tremor.effect);
    expect(slow.beneficial).toBe(false); // a debuff: the strip shows its chip
    expect(slow.cleanseIgnores).toBe(true);
    const shakenHero = (id: string): Combatant => {
      const h = unit({ id, side: 'hero' });
      applyEffect(h.effects, slow, 'b', -20);
      return h;
    };
    const priestWith = (): Combatant => unit({ id: 'p', side: 'hero', classKey: 'priest', range: 200, abilities: [{ def: abilityDef('priest_purify'), rank: 1 }] });
    // Only Temblor in the party: nobody is "harmed", Purify stays ready.
    const shaken = shakenHero('k');
    expect(isHarmed(shaken)).toBe(false);
    const priest = priestWith();
    expect(castReadyAbilities(priest, [priest, shaken], [foe('e')], ETERNAL, quietRng(), [])).toEqual([]);
    expect(priest.cooldowns['priest_purify'] ?? 0).toBe(0);
    // Someone else carries a real debuff: Purify goes to THAT hero, and Temblor stays where it is.
    const wounded = unit({ id: 'r', side: 'hero' });
    applyEffect(wounded.effects, effectDef('debuff_mortal_wound'), 'b', 25);
    applyEffect(wounded.effects, slow, 'b', -20);
    const again = priestWith();
    expect(castReadyAbilities(again, [again, shaken, wounded], [foe('e')], ETERNAL, quietRng(), [])).toEqual(['priest_purify']);
    expect(effect(wounded, 'debuff_mortal_wound')).toBeUndefined();
    expect(effect(wounded, slow.key)).toBeDefined(); // not removed either
    expect(effect(shaken, slow.key)).toBeDefined();
  });
});

describe('the support', () => {
  it('about one wave in three brings one — from world 3 of Normal — and which is a fact of the run, the stage and the wave', () => {
    let with1 = 0;
    const waves = 3000;
    for (let i = 0; i < waves; i++) if (supportAuras(99, 40 + (i % 50), i, 0) !== undefined) with1 += 1;
    expect(with1 / waves).toBeGreaterThan(SUPPORT_WAVE_CHANCE - 0.04);
    expect(with1 / waves).toBeLessThan(SUPPORT_WAVE_CHANCE + 0.04);
    for (let wave = 0; wave < 200; wave++) expect(supportAuras(99, SUPPORT_MIN_STAGE - 1, wave, 0)).toBeUndefined();
    expect(supportAuras(5, 77, 3, 0)).toEqual(supportAuras(5, 77, 3, 0));
  });

  it('its auras stack with the difficulty: one in Normal … five in Torment, all different', () => {
    for (let d = 0; d < 5; d++) {
      let seen = 0;
      for (let wave = 0; wave < 60; wave++) {
        const auras = supportAuras(1234, d * 100 + 55, wave, d);
        if (auras === undefined) continue;
        seen += 1;
        expect(auras).toHaveLength(SUPPORT_AURA_COUNT[d] ?? 0);
        expect(new Set(auras).size).toBe(auras.length);
        for (const a of auras) expect(SUPPORT_AURA_KEYS).toContain(a);
      }
      expect(seen).toBeGreaterThan(5);
    }
    expect(SUPPORT_AURA_KEYS.length).toBeGreaterThanOrEqual(5);
    // In Normal every aura turns up sooner or later.
    const normal = new Set<string>();
    for (let wave = 0; wave < 400; wave++) for (const a of supportAuras(8, 60, wave, 0) ?? []) normal.add(a);
    expect(normal.size).toBe(SUPPORT_AURA_KEYS.length);
  });

  it('a wave has one support at most, standing furthest back, and spawning it draws nothing from the combat rng', () => {
    const waveAt = (seed: number, wave: number): { world: WorldState; rngState: number } => {
      const world = createWorld(seed, [hero('k')]);
      world.globalStageIndex = 150;
      world.wavesThisStage = wave;
      const rng = makeRng(42);
      spawnWave(world, rng);
      return { world, rngState: rng.state() };
    };
    let withSupport = 0;
    for (let wave = 0; wave < 40; wave++) {
      const { world, rngState } = waveAt(21, wave);
      const supports = world.waveQueue.filter((q) => q.combatant.enemyRole === 'support');
      expect(supports.length).toBeLessThanOrEqual(1);
      expect(rngState).toBe(waveAt(22, wave).rngState); // another run seed: other supports, the same combat stream
      const support = supports[0]?.combatant;
      if (support === undefined) continue;
      withSupport += 1;
      expect(support.auras).toEqual(supportAuras(21, 150, wave, 1));
      expect(support.abilities).toEqual([]); // it casts nothing
      expect(support.range).toBe(SUPPORT_KIND.range);
      for (const q of world.waveQueue) expect(support.range).toBeGreaterThanOrEqual(q.combatant.range);
      expect(support.maxHp).toBeLessThan(Math.min(...world.waveQueue.filter((q) => q.combatant.enemyRole === 'soldier' && q.combatant.isElite !== true).map((q) => q.combatant.maxHp), Infinity));
    }
    expect(withSupport).toBeGreaterThan(5);
  });

  it('while it lives its whole wave carries its auras; they end the moment it dies', () => {
    const support = foe('sup', { enemyRole: 'support', auras: ['toughness', 'fury', 'vigor', 'aegis', 'malice'], hp: 100, maxHp: 100 });
    const mate = foe('m', { enemyRole: 'soldier', hp: 500, maxHp: 1000 });
    const wave = [support, mate];
    refreshAuras(wave, TORMENT);
    const d = 4;
    expect(mate.underAuras).toEqual({ toughness: auraValue('toughness', d), fury: auraValue('fury', d), vigor: auraValue('vigor', d), aegis: auraValue('aegis', d), malice: auraValue('malice', d) });
    // Furia and Saña.
    expect(attackHastePct(mate)).toBe(auraValue('fury', d));
    expect(foeDamageMult(mate)).toBeCloseTo(1 + auraValue('malice', d) / 100, 9);
    // Égida: a shield worth a share of its life, given once; Aguante takes its share off first.
    const shield = (mate.maxHp * auraValue('aegis', d)) / 100;
    expect(mate.aegis).toBe(shield);
    const hit = 400;
    const afterToughness = hit * (1 - auraValue('toughness', d) / 100);
    expect(foeWard(mate, hit, true)).toBeCloseTo(afterToughness - shield, 6);
    expect(mate.aegis).toBe(0);
    refreshAuras(wave, TORMENT);
    expect(mate.aegis).toBe(0); // not given again
    // Vigor: it regenerates a share of its life every second.
    tickFoeTraits(wave, TORMENT, 1000);
    expect(mate.hp).toBeCloseTo(500 + (1000 * auraValue('vigor', d)) / 100, 6);

    // The support dies in a fight: the auras are gone on that very tick, and the strip is told.
    const knight = unit({ id: 'k', side: 'hero', x: 0, range: 1000, baseStats: base({ health: 1e9, attackDamage: 1e6, attackSpeed: 5, critChance: 0 }), hp: 1e9, maxHp: 1e9 });
    const sup2 = foe('sup', { enemyRole: 'support', auras: ['toughness'], hp: 10, maxHp: 10, x: 10, enemyDamage: 0 });
    const mate2 = foe('m', { enemyRole: 'brute', x: 30, enemyDamage: 0 });
    const world = fight([knight], [sup2, mate2], HELL);
    const rng = makeRng(1);
    let events = resolveCombatTick(world, TICK, rng);
    for (let i = 0; i < 20 && sup2.alive; i++) {
      expect(mate2.underAuras?.toughness).toBe(auraValue('toughness', 1));
      events = resolveCombatTick(world, TICK, rng);
    }
    expect(sup2.alive).toBe(false);
    expect(mate2.underAuras).toBeUndefined();
    expect(events.some((e) => e.type === 'cue' && e.cue === 'supportDown' && e.targetId === 'sup')).toBe(true);
    expect(foeWard(mate2, 100, true)).toBe(100);
  });

  it('a boss and what it summons carry no auras', () => {
    const support = foe('sup', { enemyRole: 'support', auras: ['fury'] });
    const boss = foe('boss', { isBoss: true });
    refreshAuras([support, boss], HELL);
    expect(boss.underAuras).toBeUndefined();
  });
});

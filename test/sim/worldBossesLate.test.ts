import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities, effectCoeff, isHarmed } from '@/sim/abilities';
import { armBoss } from '@/sim/bossMechanics';
import { applyEffect } from '@/sim/effects';
import { MIRROR_ABILITY, noteHeroCasts, reflection } from '@/sim/mirror';
import { makeRng, type Rng } from '@/sim/rng';
import { ABILITIES, abilityDef, type AbilityDef } from '@/data/abilities';
import { MECHANIC, mechanicAbility, worldBossMechanic, type BossMechanicKey } from '@/data/bossKit';
import { CLASS_KEYS } from '@/data/classes';
import { effectDef } from '@/data/effects';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { base, effect, quietRng, unit } from './_kit';

// The world bosses' mechanics of worlds 7–10 (docs/redesign/PROGRESS.md "Combate, segunda ola", D): Esporas (the
// Destroying Angel), Hoja al rojo (the Quench), Balanza (the Verdict), Espejos (the Unmaker). Numbers in
// data/bossKit.ts MECHANIC; rules in sim/worldBossRules.ts and sim/mirror.ts.

const TICK = 100;
const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1000, maxHp: 1000, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }), attackTimerMs: 1e12, ...over });
const PLACES = [{ x: 240, reach: 60 }, { x: 130, reach: 170 }, { x: 95, reach: 205 }] as const;
const party = (over: [Partial<Combatant>?, Partial<Combatant>?, Partial<Combatant>?] = []): Combatant[] =>
  [hero('tank', over[0]), hero('archer', over[1]), hero('healer', over[2])];
const boss = (mechanic: BossMechanicKey, d: number, over: Partial<Combatant> = {}): Combatant =>
  unit({
    id: 'boss', side: 'enemy', hp: 100_000, maxHp: 100_000, x: 300, range: 400, moveSpeed: 60, enemyDamage: 100, enemyAttackSpeed: 0.05, attackTimerMs: 1e12,
    isBoss: true, affixes: [], bossRank: 'world', mechanic, enrageMs: Number.POSITIVE_INFINITY, fightMs: 0,
    abilities: [{ def: mechanicAbility(abilityDef(MECHANIC[mechanic].abilityKey), mechanic, d), rank: 1 }], ...over,
  });
function fight(heroes: Combatant[], enemies: Combatant[], stage = 70): WorldState {
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
const firstCast = (key: BossMechanicKey): number => MECHANIC[key].openerMs + MECHANIC[key].castMs;
/** A hero ability of the test's own: one instant heal of 5 % of the target's life on whoever has least. */
const quickHeal: AbilityDef = { key: 't_heal', name: 'Heal', icon: 'heal', desc: '', cooldownMs: 1000, target: 'lowestAllyHp', applies: [{ effectKey: 'fx_heal' }], power: { coeff: 0.05 } };
const healerWith = (def: AbilityDef): Combatant => hero('healer', { classKey: 'priest', abilities: [{ def, rank: 1 }] });

describe('the figures of worlds 7–10 carry them, each telegraphed', () => {
  it('the Destroying Angel, the Quench, the Verdict and the Unmaker', () => {
    expect([70, 80, 90, 100].map(worldBossMechanic)).toEqual(['spores', 'redBlade', 'scales', 'mirror']);
    for (const key of ['spores', 'redBlade', 'scales', 'mirror'] as const) expect(abilityDef(MECHANIC[key].abilityKey).castTimeMs).toBe(1500);
  });
});

describe('Esporas (the Destroying Angel)', () => {
  const spores = effectDef(MECHANIC.spores.effectKey);

  it('every cloud settles one more layer on every hero, up to five; each layer is a share of his life per second', () => {
    const heroes = party([{}, { hp: 500, maxHp: 500 }]);
    const world = fight(heroes, [boss('spores', 0)]);
    run(world, firstCast('spores') - 200);
    expect(heroes.every((h) => effect(h, spores.key) === undefined)).toBe(true);
    run(world, 400);
    expect(heroes.map((h) => effect(h, spores.key)?.stacks)).toEqual([1, 1, 1]);
    expect(effect(heroes[0], spores.key)?.value).toBeCloseTo(1000 * 0.002, 6); // Normal: 0.2 % of his life
    expect(effect(heroes[1], spores.key)?.value).toBeCloseTo(500 * 0.002, 6);
    const before = heroes[0]?.hp ?? 0;
    run(world, 1000);
    expect(before - (heroes[0]?.hp ?? 0)).toBeCloseTo(2, 4);
    run(world, MECHANIC.spores.everyMs[0]);
    expect(effect(heroes[0], spores.key)?.stacks).toBe(2);
    run(world, MECHANIC.spores.everyMs[0] * 6);
    expect(effect(heroes[0], spores.key)?.stacks).toBe(spores.maxStacks);
    expect(spores.maxStacks).toBe(5);
    expect(spores.durationMs).toBeGreaterThan(Math.max(...MECHANIC.spores.everyMs)); // a cloud renews them before they fade
  });

  it('a heal clears them from the hero it lands on — an instant one as it lands, a rolling one as it is applied', () => {
    const tank = hero('tank', { hp: 400 });
    const archer = hero('archer', { hp: 900 });
    for (const h of [tank, archer]) for (let i = 0; i < 3; i++) applyEffect(h.effects, spores, 'boss', 2);
    const priest = healerWith(quickHeal);
    expect(castReadyAbilities(priest, [tank, archer, priest], [boss('spores', 0)], 70, quietRng(), [])).toEqual(['t_heal']);
    expect(effect(tank, spores.key)).toBeUndefined(); // the one who had least: healed, and clean
    expect(effect(archer, spores.key)?.stacks).toBe(3);
    // Mend is a heal that rolls: it clears them as it is applied (the user, 2026-11-16 — the heals do Purify's work).
    const mender = healerWith(abilityDef('priest_mend'));
    archer.hp = 300;
    expect(castReadyAbilities(mender, [archer, mender], [boss('spores', 0)], 70, quietRng(), [])).toEqual(['priest_mend']);
    expect(effect(archer, 'fx_hot')).toBeDefined();
    expect(effect(archer, spores.key)).toBeUndefined();
    expect(spores.healCleansed).toBe(true);
  });

  it('Healing Light, cast for them, clears them; and they come thicker and faster as the difficulty rises', () => {
    const archer = hero('archer', { hp: 900 });
    applyEffect(archer.effects, spores, 'boss', 2);
    const priest = healerWith(abilityDef('priest_healing_light'));
    castReadyAbilities(priest, [archer, priest], [boss('spores', 0)], 70, quietRng(), []);
    expect(effect(archer, spores.key)).toBeUndefined();
    const at = (d: number): { every: number; pct: number } => {
      const def = mechanicAbility(abilityDef('boss_spores'), 'spores', d);
      return { every: def.cooldownMs, pct: def.special?.kind === 'spores' ? def.special.pctPerLayer : 0 };
    };
    expect([0, 1, 4].map(at)).toEqual([{ every: 12_000, pct: 0.2 }, { every: 10_000, pct: 0.3 }, { every: 8000, pct: 0.6 }]);
  });
});

describe('Hoja al rojo (the Quench)', () => {
  it('the ground burns for 6 s under all three: each takes its share of the boss\'s hit over that time, then it is over', () => {
    for (const [d, total] of [[0, 0.6], [1, 0.8], [4, 1.4]] as const) {
      const b = boss('redBlade', d);
      const heroes = party([{ baseStats: base({ health: 1000, armor: 5000, magicResist: 5000 }) }]);
      const world = fight(heroes, [b], 80);
      run(world, firstCast('redBlade') + 100);
      expect(b.groundFire?.leftMs).toBeGreaterThan(MECHANIC.redBlade.burnMs - 300);
      const events = run(world, MECHANIC.redBlade.burnMs);
      expect(b.groundFire).toBeUndefined();
      for (const h of heroes) expect(h.maxHp - h.hp).toBeCloseTo(100 * total, 3); // armour does nothing to it
      const before = heroes.map((h) => h.hp);
      run(world, 2000);
      expect(heroes.map((h) => h.hp)).toEqual(before);
      // Numbers on each hero while it burns, tagged with the mechanic.
      const shown = events.filter((e) => e.type === 'damage' && e.tick === true && e.abilityKey === 'boss_red_blade' && e.targetId === 'archer');
      expect(shown.length).toBeGreaterThan(8);
    }
  });

  it('nothing is laid on the heroes: a heal has nothing to lift', () => {
    const b = boss('redBlade', 0);
    const heroes = party();
    const world = fight(heroes, [b], 80);
    run(world, firstCast('redBlade') + 1000);
    expect(b.groundFire).toBeDefined();
    expect(heroes.every((h) => h.effects.length === 0 && !isHarmed(h))).toBe(true);
  });

  it('"takes X % less damage" counts, a shield soaks it, a fallen hero takes none, and a new one starts the time again', () => {
    const b = boss('redBlade', 0, { abilities: [] });
    const guarded = hero('tank', { baseStats: base({ health: 1000, damageReduction: 20 }) });
    const shielded = hero('archer');
    shielded.effects.push({ defKey: 'fx_shield', sourceId: 'p', remainingMs: 60_000, totalMs: 60_000, stacks: 1, value: 1e6 });
    const fallen = hero('healer', { alive: false, hp: 0 });
    const world = fight([guarded, shielded, fallen], [b], 80);
    b.groundFire = { leftMs: 6000, dps: 10 };
    run(world, 3000);
    expect(guarded.maxHp - guarded.hp).toBeCloseTo(30 * 0.8, 4);
    expect(shielded.hp).toBe(1000);
    expect(fallen.hp).toBe(0);
    b.groundFire = { leftMs: 6000, dps: 10 };
    run(world, 5900);
    expect(b.groundFire).toBeDefined();
  });
});

describe('Balanza (the Verdict)', () => {
  it('every hero drops to the share of life of the one who has least — always the whole way', () => {
    const b = boss('scales', 1);
    const heroes = party([{ hp: 2000, maxHp: 2000 }, { hp: 300, maxHp: 600 }, { hp: 800, maxHp: 1000 }]);
    const world = fight(heroes, [b], 90);
    run(world, firstCast('scales') - 200);
    expect(heroes.map((h) => h.hp)).toEqual([2000, 300, 800]);
    const events = run(world, 400).filter((e) => e.type === 'damage' && e.abilityKey === 'boss_scales');
    expect(heroes.map((h) => h.hp)).toEqual([1000, 300, 500]); // all at 50 %
    expect(events.map((e) => [e.targetId, e.amount])).toEqual([['tank', 1000], ['healer', 300]]); // the lowest loses nothing
  });

  it('it is life taken, not damage dealt: no armour, no reduction, no shield stands in the way; the invulnerable keep theirs', () => {
    const b = boss('scales', 1);
    const tank = hero('tank', { baseStats: base({ health: 1000, armor: 9000, damageReduction: 60 }) });
    tank.effects.push({ defKey: 'fx_shield', sourceId: 'p', remainingMs: 60_000, totalMs: 60_000, stacks: 1, value: 500 });
    const saved = hero('healer');
    applyEffect(saved.effects, effectDef('fx_invuln'), 'k', 0, 60_000);
    const heroes = [tank, hero('archer', { hp: 400 }), saved];
    run(fight(heroes, [b], 90), firstCast('scales') + 200);
    expect(tank.hp).toBe(400);
    expect(effect(tank, 'fx_shield')?.value).toBe(500);
    expect(saved.hp).toBe(1000);
  });

  it('a fallen hero is not the measure, and a hero alone is not levelled with anyone', () => {
    const heroes = party([{ hp: 900 }, { alive: false, hp: 0 }, { hp: 600 }]);
    run(fight(heroes, [boss('scales', 0)], 90), firstCast('scales') + 200);
    expect(heroes.map((h) => h.hp)).toEqual([600, 0, 600]);
    const alone = [hero('tank', { hp: 700 })];
    run(fight(alone, [boss('scales', 0, { x: 60 })], 90), firstCast('scales') + 200);
    expect(alone[0]?.hp).toBe(700);
    expect([0, 1, 4].map((d) => mechanicAbility(abilityDef('boss_scales'), 'scales', d).cooldownMs)).toEqual([20_000, 15_000, 12_000]);
  });
});

describe('Espejos (the Unmaker): what it reflects', () => {
  const NORMAL = { harm: 0.25, boon: 0.02, buff: 0.3 };
  const reflecting = (key: string, rank: number): ReturnType<typeof reflection> => reflection(boss('mirror', 0, { lastHeroCast: { key, rank } }), NORMAL);

  it('an ability that harms falls on the heroes, at a share of its strength', () => {
    const rain = reflecting('ranger_multishot', 3); // 1.2 + 2 × 0.4 = 2.0 of an attack on the whole wave
    expect(rain?.of).toBe('ranger_multishot');
    expect(rain?.def.key).toBe(MIRROR_ABILITY);
    expect(rain?.def.target).toBe('allEnemies');
    expect(rain?.def.applies).toEqual([{ effectKey: 'fx_damage', durationMsOverride: 0, power: { coeff: 2.0 * 0.25 } }]);
    // A shot a hero aims by her own priority falls on a hero picked at random.
    expect(reflecting('ranger_aimedshot', 1)?.def.target).toBe('randomEnemy');
    // A blast keeps its splash, scaled like the rest.
    const blast = reflecting('ranger_focus', 1);
    expect(blast?.def.power?.splashCoeff).toBeCloseTo(0.6 * 0.25, 6);
    expect(blast?.def.power?.splashRadius).toBe(45);
    // What it leaves on the enemies it leaves on the heroes: the cleave's weakening, whole.
    const cleave = reflecting('knight_debilitate', 1);
    expect(cleave?.def.target).toBe('meleeEnemies');
    expect(cleave?.def.applies.find((a) => a.effectKey === 'debuff_weaken')).toMatchObject({ value: 15, valuePerRank: 0 });
  });

  it('what it does for allies the boss takes for itself: heals and shields far weaker, buffs weaker', () => {
    const mend = reflecting('priest_mend', 1);
    expect(mend?.def.target).toBe('self');
    expect(mend?.def.applies).toEqual([{ effectKey: 'fx_hot', durationMsOverride: 6000, power: { coeff: 0.2 * 0.02 }, target: 'self' }]);
    const battlecry = reflecting('knight_battlecry', 1);
    expect(battlecry?.def.applies.every((a) => a.target === 'self')).toBe(true);
    // Smite both heals an ally and strikes an enemy: the heal goes to the boss, the strike to a hero.
    const smite = reflecting('priest_smite', 1);
    expect(smite?.def.applies.map((a) => [a.effectKey, a.target, a.power?.coeff])).toEqual([['fx_heal', 'self', 0.08 * 0.02], ['fx_damage', 'randomEnemy', 0.6 * 0.25]]);
    // Healing Light and Circle of Healing: their heal goes to the boss (the cleanse they carry is the heroes' alone).
    expect(reflecting('priest_healing_light', 1)?.def.applies.map((a) => [a.effectKey, a.target])).toEqual([['fx_heal', 'self']]);
    expect(reflecting('priest_circle', 1)?.def.applies.map((a) => [a.effectKey, a.target])).toEqual([['fx_heal', 'self']]);
  });

  it('with nothing cast yet there is nothing to reflect; an unknown key is ignored', () => {
    expect(reflection(boss('mirror', 0), NORMAL)).toBeUndefined();
    expect(reflecting('gone_ability', 1)).toBeUndefined();
  });

  it('its coefficients are the abilities\' own at that rank (the same rule sim/abilities uses), for every hero ability', () => {
    const heroAbilities = Object.values(ABILITIES).filter((a) => CLASS_KEYS.some((c) => a.key.startsWith(`${c}_`)));
    expect(heroAbilities.length).toBeGreaterThan(15);
    for (const src of heroAbilities) {
      for (const rank of [1, 3, 5]) {
        const out = reflection(boss('mirror', 0, { lastHeroCast: { key: src.key, rank } }), { harm: 1, boon: 1, buff: 1 });
        const kept = src.applies.filter((a) => !['cleanse', 'invulnerable'].includes(effectDef(a.effectKey).kind.type));
        expect(out?.def.applies.length ?? 0, src.key).toBe(kept.length);
        kept.forEach((a, i) => {
          const coeff = effectCoeff(src, a, rank - 1);
          if (coeff !== undefined) expect(out?.def.applies[i]?.power?.coeff, `${src.key} r${rank}`).toBeCloseTo(coeff, 9);
        });
      }
    }
  });

  it('remembers the last ability a hero cast — never an ultimate, never something he does not hold', () => {
    const b = boss('mirror', 0);
    const archer = hero('archer', { abilities: [{ def: abilityDef('ranger_multishot'), rank: 2 }] });
    noteHeroCasts(b, [archer], [{ type: 'cast', targetId: 'archer', abilityKey: 'ranger_hunters_mark' }]);
    expect(b.lastHeroCast).toBeUndefined();
    noteHeroCasts(b, [archer], [{ type: 'cast', targetId: 'archer', abilityKey: 'ranger_multishot' }, { type: 'cast', targetId: 'boss', abilityKey: 'boss_mirror' }]);
    expect(b.lastHeroCast).toEqual({ key: 'ranger_multishot', rank: 2, heroId: 'archer' });
  });
});

describe('Espejos in a fight', () => {
  const mirrorBoss = (d: number, last: { key: string; rank: number } | undefined, over: Partial<Combatant> = {}): Combatant =>
    boss('mirror', d, { ...(last === undefined ? {} : { lastHeroCast: last }), ...over });

  it('a volley comes back on all three heroes, tagged as the mirror\'s, with a cue naming the ability', () => {
    const b = mirrorBoss(0, { key: 'ranger_multishot', rank: 1 });
    const heroes = party();
    const events = run(fight(heroes, [b], 100), firstCast('mirror') + 200);
    const hits = events.filter((e) => e.type === 'damage' && e.abilityKey === MIRROR_ABILITY);
    expect(hits.map((e) => e.targetId).sort()).toEqual(['archer', 'healer', 'tank']);
    for (const hit of hits) expect(hit.amount).toBeCloseTo(100 * 1.2 * 0.25, 4); // its hit × the volley × Normal's share
    expect(events.filter((e) => e.type === 'cue' && e.cue === 'mirror').map((e) => [e.targetId, e.abilityKey])).toEqual([['boss', 'ranger_multishot']]);
  });

  it('a heal comes back as a small heal on the boss; a buff as a weaker buff on it; a stone skin makes it take less', () => {
    const hurt = mirrorBoss(0, { key: 'priest_smite', rank: 1 }, { hp: 50_000 });
    const events = run(fight(party(), [hurt], 100), firstCast('mirror') + 200);
    expect(hurt.hp - 50_000).toBeCloseTo(100_000 * 0.08 * 0.02, 3);
    expect(events.some((e) => e.type === 'heal' && e.targetId === 'boss')).toBe(true);
    expect(events.filter((e) => e.type === 'damage' && e.abilityKey === MIRROR_ABILITY)).toHaveLength(1); // …and Smite's strike on a hero

    const quick = mirrorBoss(4, { key: 'ranger_fast_fire', rank: 5 }); // 45 % attack speed, 70 % of it in Torment
    run(fight(party(), [quick], 100), firstCast('mirror') + 200);
    expect(effect(quick, 'buff_fast_fire')?.value).toBeCloseTo(45 * 0.7, 6);

    const stone = mirrorBoss(4, { key: 'knight_guard', rank: 1 }, { hp: 1e9, maxHp: 1e9 }); // 20 % less damage, 70 % of it
    const tank = hero('tank', { baseStats: base({ health: 1000, attackDamage: 1000, attackSpeed: 1 }), attackTimerMs: 0 });
    const world = fight([tank, hero('archer'), hero('healer')], [stone], 100);
    const before = run(world, firstCast('mirror') - 300).filter((e) => e.type === 'damage' && e.targetId === 'boss');
    expect(before[0]?.amount).toBeCloseTo(1000, 3);
    run(world, 500);
    expect(effect(stone, 'buff_guard_block')).toBeDefined();
    const after = run(world, 2000).filter((e) => e.type === 'damage' && e.targetId === 'boss');
    expect(after[0]?.amount).toBeCloseTo(1000 * (1 - 0.2 * 0.7), 3);
  });

  it('an attack-damage buff makes it hit harder while it lasts — its blows and its abilities — by its share for the difficulty', () => {
    // Battle Cry at rank 1: +15 % attack damage; in Eternal the boss keeps 60 % of it: +9 %.
    const b = mirrorBoss(3, { key: 'knight_battlecry', rank: 1 }, { enemyAttackSpeed: 1, attackTimerMs: 0, range: 400 });
    const tank = hero('tank', { hp: 1e6, maxHp: 1e6 });
    const world = fight([tank, hero('archer'), hero('healer')], [b], 100);
    const plain = run(world, firstCast('mirror') - 300).filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined);
    expect(plain[0]?.amount).toBeCloseTo(100, 4);
    run(world, 500);
    expect(effect(b, 'buff_battlecry_ad')?.value).toBeCloseTo(15 * 0.6, 6);
    // (That cast also lit its first mirror: +8 % in Eternal. The two add up.)
    const buffed = run(world, 2000).filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined);
    expect(buffed[0]?.amount).toBeCloseTo(100 * 1.17, 4);
    b.abilities = []; // (no second reflection in this test)
    run(world, 8000); // it wears off with the buff
    const after = run(world, 1500).filter((e) => e.type === 'damage' && e.targetId === 'tank' && e.abilityKey === undefined);
    expect(effect(b, 'buff_battlecry_ad')).toBeUndefined();
    expect(after[0]?.amount).toBeCloseTo(100 * 1.08, 4); // the mirror stays lit
    // Its crit buff is taken too, and does nothing for it.
    expect(reflection(mirrorBoss(3, { key: 'knight_battlecry', rank: 1 }), { harm: 0.4, boon: 0.05, buff: 0.6 })?.def.applies.map((a) => a.effectKey)).toEqual(['buff_battlecry_ad', 'buff_battlecry_crit']);
  });

  it('what it lays on the heroes is harmful, so a heal lifts it; with nothing cast it does nothing', () => {
    const b = mirrorBoss(0, { key: 'knight_debilitate', rank: 1 });
    const heroes = party();
    run(fight(heroes, [b], 100), firstCast('mirror') + 200);
    expect(effect(heroes[0], 'debuff_weaken')).toBeDefined(); // the cleave reaches who stands in its reach: the tank
    expect(isHarmed(heroes[0] as Combatant)).toBe(true);
    const idle = mirrorBoss(0, undefined);
    const quiet = party();
    const events = run(fight(quiet, [idle], 100), firstCast('mirror') + 200);
    expect(events.some((e) => e.type === 'cue' && e.cue === 'mirror')).toBe(false);
    expect(quiet.every((h) => h.hp === 1000 && h.effects.length === 0)).toBe(true);
  });

  it('it reflects what the party really cast last, in the fight itself', () => {
    const b = mirrorBoss(0, undefined, { hp: 1e9, maxHp: 1e9 });
    const tank = hero('tank', { baseStats: base({ health: 1e6, attackDamage: 10, attackSpeed: 1 }), hp: 1e6, maxHp: 1e6, attackTimerMs: 0, abilities: [{ def: abilityDef('knight_debilitate'), rank: 2 }] });
    const world = fight([tank, hero('archer'), hero('healer')], [b], 100);
    const events = run(world, firstCast('mirror') + 200, makeRng(3));
    expect(events.some((e) => e.type === 'cast' && e.targetId === 'tank' && e.abilityKey === 'knight_debilitate')).toBe(true);
    expect(events.find((e) => e.type === 'cue' && e.cue === 'mirror')?.abilityKey).toBe('knight_debilitate');
  });
});

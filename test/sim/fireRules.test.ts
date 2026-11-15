import { describe, it, expect } from 'vitest';
import { castReadyAbilities } from '@/sim/abilities';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { noteDamageTaken, tickRecent } from '@/sim/recent';
import { abilityDef, ABILITIES, RECENT_HIT_MS } from '@/data/abilities';
import { abilityFireFact, ultimateFireFact } from '@/sim/abilityFacts';
import { ULTIMATES } from '@/data/ultimates';
import { CLASS_KEYS } from '@/data/classes';
import { talentNodes } from '@/data/talents';
import type { Combatant, CombatEvent } from '@/sim/world';
import { base, effect, quietRng, unit } from './_kit';

// WHEN each hero ability fires (second combat wave, A — agreed 2026-11-15): a default per ability, no settings.
// Used whenever it helps, saved for its moment when there is one, never held for something that may not come.

const hero = (id: string, key: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', range: 400, baseStats: base({ attackDamage: 100, health: 1000 }), abilities: [{ def: abilityDef(key), rank: 1 }], ...over });
const foe = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'enemy', hp: 1e6, maxHp: 1e6, x: 20, engaged: true, ...over });

function casts(caster: Combatant, allies: Combatant[], enemies: Combatant[]): string[] {
  const events: CombatEvent[] = [];
  return castReadyAbilities(caster, allies, enemies, 1, quietRng(), events);
}

describe('every hero ability and ultimate says when it fires', () => {
  it('has a fire rule (or is an aura, always on)', () => {
    for (const classKey of CLASS_KEYS) {
      for (const node of talentNodes(classKey)) {
        if (node.kind !== 'ability') continue;
        const def = ABILITIES[node.abilityKey ?? ''];
        expect(def, node.key).toBeDefined();
        if (def === undefined || def.aura !== undefined) continue;
        expect(def.fires, def.key).toBeDefined();
        expect(abilityFireFact(def).when).not.toBe('ready');
      }
      const ult = ULTIMATES[classKey];
      expect(ult).toBeDefined();
      if (ult !== undefined) expect(['lethal', 'bossEngage']).toContain(ultimateFireFact(ult).when);
    }
  });

  it('an engage ultimate says so when its capstone reaches elites', () => {
    const ult = ULTIMATES.ranger;
    if (ult === undefined) throw new Error('no ranger ultimate');
    expect(ultimateFireFact(ult)).toEqual({ when: 'bossEngage', elites: false });
    expect(ultimateFireFact(ult, { vs: 'eliteOrBoss' })).toEqual({ when: 'bossEngage', elites: true });
  });
});

describe('Hold the Line', () => {
  const slam = { def: abilityDef('boss_slam'), rank: 1 };

  it('waits while nobody is being hit and fires once the party takes damage', () => {
    const knight = hero('k', 'knight_holdtheline');
    const ally = unit({ id: 'a', side: 'hero' });
    const grunt = foe('g');
    expect(casts(knight, [knight, ally], [grunt])).toEqual([]);
    noteDamageTaken(ally, 10);
    expect(casts(knight, [knight, ally], [grunt])).toEqual(['knight_holdtheline']);
  });

  it('forgets a hit after a while', () => {
    const knight = hero('k', 'knight_holdtheline');
    noteDamageTaken(knight, 10);
    tickRecent(knight, RECENT_HIT_MS + 100);
    expect(casts(knight, [knight], [foe('g')])).toEqual([]);
  });

  it('against a boss with an area blow it is kept for the blow', () => {
    const knight = hero('k', 'knight_holdtheline');
    const boss = foe('b', { isBoss: true, abilities: [slam] });
    noteDamageTaken(knight, 10);
    expect(casts(knight, [knight], [boss])).toEqual([]); // being hit, but the slam is still to come
    boss.casting = { key: 'boss_slam', remainingMs: 1500, totalMs: 1500 };
    expect(casts(knight, [knight], [boss])).toEqual(['knight_holdtheline']);
  });

  it('does not wait for a blow from a boss that has none', () => {
    const knight = hero('k', 'knight_holdtheline');
    noteDamageTaken(knight, 10);
    expect(casts(knight, [knight], [foe('b', { isBoss: true })])).toEqual(['knight_holdtheline']);
  });
});

describe('the Priest watches who is being hit', () => {
  it('Holy Shield goes on the ally taking the most damage, not always the tank', () => {
    const priest = hero('p', 'priest_holyshield', { classKey: 'priest' });
    const tank = unit({ id: 'k', side: 'hero', x: 10 });
    const archer = unit({ id: 'r', side: 'hero', classKey: 'ranger' });
    const grunt = foe('g');
    expect(casts(priest, [tank, archer, priest], [grunt])).toEqual([]); // nobody hit: it is kept
    noteDamageTaken(tank, 50);
    noteDamageTaken(archer, 200);
    expect(casts(priest, [tank, archer, priest], [grunt])).toEqual(['priest_holyshield']);
    expect(effect(archer, 'fx_shield')?.value).toBeGreaterThan(0);
    expect(tank.effects.length).toBe(0);
  });

  it('Mend goes first to whoever just took a heavy hit, over a lower life bar', () => {
    const priest = hero('p', 'priest_mend', { classKey: 'priest', baseStats: base({ healPower: 100, health: 1000 }) });
    const low = unit({ id: 'low', side: 'hero', hp: 650 }); // 65 % — under the threshold, no recent blow
    const struck = unit({ id: 'struck', side: 'hero', hp: 800 });
    noteDamageTaken(struck, 200); // a fifth of its life in one blow
    casts(priest, [low, struck, priest], [foe('g')]);
    expect(effect(struck, 'fx_hot')).toBeDefined();
    expect(effect(low, 'fx_hot')).toBeUndefined();
  });

  it('Mend is kept while everyone is healthy and unhurt', () => {
    const priest = hero('p', 'priest_mend', { classKey: 'priest' });
    const ally = unit({ id: 'a', side: 'hero', hp: 900 });
    expect(casts(priest, [ally, priest], [foe('g')])).toEqual([]);
  });
});

describe('a shield soaking the blows', () => {
  it('still counts as being hit: Holy Shield goes to the shot ally whose Overflow shield took the arrow', () => {
    const priest = hero('p', 'priest_holyshield', { classKey: 'priest', x: 0 });
    const tank = unit({ id: 'k', side: 'hero', x: 20, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }) });
    const archer = unit({ id: 'r', side: 'hero', classKey: 'ranger', x: 10, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }) });
    archer.effects.push({ defKey: 'fx_overflow', sourceId: 'p', remainingMs: 8000, totalMs: 8000, stacks: 1, value: 500 });
    const world = createWorld(3, [tank, archer, priest]);
    world.phase = 'fighting';
    world.enemies = [unit({ id: 's', side: 'enemy', hp: 1e9, maxHp: 1e9, x: 40, range: 400, enemyDamage: 50, enemyAttackSpeed: 1, backShotChance: 1, engaged: true })];
    const rng = quietRng();
    (rng as { chance: (p: number) => boolean }).chance = (p: number): boolean => p >= 1; // the shooter always aims behind
    (rng as { pick: <T>(items: readonly T[]) => T }).pick = <T,>(items: readonly T[]): T => items[0] as T; // …at the archer
    for (let i = 0; i < 12; i++) resolveCombatTick(world, 100, rng);
    expect(archer.hp).toBe(1000); // the Overflow shield took every arrow
    expect(effect(archer, 'fx_shield')?.value).toBeGreaterThan(0); // …and she still got the Holy Shield
    expect(effect(tank, 'fx_shield')).toBeUndefined();
  });
});

describe('abilities that want a moment worth it', () => {
  it('Battle Cry waits for three enemies, or an elite or a boss', () => {
    const knight = hero('k', 'knight_battlecry', { range: 30 });
    const near = (id: string): Combatant => foe(id, { x: 20 });
    expect(casts(knight, [knight], [near('a'), near('b')])).toEqual([]);
    expect(casts(knight, [knight], [near('a'), near('b'), near('c')])).toEqual(['knight_battlecry']);
    const again = hero('k2', 'knight_battlecry', { range: 30 });
    expect(casts(again, [again], [foe('e', { isElite: true })])).toEqual(['knight_battlecry']);
  });

  it('Debilitating Cleave waits for two in reach, unless no more are coming', () => {
    const knight = hero('k', 'knight_debilitate', { range: 30 });
    const far = foe('far', { x: 300 });
    expect(casts(knight, [knight], [foe('a'), far])).toEqual([]); // one in reach, another on its way
    expect(casts(knight, [knight], [foe('a')])).toEqual(['knight_debilitate']); // the last one: no reason to wait
  });

  it('Aimed Shot picks an elite before the rest of its kind', () => {
    const ranger = hero('r', 'ranger_aimedshot', { classKey: 'ranger' });
    ranger.charges = { ranger_aimedshot: 99 };
    const grunt = foe('g', { hp: 1000, maxHp: 1000 });
    const elite = foe('e', { hp: 500, maxHp: 500, isElite: true, x: 60 });
    casts(ranger, [ranger], [grunt, elite]);
    expect(elite.hp).toBeLessThan(500);
    expect(grunt.hp).toBe(1000);
  });
});

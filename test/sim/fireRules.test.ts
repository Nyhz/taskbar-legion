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
    const tank = unit({ id: 'k', side: 'hero', x: 10, hp: 950 });
    const archer = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 800 });
    const grunt = foe('g');
    expect(casts(priest, [tank, archer, priest], [grunt])).toEqual([]); // nobody hit: it is kept
    noteDamageTaken(tank, 50);
    expect(casts(priest, [tank, archer, priest], [grunt])).toEqual([]); // a chip of the wave: still kept (2026-11-21)
    noteDamageTaken(archer, 200); // a heavy blow
    expect(casts(priest, [tank, archer, priest], [grunt])).toEqual(['priest_holyshield']);
    expect(effect(archer, 'fx_shield')?.value).toBeGreaterThan(0);
    expect(tank.effects.length).toBe(0);
  });

  it('Mend goes first to whoever just took a heavy hit, over a lower life bar', () => {
    const priest = hero('p', 'priest_mend', { classKey: 'priest', baseStats: base({ healPower: 100, health: 1000 }) });
    const low = unit({ id: 'low', side: 'hero', hp: 650 }); // 65 % — under the threshold, no recent blow
    const struck = unit({ id: 'struck', side: 'hero', hp: 700 });
    noteDamageTaken(struck, 300); // nearly a third of its life in one blow, now under HEAVY_HIT_HEAL_BELOW
    casts(priest, [low, struck, priest], [foe('g')]);
    expect(effect(struck, 'fx_hot')).toBeDefined();
    expect(effect(low, 'fx_hot')).toBeUndefined();
  });

  // User, 2026-11-21: Healing Light landed on a Ranger Mend was already bringing back to full — the rest of the Mend
  // wasted. A heal counts what the heals over time on an ally still have to give, unless that ally is in danger.
  const mending = (perSec: number, ms: number): Combatant['effects'][number] =>
    ({ defKey: 'fx_hot', sourceId: 'p', remainingMs: ms, totalMs: 12_000, stacks: 1, value: perSec });

  it('Healing Light is kept when Mend will bring the hurt ally back to full', () => {
    const priest = hero('p', 'priest_healing_light', { classKey: 'priest' });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 500, effects: [mending(60, 10_000)] }); // 50 % + 600 to come
    expect(casts(priest, [ranger, priest], [foe('g')])).toEqual([]);
  });

  it('Healing Light goes to the hurt ally nobody is mending, over a lower but mended one', () => {
    const priest = hero('p', 'priest_healing_light', { classKey: 'priest' });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 450, effects: [mending(60, 10_000)] });
    const knight = unit({ id: 'k', side: 'hero', hp: 550 });
    expect(casts(priest, [knight, ranger, priest], [foe('g')])).toEqual(['priest_healing_light']);
    expect(knight.hp).toBeGreaterThan(550);
    expect(ranger.hp).toBe(450);
  });

  it('Healing Light still saves a mended ally in danger — a slow heal does not stop the next blow', () => {
    const priest = hero('p', 'priest_healing_light', { classKey: 'priest' });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 200, effects: [mending(60, 12_000)] }); // 20 %, 32 % in 2 s
    expect(casts(priest, [ranger, priest], [foe('g')])).toEqual(['priest_healing_light']);
    expect(ranger.hp).toBeGreaterThan(200);
  });

  it('Healing Light does count on Mend for an ally under fire that outpaces it', () => {
    const priest = hero('p', 'priest_healing_light', { classKey: 'priest' });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 500, effects: [mending(60, 10_000)] });
    noteDamageTaken(ranger, 200); // ~90 a second coming in — more than Mend gives
    expect(casts(priest, [ranger, priest], [foe('g')])).toEqual(['priest_healing_light']);
  });

  it('against a boss winding up, a heal saves the ally in danger before it braces the front one', () => {
    const priest = hero('p', 'priest_mend', { classKey: 'priest', baseStats: base({ healPower: 100, health: 1000 }) });
    const knight = unit({ id: 'k', side: 'hero', x: 30 });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', x: 10, hp: 200 }); // 20 %
    const boss = foe('b', { isBoss: true, abilities: [{ def: abilityDef('boss_slam'), rank: 1 }] });
    boss.casting = { key: 'boss_slam', remainingMs: 1500, totalMs: 1500 };
    expect(casts(priest, [knight, ranger, priest], [boss])).toEqual(['priest_mend']);
    expect(effect(ranger, 'fx_hot')).toBeDefined();
    expect(effect(knight, 'fx_hot')).toBeUndefined();
  });

  it('Holy Shield in an emergency goes to the ally in danger, not the one taking more in absolute terms', () => {
    const priest = hero('p', 'priest_holyshield', { classKey: 'priest' });
    const knight = unit({ id: 'k', side: 'hero', x: 30, hp: 2400, maxHp: 3000 });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', x: 10, hp: 250 }); // 25 %
    noteDamageTaken(knight, 400);
    noteDamageTaken(ranger, 150);
    expect(casts(priest, [knight, ranger, priest], [foe('g')])).toEqual(['priest_holyshield']);
    expect(effect(ranger, 'fx_shield')).toBeDefined();
    expect(effect(knight, 'fx_shield')).toBeUndefined();
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
    // The tank is under 60 % (what lets the shield fire in a wave); the arrows behind him are what it answers.
    const tank = unit({ id: 'k', side: 'hero', x: 20, hp: 500, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }) });
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
    const events: CombatEvent[] = [];
    // …but the wave's later batches are still to arrive: it waits for them (2026-11-21).
    expect(castReadyAbilities(knight, [knight], [foe('a')], 1, quietRng(), events, 4)).toEqual([]);
  });

  it('braced for a blow, the defence with the longest cooldown answers first, the others when it is down', () => {
    const knight = unit({ id: 'k', side: 'hero', range: 400, baseStats: base({ attackDamage: 100, health: 1000 }),
      abilities: [{ def: abilityDef('knight_debilitate'), rank: 1 }, { def: abilityDef('knight_bulwark'), rank: 1 }] });
    const boss = foe('b', { isBoss: true, abilities: [{ def: abilityDef('boss_slam'), rank: 1 }] });
    boss.casting = { key: 'boss_slam', remainingMs: 1500, totalMs: 1500 };
    expect(casts(knight, [knight], [boss])).toEqual(['knight_bulwark']); // 26 s before the 15 s cleave
    knight.gcdMs = 0;
    knight.effects = [];
    expect(casts(knight, [knight], [boss])).toEqual(['knight_debilitate']); // Bulwark cooling down: the cleave
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

  it('Aimed Shot passes over an enemy one basic hit would finish', () => {
    const ranger = hero('r', 'ranger_aimedshot', { classKey: 'ranger' });
    ranger.charges = { ranger_aimedshot: 10 };
    const dying = foe('s', { hp: 5, maxHp: 1000, enemyRole: 'shooter' });
    const grunt = foe('g', { hp: 1000, maxHp: 1000, x: 60 });
    casts(ranger, [ranger], [dying, grunt]);
    expect(grunt.hp).toBeLessThan(1000);
    expect(dying.hp).toBe(5);
    expect(ranger.charges.ranger_aimedshot).toBe(0);
  });

  it('Aimed Shot keeps what it banked past a full charge for the next shot', () => {
    const ranger = hero('r', 'ranger_aimedshot', { classKey: 'ranger' });
    ranger.charges = { ranger_aimedshot: 13 };
    casts(ranger, [ranger], [foe('g')]);
    expect(ranger.charges.ranger_aimedshot).toBe(3);
  });

  it('Weak Spot marks the enemy that will live longest — the elite over the shooter', () => {
    const ranger = hero('r', 'ranger_weakspot', { classKey: 'ranger' });
    const shooter = foe('s', { hp: 1000, maxHp: 1000, enemyRole: 'shooter' });
    const elite = foe('e', { hp: 4000, maxHp: 4500, isElite: true, x: 60 });
    casts(ranger, [ranger], [shooter, elite]);
    expect(effect(elite, 'debuff_weakspot')).toBeDefined();
    expect(effect(shooter, 'debuff_weakspot')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { createWorld } from '@/sim/Simulation';
import { resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities } from '@/sim/abilities';
import { buildHeroCombatant, type HeroConfig } from '@/sim/loadout';
import { makeRng } from '@/sim/rng';
import { abilityDef } from '@/data/abilities';
import { classDef } from '@/data/classes';
import { SUPPORT_KIND, TARGET_PRIORITY, ENEMY_KINDS } from '@/data/enemies';
import { RANGE } from '@/data/field';
import { biggestCluster, caughtBy, pickTarget, reachOf, shotTarget, targetRank } from '@/sim/targeting';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { anyMoment, base, quietRng, unit } from './_kit';

// Who the Ranger and the Priest shoot, and from where (docs/redesign/PROGRESS.md «Enemigos», agreed 2026-11-15):
// priority Support → Shooter → Beast → Soldier → Brute (an elite before its kind; the boss in a boss fight), across
// a SHOT reach that is apart from where they stand — which does not move.

const TICK = 100;

const config = (classKey: string, id: string): HeroConfig => ({ id, classKey, level: 30, equipment: {}, talents: {}, activeAbilities: [] });

const foe = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'enemy', hp: 1e9, maxHp: 1e9, x: 300, range: RANGE.melee + 5, moveSpeed: 0, enemyDamage: 0, enemyAttackSpeed: 1, ...over });

function fight(heroes: Combatant[], enemies: Combatant[]): WorldState {
  const world = createWorld(7, heroes);
  world.globalStageIndex = 30;
  world.enemies = enemies;
  world.phase = 'fighting';
  return world;
}

describe('the order', () => {
  it('is support, shooter, beast, soldier, brute — an elite before the rest of its kind', () => {
    expect(TARGET_PRIORITY).toEqual(['support', 'shooter', 'beast', 'soldier', 'brute']);
    const ranks = TARGET_PRIORITY.flatMap((role) => [targetRank(foe('e', { enemyRole: role, isElite: true })), targetRank(foe('n', { enemyRole: role }))]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(ranks.length);
    // An elite brute still comes after a common soldier: the kind decides first.
    expect(targetRank(foe('eb', { enemyRole: 'brute', isElite: true }))).toBeGreaterThan(targetRank(foe('s', { enemyRole: 'soldier' })));
  });

  it('against a boss, the boss — and what it summoned over the party before it', () => {
    const ranger = unit({ id: 'r', side: 'hero', x: 0, range: 160, shotReach: 340 });
    const boss = foe('boss', { isBoss: true, x: 150 });
    const support = foe('sup', { enemyRole: 'support', x: 200 });
    expect(pickTarget(ranger, [support, boss])?.id).toBe('boss');
    const crow = foe('crow', { x: 5, summon: { key: 'crow', leftMs: 5000, slot: 0 } });
    expect(pickTarget(ranger, [support, boss, crow])?.id).toBe('crow');
  });

  it('picks the nearest of equals, and nothing past the shot reach', () => {
    const ranger = unit({ id: 'r', side: 'hero', x: 0, range: 160, shotReach: 340 });
    const near = foe('near', { enemyRole: 'soldier', x: 120 });
    const far = foe('far', { enemyRole: 'soldier', x: 200 });
    expect(pickTarget(ranger, [far, near])?.id).toBe('near');
    const support = foe('sup', { enemyRole: 'support', x: 346 });
    expect(pickTarget(ranger, [near, support])?.id).toBe('near'); // out of reach
    support.x = 338;
    expect(pickTarget(ranger, [near, support])?.id).toBe('sup');
    expect(pickTarget(ranger, [foe('x', { x: 900 })])).toBeUndefined();
  });
});

describe('reach apart from where she stands', () => {
  it('the Ranger and the Priest have a shot reach that covers a support at the far end of a wave; the Knight has none', () => {
    const ranger = buildHeroCombatant(config('ranger', 'r'), []);
    const priest = buildHeroCombatant(config('priest', 'p'), []);
    const knight = buildHeroCombatant(config('knight', 'k'), []);
    expect(knight.shotReach).toBeUndefined();
    expect(reachOf(knight)).toBe(knight.range);
    // Where they stand is what it was.
    expect(ranger.range).toBe(RANGE.ranged);
    expect(priest.range).toBe(RANGE.caster);
    // The nearest enemy stops (melee reach + 5) from the Knight; the support stops SUPPORT_KIND.range from him.
    const nearest = ENEMY_KINDS.find((k) => k.role === 'soldier')!.range;
    const supportPastNearest = SUPPORT_KIND.range - nearest;
    expect(ranger.shotReach).toBeGreaterThanOrEqual(ranger.range + supportPastNearest);
    expect(priest.shotReach).toBeGreaterThanOrEqual(priest.range + supportPastNearest);
    expect(classDef('ranger').shotReach).toBe(ranger.shotReach);
  });

  /** A full wave met by the full party: where everyone stands once the fight is joined, and who was hit. */
  function joined(withReach: boolean): { xs: Record<string, number>; hitIds: Set<string>; world: WorldState } {
    const heroes = [buildHeroCombatant(config('knight', 'k'), []), buildHeroCombatant(config('ranger', 'r'), []), buildHeroCombatant(config('priest', 'p'), [])];
    for (const h of heroes) {
      h.hp = h.maxHp = 1e9;
      if (!withReach) h.shotReach = undefined;
    }
    const wave = [
      foe('soldier', { enemyRole: 'soldier', x: 400, moveSpeed: 50 }),
      foe('brute', { enemyRole: 'brute', x: 410, moveSpeed: 40 }),
      foe('shooter', { enemyRole: 'shooter', x: 420, moveSpeed: 40, range: RANGE.ranged + 10 }),
      foe('support', { enemyRole: 'support', x: 440, moveSpeed: 40, range: SUPPORT_KIND.range }),
    ];
    const world = fight(heroes, wave);
    const rng = makeRng(9);
    const hitIds = new Set<string>();
    const xs: Record<string, number> = {};
    for (let i = 0; i < 400; i++) {
      for (const ev of resolveCombatTick(world, TICK, rng)) if (ev.type === 'damage' && ev.sourceId !== undefined && ev.sourceId !== 'k') hitIds.add(`${ev.sourceId}>${ev.targetId}`);
    }
    for (const c of [...heroes, ...wave]) xs[c.id] = c.x;
    return { xs, hitIds, world };
  }

  it('they stand exactly where they stood: the nearest enemy away by their own range', () => {
    const now = joined(true);
    const before = joined(false);
    expect(now.xs).toEqual(before.xs); // every hero and every enemy, to the pixel
    // …which is behind the Knight, never further from the nearest enemy than their own range.
    expect(now.xs['r']!).toBeLessThan(now.xs['k']!);
    expect(now.xs['p']!).toBeLessThan(now.xs['r']!);
    expect(now.xs['soldier']! - now.xs['r']!).toBeLessThanOrEqual(RANGE.ranged + 1);
    expect(now.xs['soldier']! - now.xs['p']!).toBeLessThanOrEqual(RANGE.caster + 1);
    // The support at the back is out of where she stands, and inside her shot.
    const toSupport = now.xs['support']! - now.xs['r']!;
    expect(toSupport).toBeGreaterThan(RANGE.ranged);
    expect(toSupport).toBeLessThanOrEqual(reachOf(now.world.heroes[1]!));
  });

  it('with the reach they shoot the support at the back; without it, only what they stand next to', () => {
    const now = joined(true);
    expect(now.hitIds.has('r>support')).toBe(true);
    expect(now.hitIds.has('p>support')).toBe(true);
    // One shot in four goes to the back (data/enemies BACK_LINE_SHOT_PCT); the rest to the front of the wave.
    expect(now.hitIds.has('r>soldier')).toBe(true);
    const before = joined(false);
    expect(before.hitIds.has('r>support')).toBe(false);
    expect(before.hitIds.has('r>soldier')).toBe(true);
  });

  it('she does not shoot before the fight has reached her: an enemy inside her shot but not yet where she stands', () => {
    const ranger = unit({ id: 'r', side: 'hero', x: 0, range: 160, shotReach: 340, baseStats: base({ health: 1e6, attackDamage: 50, attackSpeed: 2 }), hp: 1e6, maxHp: 1e6 });
    const support = foe('sup', { enemyRole: 'support', x: 300, hp: 1000, maxHp: 1000 });
    const world = fight([ranger], [support]);
    const events: CombatEvent[] = [];
    const rng = makeRng(2);
    for (let i = 0; i < 3; i++) events.push(...resolveCombatTick(world, TICK, rng)); // she holds a moment before walking up: no shot meanwhile
    expect(support.x - ranger.x).toBeGreaterThan(ranger.range);
    expect(events.filter((e) => e.type === 'damage')).toEqual([]);
    for (let i = 0; i < 80; i++) events.push(...resolveCombatTick(world, TICK, rng));
    expect(support.x - ranger.x).toBeCloseTo(ranger.range, 0); // …then she walks up to where she stands, as always
    expect(events.some((e) => e.type === 'damage' && e.targetId === 'sup')).toBe(true);
  });
});

describe('the abilities that pick by priority', () => {
  const shooterHero = (key: string, over: Partial<Combatant> = {}): Combatant =>
    unit({ id: 'h', side: 'hero', classKey: 'ranger', x: 0, range: 160, shotReach: 340, baseStats: base({ attackDamage: 100, critChance: 0 }), abilities: [{ def: anyMoment(abilityDef(key)), rank: 1 }], ...over });
  const wave = (): Combatant[] => [
    foe('brute', { enemyRole: 'brute', x: 100, hp: 1000, maxHp: 1000 }),
    foe('soldier', { enemyRole: 'soldier', x: 100, hp: 1000, maxHp: 1000 }),
    foe('shooter', { enemyRole: 'shooter', x: 215, hp: 1000, maxHp: 1000 }),
    foe('support', { enemyRole: 'support', x: 270, hp: 1000, maxHp: 1000 }),
  ];
  const hurt = (enemies: Combatant[]): string[] => enemies.filter((e) => e.hp < e.maxHp).map((e) => e.id);

  it.each(['ranger_aimedshot', 'ranger_weakspot'])('%s goes to the support at the back, then down the order', (key) => {
    const ranger = shooterHero(key);
    ranger.charges = { [key]: 99 };
    const enemies = wave();
    castReadyAbilities(ranger, [ranger], enemies, 30, quietRng(), []);
    expect(hurt(enemies)).toEqual(['support']);
    // With the support gone, the shooter; then the soldier before the brute.
    for (const [gone, next] of [['support', 'shooter'], ['shooter', 'soldier']] as const) {
      const again = shooterHero(key);
      again.charges = { [key]: 99 };
      const left = wave();
      for (const e of left) if (e.id === gone || (gone === 'shooter' && e.id === 'support')) e.alive = false;
      castReadyAbilities(again, [again], left, 30, quietRng(), []);
      expect(hurt(left)).toEqual([next]);
    }
  });

  it('Explosive Arrow ignores the order: it goes where its blast catches the most enemies', () => {
    const ranger = shooterHero('ranger_focus');
    // Brute and soldier stand together (two in the blast); the shooter and the support stand alone further back.
    const enemies = wave();
    castReadyAbilities(ranger, [ranger], enemies, 30, quietRng(), []);
    expect(hurt(enemies).sort()).toEqual(['brute', 'soldier']);
    // A bigger pile at the back wins over a smaller one in front.
    const far = [
      foe('front', { enemyRole: 'soldier', x: 100, hp: 1000, maxHp: 1000 }),
      foe('a', { enemyRole: 'shooter', x: 215, hp: 1000, maxHp: 1000 }),
      foe('b', { enemyRole: 'shooter', x: 220, hp: 1000, maxHp: 1000 }),
      foe('c', { enemyRole: 'shooter', x: 225, hp: 1000, maxHp: 1000 }),
    ];
    const second = shooterHero('ranger_focus');
    castReadyAbilities(second, [second], far, 30, quietRng(), []);
    expect(hurt(far).sort()).toEqual(['a', 'b', 'c']);
    // Among equals: an elite before the rest, then the nearest.
    const ones = [foe('near', { x: 100 }), foe('mid', { x: 180, isElite: true }), foe('back', { x: 260 })];
    expect(biggestCluster(second, ones, 45)?.id).toBe('mid');
    expect(biggestCluster(second, [foe('near', { x: 100 }), foe('back', { x: 260 })], 45)?.id).toBe('near');
    expect(caughtBy(far[2]!, far, 45)).toBe(3);
    // Out of her shot's reach nothing counts as a target.
    expect(biggestCluster(second, [foe('x', { x: 900 }), foe('y', { x: 905 })], 45)).toBeUndefined();
  });

  it("Smite's strike lands on the priority target too", () => {
    const priest = unit({ id: 'p', side: 'hero', classKey: 'priest', x: -35, range: 195, shotReach: 375, baseStats: base({ attackDamage: 100, critChance: 0 }), abilities: [{ def: anyMoment(abilityDef('priest_smite')), rank: 1 }] });
    const ally = unit({ id: 'k', side: 'hero', hp: 500 });
    const enemies = wave();
    castReadyAbilities(priest, [priest, ally], enemies, 30, quietRng(), []);
    expect(hurt(enemies)).toEqual(['support']);
  });

  it('no enemy where she stands yet: the priority abilities wait, like a basic shot', () => {
    const ranger = shooterHero('ranger_weakspot');
    const far = [foe('support', { enemyRole: 'support', x: 300, hp: 1000, maxHp: 1000 })];
    expect(castReadyAbilities(ranger, [ranger], far, 30, quietRng(), [])).toEqual([]);
  });
});

describe('where a basic shot goes (2026-11-18: one in four to the back, the rest to the front)', () => {
  it('every fourth shot goes by the order, evenly — the others at the front of the wave', () => {
    const ranger = unit({ id: 'r', side: 'hero', x: 0, range: 160, shotReach: 340 });
    const front = foe('front', { x: 150, enemyRole: 'soldier' });
    const support = foe('sup', { x: 300, enemyRole: 'support' });
    const picks = Array.from({ length: 12 }, () => shotTarget(ranger, [front, support], front).id);
    expect(picks.filter((id) => id === 'sup')).toHaveLength(3);
    expect(picks.filter((id) => id === 'front')).toHaveLength(9);
    expect(picks.slice(0, 4).filter((id) => id === 'sup')).toHaveLength(1); // spread, not in a burst
  });

  it('a summon a boss sent over the party is shot every time', () => {
    const ranger = unit({ id: 'r', side: 'hero', x: 0, range: 160, shotReach: 340 });
    const front = foe('front', { x: 150 });
    const crow = foe('crow', { x: 40, summon: { key: 'crow', leftMs: 10_000, slot: 0 } });
    for (let i = 0; i < 4; i++) expect(shotTarget(ranger, [front, crow], front).id).toBe('crow');
  });
});

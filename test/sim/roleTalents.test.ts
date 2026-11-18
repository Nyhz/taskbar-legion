import { describe, expect, it } from 'vitest';
import { buildHeroCombatant, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { heroAttack, heroStats, resolveCombatTick } from '@/sim/combat';
import { castReadyAbilities } from '@/sim/abilities';
import { dealtMult, liveStats } from '@/sim/liveStats';
import { createWorld } from '@/sim/Simulation';
import type { Combatant, CombatEvent } from '@/sim/world';
import { base, effect, learned, quietRng, unit } from './_kit';

// Role talents (docs/redesign/CLASSES.md, F4): party auras from a passive node, and bonuses that depend on the
// hero's own life or on who receives the hit or the heal.

const cfg = (id: string, classKey: string, talents: Record<string, number>, level = 60): HeroConfig => ({
  id, classKey, level, equipment: {}, talents, activeAbilities: [],
});

describe('party auras from a passive node', () => {
  it('Vanguard, Warden and Sacred Ward give the WHOLE party their stat, per rank, without taking an ability slot', () => {
    const knight = cfg('k', 'knight', { knight_vanguard: 3, knight_warden: 5 });
    const priest = cfg('p', 'priest', { priest_sacred_ward: 4 });
    expect(partyAuraMods([knight, priest])).toEqual([
      { key: 'damageReduction', mode: 'percent', value: 3 },
      { key: 'health', mode: 'percent', value: 10 },
      { key: 'magicResist', mode: 'percent', value: 6 },
    ]);
    expect(partyAuraMods([cfg('k', 'knight', {})])).toEqual([]);
  });

  it('Warden raises every hero’s max life by 2% per rank, end to end', () => {
    const knight = cfg('k', 'knight', { knight_warden: 5 });
    const ranger = cfg('r', 'ranger', {});
    const plain = buildHeroCombatant(ranger, partyAuraMods([cfg('k', 'knight', {}), ranger]));
    const warded = buildHeroCombatant(ranger, partyAuraMods([knight, ranger]));
    expect(warded.maxHp).toBeCloseTo(plain.maxHp * 1.1, 6);
    const self = buildHeroCombatant(knight, partyAuraMods([knight, ranger]));
    expect(self.maxHp).toBeCloseTo(buildHeroCombatant(knight, []).maxHp * 1.1, 6);
  });

  it('Vanguard cuts the damage every hero takes by 1% per rank', () => {
    const knight = cfg('k', 'knight', { knight_vanguard: 5 });
    const ranger = buildHeroCombatant(cfg('r', 'ranger', {}), partyAuraMods([knight]));
    expect(liveStats(ranger).damageReduction).toBe(5);
  });
});

describe('Vigil (party life regeneration)', () => {
  const party = (priestAlive: boolean): { knight: Combatant; world: ReturnType<typeof createWorld> } => {
    const priest = buildHeroCombatant(cfg('p', 'priest', { priest_vigil: 5 }), []);
    const knight = unit({ id: 'k', side: 'hero', hp: 4000, maxHp: 10000 }); // no regen of his own
    priest.alive = priestAlive;
    return { knight, world: createWorld(1, [knight, priest]) };
  };

  it('every hero regenerates 0.05% of its own max life per second per rank while the priest lives', () => {
    const { knight, world } = party(true);
    for (let i = 0; i < 10; i++) resolveCombatTick(world, 100, quietRng()); // one second
    expect(knight.hp).toBeCloseTo(4000 + 10000 * 0.0025, 6); // 5 ranks × 0.05% = 0.25%/s
  });

  it('stops while she is down', () => {
    const { knight, world } = party(false);
    for (let i = 0; i < 10; i++) resolveCombatTick(world, 100, quietRng());
    expect(knight.hp).toBe(4000);
  });
});

describe('Unyielding (a stat that depends on his own life)', () => {
  it('under 40% of his life the Knight takes 3% less damage per rank; above, nothing', () => {
    const knight = buildHeroCombatant(cfg('k', 'knight', { knight_unyielding: 5 }), []);
    expect(heroStats(knight).damageReduction).toBe(0);
    knight.hp = knight.maxHp * 0.41;
    expect(heroStats(knight).damageReduction).toBe(0);
    knight.hp = knight.maxHp * 0.39;
    expect(heroStats(knight).damageReduction).toBe(15);
    expect(buildHeroCombatant(cfg('k', 'knight', {}), []).lowHpMods).toBeUndefined();
  });

  it('an enemy hit on a low Knight is cut by it', () => {
    const hit = (talents: Record<string, number>): number => {
      const knight = buildHeroCombatant(cfg('k', 'knight', talents), []);
      knight.hp = knight.maxHp * 0.3;
      const before = knight.hp;
      const world = createWorld(1, [knight]);
      world.enemies = [unit({ id: 'e', side: 'enemy', x: 0, range: 1000, enemyDamage: 40, enemyAttackSpeed: 1 })];
      const events: CombatEvent[] = resolveCombatTick(world, 100, quietRng());
      const dmg = events.find((e) => e.type === 'damage' && e.targetId === 'k')?.amount ?? 0;
      expect(before - knight.hp).toBeLessThanOrEqual(dmg);
      return dmg;
    };
    expect(hit({ knight_unyielding: 5 })).toBeCloseTo(hit({}) * 0.85, 6);
  });
});

describe('damage that depends on the target (Ranger)', () => {
  const ranger = (talents: Record<string, number>): Combatant => buildHeroCombatant(cfg('r', 'ranger', talents), []);
  const foe = (over: Partial<Combatant>): Combatant => unit({ id: 'e', side: 'enemy', x: 10, engaged: true, ...over });

  it('Predator: +2% per rank to enemies under 30% of their life', () => {
    const r = ranger({ ranger_predator: 5 });
    expect(dealtMult(r, foe({ hp: 290 }), 'damage')).toBeCloseTo(1.1, 9);
    expect(dealtMult(r, foe({ hp: 310 }), 'damage')).toBe(1);
    expect(dealtMult(r, foe({ hp: 290 }), 'heal')).toBe(1);
  });

  it('Long Shot: +1.5% per rank to enemies that have not reached the fight yet', () => {
    const r = ranger({ ranger_long_shot: 4 });
    expect(dealtMult(r, foe({ engaged: undefined }), 'damage')).toBeCloseTo(1.06, 9);
    expect(dealtMult(r, foe({ engaged: true }), 'damage')).toBe(1);
  });

  it("Hunter's Focus: +2% per rank to elites and bosses", () => {
    const r = ranger({ ranger_hunters_focus: 5 });
    expect(dealtMult(r, foe({ isElite: true }), 'damage')).toBeCloseTo(1.1, 9);
    expect(dealtMult(r, foe({ isBoss: true }), 'damage')).toBeCloseTo(1.1, 9);
    expect(dealtMult(r, foe({}), 'damage')).toBe(1);
  });

  it('they add up on a target that meets several, and a hero without any deals exactly its damage', () => {
    const r = ranger({ ranger_predator: 5, ranger_long_shot: 5, ranger_hunters_focus: 5 });
    expect(dealtMult(r, foe({ hp: 100, engaged: undefined, isBoss: true }), 'damage')).toBeCloseTo(1.275, 9);
    expect(dealtMult(ranger({}), foe({ hp: 100, isBoss: true }), 'damage')).toBe(1);
  });

  it('the bonus lands on auto-attacks, on ability hits and on bleeds', () => {
    const boss = (): Combatant => foe({ isBoss: true, hp: 1e6, maxHp: 1e6 });
    const auto = (talents: Record<string, number>): number => {
      const r = ranger(talents);
      const events: CombatEvent[] = [];
      heroAttack(r, heroStats(r), boss(), [], quietRng(), events);
      return events[0]?.amount ?? 0;
    };
    expect(auto({ ranger_hunters_focus: 5 })).toBeCloseTo(auto({}) * 1.1, 6);

    const cast = (talents: Record<string, number>, key: string): Combatant => {
      const r = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: base({ attackDamage: 100, critChance: 0 }), abilities: [learned('ranger', talents, key)] });
      Object.assign(r, { dealtBonuses: ranger(talents).dealtBonuses, charges: { ranger_aimedshot: 10 } });
      const b = boss();
      castReadyAbilities(r, [r], [b], 1, quietRng(), []);
      return b;
    };
    expect(1e6 - cast({ ranger_aimedshot: 1, ranger_hunters_focus: 5 }, 'ranger_aimedshot').hp).toBeCloseTo(180 * 1.1, 6);
    expect((effect(cast({ ranger_frozentrap: 1, ranger_hunters_focus: 5 }, 'ranger_frozentrap'), 'fx_dot')?.value ?? 0) * 4).toBeCloseTo(60 * 1.1, 6);
  });
});

describe('Triage (heals that depend on the target)', () => {
  it('her heals are 3% stronger per rank on allies under 40% of their life', () => {
    const mend = (talents: Record<string, number>, allyHp: number): number => {
      const priest = unit({ id: 'p', side: 'hero', classKey: 'priest', abilities: [learned('priest', talents, 'priest_mend')] });
      Object.assign(priest, { dealtBonuses: buildHeroCombatant(cfg('p', 'priest', talents), []).dealtBonuses });
      const ally = unit({ id: 'k', side: 'hero', hp: allyHp });
      castReadyAbilities(priest, [priest, ally], [], 1, quietRng(), []);
      return (effect(ally, 'fx_hot')?.value ?? 0) * 12;
    };
    expect(mend({ priest_mend: 1 }, 300)).toBeCloseTo(200, 6);
    expect(mend({ priest_mend: 1, priest_triage: 5 }, 300)).toBeCloseTo(200 * 1.15, 6); // under 40%
    expect(mend({ priest_mend: 1, priest_triage: 5 }, 600)).toBeCloseTo(200, 6); // hurt, but not that low
  });
});

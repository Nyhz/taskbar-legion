import { describe, it, expect } from 'vitest';
import { resolveCombatTick } from '@/sim/combat';
import { createWorld } from '@/sim/Simulation';
import { buildHeroCombatant, resolveUltimate } from '@/sim/loadout';
import { makeRng } from '@/sim/rng';
import { isInvulnerable, vulnerabilityMult } from '@/sim/effects';
import { ultimateForClass, ULTIMATE_UNLOCK_LEVEL } from '@/data/ultimates';
import { talentTree, talentNodes } from '@/data/talents';
import { CLASS_KEYS } from '@/data/classes';
import type { Combatant } from '@/sim/world';

// Class ultimates: off-tree, auto-unlocked at L60, auto-fired by the sim on their
// trigger (Warrior death-block, Priest party enrage, Ranger boss mark).

function enemy(over: Partial<Combatant>): Combatant {
  return {
    id: 'e', side: 'enemy', hp: 1e9, maxHp: 1e9, baseStats: {}, staticMods: [], effects: [],
    cooldowns: {}, attackTimerMs: 0, x: 0, range: 1000, moveSpeed: 0, abilities: [], alive: true,
    enemyDamage: 1e6, enemyAttackSpeed: 1, ...over,
  };
}

function hero(classKey: string, level: number): Combatant {
  return buildHeroCombatant({ id: classKey[0] ?? 'h', classKey, level, equipment: {}, talents: {}, activeAbilities: [] }, []);
}

describe('ultimate unlock', () => {
  it('unlocks only at level 60', () => {
    expect(ultimateForClass('warrior', ULTIMATE_UNLOCK_LEVEL - 1)).toBeUndefined();
    expect(ultimateForClass('warrior', ULTIMATE_UNLOCK_LEVEL)?.effect.type).toBe('deathBlock');
    expect(ultimateForClass('priest', 60)?.effect.type).toBe('partyEnrage');
    expect(ultimateForClass('ranger', 60)?.effect.type).toBe('markVulnerable');
  });

  it('only the death-block ult arms with a per-stage charge', () => {
    expect(resolveUltimate('warrior', 60).ultCharge).toBe(1);
    expect(resolveUltimate('priest', 60).ultCharge).toBe(0);
    expect(resolveUltimate('ranger', 60).ultCharge).toBe(0);
    expect(resolveUltimate('warrior', ULTIMATE_UNLOCK_LEVEL - 1).ult).toBeUndefined();
  });
});

describe('Warrior Last Stand (death-block)', () => {
  it('cancels a lethal blow once per stage: survives, heals, goes invulnerable', () => {
    const w = hero('warrior', 60);
    w.hp = 10; // a sliver — the next hit is lethal
    const world = createWorld(1, [w]);
    world.enemies = [enemy({ x: 0 })];
    resolveCombatTick(world, 100, makeRng(1));
    expect(w.alive).toBe(true); // saved
    expect(w.ultCharge).toBe(0); // charge consumed
    expect(isInvulnerable(w.effects)).toBe(true);
    expect(w.hp).toBeCloseTo(w.maxHp * 0.4, 0); // healed to healFrac
  });

  it('dies normally when the charge is spent', () => {
    const w = hero('warrior', 60);
    w.hp = 10;
    w.ultCharge = 0; // already used this stage
    const world = createWorld(1, [w]);
    world.enemies = [enemy({ x: 0 })];
    resolveCombatTick(world, 100, makeRng(1));
    expect(w.alive).toBe(false);
  });

  it('an invulnerable hero takes no damage from an enemy hit', () => {
    const w = hero('warrior', 60);
    w.hp = 10;
    const world = createWorld(1, [w]);
    world.enemies = [enemy({ x: 0 })];
    resolveCombatTick(world, 100, makeRng(1)); // first hit → death-block + invuln
    const after = w.hp;
    resolveCombatTick(world, 100, makeRng(2)); // second hit lands while invulnerable
    expect(w.alive).toBe(true);
    expect(isInvulnerable(w.effects)).toBe(true);
    expect(w.hp).toBeGreaterThanOrEqual(after); // no damage taken (only hpRegen moves it)
  });
});

describe('boss-engage ultimates (Priest enrage + Ranger mark)', () => {
  it('fire once when a boss is first engaged', () => {
    const priest = hero('priest', 60);
    const ranger = hero('ranger', 60);
    const world = createWorld(1, [priest, ranger]);
    const boss = enemy({ id: 'boss', x: 0, isBoss: true, enemyDamage: 1, range: 1000 });
    world.enemies = [boss];
    resolveCombatTick(world, 100, makeRng(1));

    expect(boss.bossUltTriggered).toBe(true);
    // Ranger marked the boss → it takes +25% damage from all sources.
    expect(vulnerabilityMult(boss.effects)).toBeCloseTo(1.25, 5);
    // Priest enraged the whole party → both heroes carry the CDR + attack-speed buffs.
    for (const h of [priest, ranger]) {
      const cdr = h.effects.find((e) => e.defKey === 'buff_enrage_cdr');
      const as = h.effects.find((e) => e.defKey === 'buff_enrage_as');
      expect(cdr?.value).toBe(25);
      expect(as?.value).toBe(25);
    }
  });
});

describe('reworked talent trees', () => {
  it('each class has exactly 5 abilities, all in rows 1-4', () => {
    for (const k of CLASS_KEYS) {
      const abilityNodes = talentNodes(k).filter((n) => n.kind === 'ability');
      expect(abilityNodes).toHaveLength(5);
      expect(abilityNodes.every((n) => n.rowIndex <= 3)).toBe(true);
      // Row 1 holds two abilities; rows 2-4 one each.
      const tree = talentTree(k);
      expect(tree.rows[0]?.filter((n) => n.kind === 'ability')).toHaveLength(2);
      for (const r of [1, 2, 3]) expect(tree.rows[r]?.filter((n) => n.kind === 'ability')).toHaveLength(1);
    }
  });

  it('every passive node is a percent bonus (rows 5-10 are pure passives)', () => {
    for (const k of CLASS_KEYS) {
      const tree = talentTree(k);
      for (const node of talentNodes(k)) {
        if (node.kind === 'passive') expect(node.passive?.mode).toBe('percent');
      }
      for (const r of [4, 5, 6, 7, 8, 9]) {
        expect(tree.rows[r]?.every((n) => n.kind === 'passive')).toBe(true);
      }
    }
  });
});

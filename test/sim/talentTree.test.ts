import { describe, expect, it } from 'vitest';
import { CLASS_KEYS } from '@/data/classes';
import { ABILITIES } from '@/data/abilities';
import { EFFECTS } from '@/data/effects';
import { CAPSTONE_BRANCH_POINTS, TRUNK, rowUnlockThreshold, talentNodes, talentTree, tryTalentNode } from '@/data/talents';

// The talent TREE as data (docs/redesign/CLASSES.md §2, F1): its shape, its budget and its stable keys.

const ORIGINAL_ABILITIES: Record<string, string[]> = {
  knight: ['knight_guard', 'knight_debilitate', 'knight_bulwark', 'knight_battlecry', 'knight_bloodlust'],
  ranger: ['ranger_fast_fire', 'ranger_aimedshot', 'ranger_multishot', 'ranger_focus', 'ranger_frozentrap'],
  priest: ['priest_mend', 'priest_powerinfusion', 'priest_holyshield', 'priest_nova', 'priest_retribution'],
};

describe('talent tree shape', () => {
  it('ten tiers; the trunk holds the five original abilities (keys unchanged), 8 passives and 3 role talents', () => {
    for (const k of CLASS_KEYS) {
      const tree = talentTree(k);
      expect(tree.rows).toHaveLength(10);
      const trunk = talentNodes(k).filter((n) => n.lane === TRUNK);
      expect(trunk.every((n) => n.rowIndex <= 3)).toBe(true);
      expect(trunk.filter((n) => n.kind === 'ability').map((n) => n.key)).toEqual(ORIGINAL_ABILITIES[k]);
      expect(trunk.filter((n) => n.kind === 'passive')).toHaveLength(8);
      const roles = trunk.filter((n) => n.kind === 'role');
      expect(roles.map((n) => n.rowIndex)).toEqual([1, 2, 3]); // one in each of tiers 2, 3 and 4
      // Tier 1 is the old row 1: two abilities and two passives.
      expect(tree.rows[0]?.map((n) => n.kind)).toEqual(['ability', 'ability', 'passive', 'passive']);
    }
  });

  it('each of the two branches follows the same skeleton from tier 5 to the capstone', () => {
    for (const k of CLASS_KEYS) {
      const tree = talentTree(k);
      expect(tree.branches).toHaveLength(2);
      for (const b of tree.branches) {
        const kinds = (tier: number): string[] => (tree.rows[tier] ?? []).filter((n) => n.lane === b.key).map((n) => n.kind);
        expect(kinds(4)).toEqual(['ability', 'passive']);
        expect(kinds(5)).toEqual(['modifier', 'modifier']);
        expect(kinds(6)).toEqual(['passive', 'passive']);
        expect(kinds(7)).toEqual(['modifier', 'passive']);
        expect(kinds(8)).toEqual(['passive', 'passive']);
        expect(kinds(9)).toEqual(['capstone']);
        const nodes = talentNodes(k).filter((n) => n.lane === b.key);
        const [first, second] = nodes.filter((n) => n.rowIndex === 5);
        // The "choose one" pair: two modifiers of two DIFFERENT trunk abilities.
        expect(first?.chooseGroup).toBeDefined();
        expect(first?.chooseGroup).toBe(second?.chooseGroup);
        expect(first?.modifies).not.toBe(second?.modifies);
        for (const m of [first, second]) expect(ORIGINAL_ABILITIES[k]).toContain(m?.modifies);
        // The tier-8 modifier is the branch ability's own.
        const branchAbility = nodes.find((n) => n.kind === 'ability');
        expect(nodes.find((n) => n.rowIndex === 7 && n.kind === 'modifier')?.modifies).toBe(branchAbility?.key);
        expect(nodes.find((n) => n.kind === 'capstone')?.branchPoints).toBe(CAPSTONE_BRANCH_POINTS);
      }
      // The two capstones exclude each other.
      const caps = talentNodes(k).filter((n) => n.kind === 'capstone');
      expect(caps).toHaveLength(2);
      expect(caps[0]?.chooseGroup).toBeDefined();
      expect(caps[0]?.chooseGroup).toBe(caps[1]?.chooseGroup);
    }
  });

  it('ranks: abilities, passives and role talents have five; modifiers and capstones one', () => {
    for (const k of CLASS_KEYS) {
      for (const n of talentNodes(k)) {
        expect(n.maxRank, n.key).toBe(n.kind === 'modifier' || n.kind === 'capstone' ? 1 : 5);
      }
    }
  });

  it('the budget is the document’s: 126 guaranteed places for 120 points, plus up to two modifiers', () => {
    for (const k of CLASS_KEYS) {
      const nodes = talentNodes(k);
      const ranks = (kind: string, lane?: (l: string) => boolean): number =>
        nodes.filter((n) => n.kind === kind && (lane === undefined || lane(n.lane))).reduce((a, n) => a + n.maxRank, 0);
      const guaranteed = 2 * 5 + ranks('passive', (l) => l === TRUNK) + ranks('role') + ranks('passive', (l) => l !== TRUNK) + 1;
      expect(ranks('passive', (l) => l === TRUNK)).toBe(40);
      expect(ranks('role')).toBe(15);
      expect(ranks('passive', (l) => l !== TRUNK)).toBe(60);
      expect(guaranteed).toBe(126);
    }
  });

  it('every passive node is a percent bonus', () => {
    for (const k of CLASS_KEYS) {
      for (const n of talentNodes(k)) if (n.kind === 'passive') expect(n.passive?.mode, n.key).toBe('percent');
    }
  });

  it('tier 1 keeps the values of the old row 1 (the fresh start does not change)', () => {
    const value = (classKey: string, key: string): unknown => tryTalentNode(classKey, key)?.passive;
    expect(value('knight', 'knight_t1_health')).toEqual({ stat: 'health', mode: 'percent', valuePerRank: 2 });
    expect(value('knight', 'knight_t1_armor')).toEqual({ stat: 'armor', mode: 'percent', valuePerRank: 2.5 });
    expect(value('ranger', 'ranger_t1_attackDamage')).toEqual({ stat: 'attackDamage', mode: 'percent', valuePerRank: 3 });
    expect(value('ranger', 'ranger_t1_attackSpeed')).toEqual({ stat: 'attackSpeed', mode: 'percent', valuePerRank: 1.5 });
    expect(value('priest', 'priest_t1_healPower')).toEqual({ stat: 'healPower', mode: 'percent', valuePerRank: 3 });
    expect(value('priest', 'priest_t1_health')).toEqual({ stat: 'health', mode: 'percent', valuePerRank: 2 });
  });
});

describe('talent node keys', () => {
  it('are unique across the whole game, carry their class, and never encode a position in a row', () => {
    const all = CLASS_KEYS.flatMap((k) => talentNodes(k).map((n) => ({ k, key: n.key })));
    expect(new Set(all.map((n) => n.key)).size).toBe(all.length);
    for (const n of all) {
      expect(n.key.startsWith(`${n.k}_`), n.key).toBe(true);
      expect(n.key, n.key).not.toMatch(/_r\d+_s\d+$/); // the old positional scheme
    }
  });

  it('a lookup of an unknown key or class answers undefined instead of throwing', () => {
    expect(tryTalentNode('knight', 'knight_r4_s0')).toBeUndefined();
    expect(tryTalentNode('mage', 'knight_guard')).toBeUndefined();
    expect(tryTalentNode('knight', 'knight_guard')?.kind).toBe('ability');
  });

  it('every ability, effect and modifier target a node names exists in the data', () => {
    for (const k of CLASS_KEYS) {
      for (const n of talentNodes(k)) {
        if (n.abilityKey !== undefined) expect(ABILITIES[n.abilityKey], n.key).toBeDefined();
        if (n.modifies !== undefined) expect(tryTalentNode(k, n.modifies)?.kind, n.key).toBe('ability');
        const effectKeys = [
          ...(n.patch?.addApplies ?? []).map((a) => a.effectKey),
          ...(n.patch?.effects ?? []).map((e) => e.effectKey),
          ...(n.patch?.mirror ?? []).map((m) => m.effectKey),
          ...[...(n.triggers ?? []), ...(n.ult?.addTriggers ?? [])].flatMap((t) => t.actions).flatMap((a) => (a.do === 'apply' ? [a.effectKey] : a.do === 'extend' ? [...a.effectKeys] : [])),
          ...(n.ult?.addActions ?? []).flatMap((a) => (a.do === 'apply' ? [a.effectKey] : [])),
        ];
        for (const e of effectKeys) expect(EFFECTS[e], `${n.key} → ${e}`).toBeDefined();
      }
    }
    for (const a of Object.values(ABILITIES)) for (const ap of a.applies) expect(EFFECTS[ap.effectKey], a.key).toBeDefined();
  });

  it('tier N opens at (N−1)·10 points spent', () => {
    expect([0, 1, 4, 9].map(rowUnlockThreshold)).toEqual([0, 10, 40, 90]);
  });
});

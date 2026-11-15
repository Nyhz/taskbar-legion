import { describe, expect, it } from 'vitest';
import { branchName, nodeRequirementLines, roleValue, spendBlockLine } from '@/sim/talentText';
import { canSpend } from '@/sim/talentRules';
import { talentNodes, tryTalentNode } from '@/data/talents';
import { CLASS_KEYS } from '@/data/classes';

// The English lines the talent tooltips show (until the class kits get their dictionaries).

describe('talent lines', () => {
  it('says in words why a node cannot be raised, naming what is in the way', () => {
    const line = (talents: Record<string, number>, key: string, points = 5): string => {
      const c = canSpend('knight', talents, points, key);
      return c.ok ? 'ok' : spendBlockLine('knight', c, tryTalentNode('knight', key));
    };
    expect(line({}, 'knight_bulwark')).toBe('Opens at 10 points spent.');
    expect(line({}, 'knight_guard', 0)).toBe('No talent points to spend.');
    const trunk = Object.fromEntries(talentNodes('knight').filter((n) => n.lane === 'trunk' && n.kind !== 'ability').map((n) => [n.key, 5]));
    const build = { ...trunk, knight_guard: 5, knight_bulwark: 5 };
    expect(line(build, 'knight_riposte')).toMatch(/^Already has 2 abilities/);
    expect(line(build, 'knight_mod_crippling_cleave')).toBe('Needs Debilitating Cleave.');
    expect(line({ ...build, knight_mod_shared_skin: 1 }, 'knight_mod_mending_bulwark')).toBe('Choose one: Shared Skin is already taken.');
    const deep = { ...build, knight_bastion_t5_magicResist: 5, knight_bastion_t7_armor: 5, knight_bastion_t7_health: 5, knight_bastion_t8_block: 5, knight_scourge_t5_block: 5 }; // 90 spent
    expect(line(deep, 'knight_cap_living_wall')).toBe('Needs 25 points in Bastion (has 20).');
    expect(line(deep, 'knight_cap_vengeance')).toBe('Needs 25 points in Scourge (has 5).');
    expect(spendBlockLine('knight', { reason: 'needsAbility', abilityKey: 'gone_ability' })).toBe('Needs gone_ability.');
  });

  it('every branch node knows its branch’s name, and every role talent its value per rank', () => {
    for (const c of CLASS_KEYS) {
      for (const n of talentNodes(c)) {
        if (n.lane === 'trunk') expect(branchName(c, n)).toBeUndefined();
        else expect(branchName(c, n)).toMatch(/^[A-Z][a-z]+$/);
        if (n.role !== undefined) expect(roleValue(n.role).perRank).toBeGreaterThan(0);
      }
    }
    const req = (key: string): string[] => {
      const n = tryTalentNode('ranger', key);
      return n === undefined ? ['?'] : nodeRequirementLines('ranger', n);
    };
    expect(req('ranger_cap_killing_field')).toEqual(['Needs 25 points in Stalker. Only one capstone.']);
    expect(req('ranger_mod_heartseeker')).toEqual(['Choose one of the pair.']);
    expect(req('ranger_mod_open_wound')).toEqual([]);
    const vigil = tryTalentNode('priest', 'priest_vigil')?.role;
    expect(vigil === undefined ? undefined : roleValue(vigil)).toEqual({ perRank: 0.05, unit: ' %/s' });
  });
});

import { describe, expect, it } from 'vitest';
import { nodeBranch, nodeRequirement, roleValue } from '@/sim/talentFacts';
import { talentNodes, tryTalentNode } from '@/data/talents';
import { CLASS_KEYS } from '@/data/classes';

// What the talent tooltips need as data (the wording is the interface's: test/ui/talentWords.test.ts).

describe('talent facts', () => {
  it('every branch node knows its branch, and every role talent its value per rank', () => {
    for (const c of CLASS_KEYS) {
      for (const n of talentNodes(c)) {
        if (n.lane === 'trunk') expect(nodeBranch(c, n)).toBeUndefined();
        else expect(nodeBranch(c, n)?.key).toBe(n.lane);
        if (n.role !== undefined) expect(roleValue(n.role).perRank).toBeGreaterThan(0);
      }
    }
    const vigil = tryTalentNode('priest', 'priest_vigil')?.role;
    expect(vigil === undefined ? undefined : roleValue(vigil)).toEqual({ perRank: 0.05, unit: 'percentPerSecond' });
  });

  it('a capstone asks for points in its branch, a paired modifier is a choice, the rest ask for nothing', () => {
    const req = (key: string): unknown => {
      const n = tryTalentNode('ranger', key);
      return n === undefined ? '?' : nodeRequirement('ranger', n);
    };
    expect(req('ranger_cap_killing_field')).toEqual({ type: 'capstone', points: 25, branch: { key: 'stalker', name: 'Stalker' } });
    expect(req('ranger_mod_heartseeker')).toEqual({ type: 'chooseOne' });
    expect(req('ranger_mod_open_wound')).toBeUndefined();
    expect(req('ranger_predator')).toBeUndefined();
  });
});

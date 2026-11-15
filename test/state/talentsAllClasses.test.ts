import { describe, expect, it } from 'vitest';
import { useStore } from '@/state/store';
import type { HeroState } from '@/persistence/saveSchema';
import { CLASS_KEYS } from '@/data/classes';
import { TRUNK, talentTree, type TalentNode } from '@/data/talents';
import { canSpend, spentPoints } from '@/sim/talentRules';

// Every rule of the tree, through the store's own actions, for EACH class — written against the shape of the
// tree (tiers, lanes, kinds), not against node keys, so a class added later is covered the day it gets a tree.

const hero = (classKey: string, over?: Partial<HeroState>): HeroState => ({
  id: 'h0', classKey, level: 120, exp: 0, equipment: {}, talentPoints: 120, talents: {}, activeAbilities: [], loadouts: [null, null], ...over,
});
const reset = (classKey: string, over?: Partial<HeroState>): void =>
  useStore.setState({ roster: [hero(classKey, over)], selectedHeroId: 'h0', unlockedClasses: [...CLASS_KEYS] });
const h = (): HeroState => useStore.getState().roster[0] as HeroState;
const spend = (key: string, times = 1): boolean => {
  let all = true;
  for (let i = 0; i < times; i++) all = useStore.getState().spendTalent('h0', key) && all;
  return all;
};
const refund = (key: string): boolean => useStore.getState().refundTalent('h0', key);
const why = (key: string): string => {
  const c = canSpend(h().classKey, h().talents, h().talentPoints, key);
  return c.ok ? 'ok' : c.reason;
};
const need = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(`the tree has no ${what}`);
  return value;
};

/** The pieces of a class's tree the rules talk about. */
function shape(classKey: string) {
  const tree = talentTree(classKey);
  const row = (i: number): TalentNode[] => tree.rows[i] ?? [];
  const trunk = tree.rows.flat().filter((n) => n.lane === TRUNK);
  const tier1 = row(0).filter((n) => n.kind === 'ability');
  const [first, second] = [need(tier1[0], 'first tier-1 ability'), need(tier1[1], 'second tier-1 ability')];
  const branch = need(tree.branches[0], 'branch').key;
  const other = need(tree.branches[1], 'second branch').key;
  const inBranch = (n: TalentNode): boolean => n.lane === branch;
  const modifiers = tree.rows.flat().filter((n) => n.kind === 'modifier');
  return {
    first,
    second,
    third: need(row(1).find((n) => n.kind === 'ability'), 'tier-2 ability'),
    /** Trunk nodes that are not abilities, tier by tier (55 points). */
    trunkPassives: trunk.filter((n) => n.kind !== 'ability'),
    /** A modifier of an ability the build learns, its "choose one" partner, and one of an ability it lacks. */
    mod: need(modifiers.find((n) => n.modifies === first.key || n.modifies === second.key), 'modifier of a tier-1 ability'),
    orphan: need(modifiers.find((n) => n.modifies !== first.key && n.modifies !== second.key), 'modifier of another ability'),
    branchPassives: tree.rows.flat().filter((n) => inBranch(n) && n.kind === 'passive'),
    capstone: need(tree.rows.flat().find((n) => inBranch(n) && n.kind === 'capstone'), 'capstone'),
    otherCapstone: need(tree.rows.flat().find((n) => n.lane === other && n.kind === 'capstone'), 'second capstone'),
    branchAbility: need(tree.rows.flat().find((n) => inBranch(n) && n.kind === 'ability'), 'branch ability'),
  };
}

describe.each(CLASS_KEYS)('the talent rules through the store — %s', (classKey) => {
  const s = shape(classKey);
  const partner = (): TalentNode =>
    need(talentTree(classKey).rows.flat().find((n) => n.chooseGroup !== undefined && n.chooseGroup === s.mod.chooseGroup && n.key !== s.mod.key), 'choose-one partner');

  /** Both tier-1 abilities and the whole trunk: 65 points. */
  const buildTrunk = (): void => {
    expect(spend(s.first.key, 5)).toBe(true);
    expect(spend(s.second.key, 5)).toBe(true);
    for (const n of s.trunkPassives) expect(spend(n.key, n.maxRank)).toBe(true);
    expect(spentPoints(h().talents)).toBe(65);
  };

  it('a closed tier refuses; a full node refuses; spending moves the point and makes the ability active', () => {
    reset(classKey);
    expect(why(s.third.key)).toBe('tierLocked');
    expect(spend(s.third.key)).toBe(false);
    expect(h().talents).toEqual({});
    expect(spend(s.first.key)).toBe(true);
    expect(h().talents).toEqual({ [s.first.key]: 1 });
    expect(h().talentPoints).toBe(119);
    expect(h().activeAbilities).toEqual([s.first.key]);
    expect(spend(s.first.key, 4)).toBe(true);
    expect(why(s.first.key)).toBe('maxRank');
    expect(spend(s.first.key)).toBe(false);
    expect(h().talentPoints).toBe(115);
  });

  it('the third ability is refused, in the trunk and in a branch; giving one back frees the place', () => {
    reset(classKey);
    buildTrunk();
    expect(why(s.third.key)).toBe('abilityCap');
    expect(why(s.branchAbility.key)).toBe('abilityCap');
    expect(spend(s.third.key)).toBe(false);
    expect(spend(s.branchAbility.key)).toBe(false);
    expect(h().activeAbilities).toEqual([s.first.key, s.second.key]);
    for (let i = 0; i < 5; i++) expect(refund(s.second.key)).toBe(true);
    expect(h().activeAbilities).toEqual([s.first.key]);
    expect(h().talentPoints).toBe(120 - 60);
    expect(spend(s.third.key)).toBe(true);
    expect(h().activeAbilities).toEqual([s.first.key, s.third.key]);
  });

  it('a modifier needs its ability, excludes its partner, and comes back with its ability’s last point', () => {
    reset(classKey);
    buildTrunk();
    expect(why(s.orphan.key)).toBe('needsAbility');
    expect(spend(s.orphan.key)).toBe(false);
    expect(spend(s.mod.key)).toBe(true);
    expect(why(s.mod.key)).toBe('maxRank');
    // Its partner in the pair: refused for the pair when its own ability is learned, for the ability otherwise.
    const p = partner();
    expect(spend(p.key)).toBe(false);
    expect(why(p.key)).toBe(p.modifies === s.first.key || p.modifies === s.second.key ? 'chooseOne' : 'needsAbility');
    // 66 spent. Four ranks out of the modified ability: the modifier stays.
    const ability = need(s.mod.modifies, 'modified ability');
    for (let i = 0; i < 4; i++) expect(refund(ability)).toBe(true);
    expect(h().talents[s.mod.key]).toBe(1);
    const before = h().talentPoints;
    // The last rank: the modifier's point comes back with it, and the ability leaves the active set.
    expect(refund(ability)).toBe(true);
    expect(h().talents[ability]).toBeUndefined();
    expect(h().talents[s.mod.key]).toBeUndefined();
    expect(h().talentPoints).toBe(before + 2);
    expect(h().activeAbilities).not.toContain(ability);
    expect(h().talentPoints + spentPoints(h().talents)).toBe(120);
  });

  it('the capstone: refused early, taken with 25 points in its branch at tier 10, and then the other is refused', () => {
    reset(classKey);
    buildTrunk();
    expect(why(s.capstone.key)).toBe('tierLocked');
    // Four branch passives: 20 points in the branch, 85 spent.
    for (const n of s.branchPassives.slice(0, 4)) expect(spend(n.key, 5)).toBe(true);
    expect(why(s.capstone.key)).toBe('tierLocked');
    expect(spend(s.capstone.key)).toBe(false);
    // 90 spent with only 20 in the branch: the tier is open, the branch is short.
    reset(classKey);
    buildTrunk();
    const otherPassives = talentTree(classKey).rows.flat().filter((n) => n.lane === s.otherCapstone.lane && n.kind === 'passive');
    expect(otherPassives.length).toBeGreaterThan(0);
    for (const n of s.branchPassives.slice(0, 4)) expect(spend(n.key, 5)).toBe(true);
    expect(spend(need(otherPassives[0], 'passive in the other branch').key, 5)).toBe(true);
    expect(spentPoints(h().talents)).toBe(90);
    expect(why(s.capstone.key)).toBe('branchPoints');
    expect(spend(s.capstone.key)).toBe(false);
    expect(spend(need(s.branchPassives[4], 'fifth branch passive').key, 5)).toBe(true); // 25 in the branch
    expect(spend(s.capstone.key)).toBe(true);
    expect(h().talents[s.capstone.key]).toBe(1);
    expect(why(s.otherCapstone.key)).toBe('chooseOne');
    expect(spend(s.otherCapstone.key)).toBe(false);
    // The branch points under the capstone cannot be taken out.
    expect(refund(need(s.branchPassives[0], 'branch passive').key)).toBe(false);
    expect(refund(s.capstone.key)).toBe(true);
  });

  it('respec gives every point back; a preset restores the build', () => {
    reset(classKey);
    buildTrunk();
    expect(spend(s.mod.key)).toBe(true);
    const built = { ...h().talents };
    const active = [...h().activeAbilities];
    useStore.getState().saveLoadout('h0', 0);
    useStore.getState().respec('h0');
    expect(h().talents).toEqual({});
    expect(h().activeAbilities).toEqual([]);
    expect(h().talentPoints).toBe(120);
    useStore.getState().applyLoadout('h0', 0);
    expect(h().talents).toEqual(built);
    expect(h().activeAbilities).toEqual(active);
    expect(h().talentPoints).toBe(120 - 66);
  });

  it('switching class gives every spent point back', () => {
    reset(classKey);
    buildTrunk();
    const to = need(CLASS_KEYS.find((k) => k !== classKey), 'another class');
    useStore.getState().switchClass('h0', to);
    expect(h().classKey).toBe(to);
    expect(h().talents).toEqual({});
    expect(h().activeAbilities).toEqual([]);
    expect(h().talentPoints).toBe(120);
  });
});

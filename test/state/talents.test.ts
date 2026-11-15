import { describe, expect, it } from 'vitest';
import { useStore } from '@/state/store';
import type { HeroState } from '@/persistence/saveSchema';

// The store's talent actions on the redesigned tree: spend, refund, respec and presets keep their names and
// go through sim/talentRules.

const hero = (over?: Partial<HeroState>): HeroState => ({
  id: 'h0', classKey: 'knight', level: 120, exp: 0, equipment: {}, talentPoints: 120, talents: {}, activeAbilities: [], loadouts: [null, null], ...over,
});
const reset = (over?: Partial<HeroState>): void => useStore.setState({ roster: [hero(over)], selectedHeroId: 'h0' });
const h = (): HeroState => useStore.getState().roster[0] as HeroState;
const spend = (key: string, times = 1): boolean[] => Array.from({ length: times }, () => useStore.getState().spendTalent('h0', key));

describe('spendTalent / refundTalent / respec', () => {
  it('a new hero spends its one point on a tier-1 node; learning an ability makes it active', () => {
    reset({ level: 1, talentPoints: 1 });
    expect(spend('knight_bulwark')).toEqual([false]); // tier 2 is closed
    expect(spend('knight_guard')).toEqual([true]);
    expect(h().talents).toEqual({ knight_guard: 1 });
    expect(h().activeAbilities).toEqual(['knight_guard']);
    expect(h().talentPoints).toBe(0);
    expect(spend('knight_guard')).toEqual([false]); // no points left
  });

  it('the third ability is refused; giving one back opens the place again', () => {
    reset();
    spend('knight_guard', 5);
    spend('knight_debilitate', 5);
    expect(spend('knight_bulwark')).toEqual([false]);
    expect(h().activeAbilities).toEqual(['knight_guard', 'knight_debilitate']);
    for (let i = 0; i < 5; i++) expect(useStore.getState().refundTalent('h0', 'knight_debilitate')).toBe(true);
    expect(h().activeAbilities).toEqual(['knight_guard']);
    spend('knight_t1_health', 5); // 10 spent: tier 2 opens
    expect(spend('knight_bulwark')).toEqual([true]);
    expect(h().activeAbilities).toEqual(['knight_guard', 'knight_bulwark']);
  });

  it('a modifier is bought with its ability and comes back with it', () => {
    reset();
    spend('knight_guard', 5);
    spend('knight_debilitate', 5);
    for (const key of ['knight_t1_health', 'knight_t1_armor', 'knight_t2_health', 'knight_t2_block', 'knight_t3_armor', 'knight_t3_magicResist']) spend(key, 5);
    expect(spend('knight_mod_shared_skin')).toEqual([false]); // 40 spent: tier 6 opens at 50
    for (const key of ['knight_t4_health', 'knight_t4_block', 'knight_vanguard']) spend(key, 5); // 55 spent
    expect(spend('knight_mod_mending_bulwark')).toEqual([false]); // Bulwark is not learned
    expect(spend('knight_mod_shared_skin')).toEqual([true]);
    expect(spend('knight_mod_shared_skin')).toEqual([false]); // one rank
    const before = h().talentPoints;
    for (let i = 0; i < 4; i++) expect(useStore.getState().refundTalent('h0', 'knight_guard')).toBe(true);
    expect(h().talents.knight_mod_shared_skin).toBe(1); // Stone Skin still has a point
    expect(useStore.getState().refundTalent('h0', 'knight_guard')).toBe(true);
    expect(h().talents.knight_guard).toBeUndefined();
    expect(h().talents.knight_mod_shared_skin).toBeUndefined();
    expect(h().talentPoints).toBe(before + 5 + 1); // five ranks and the modifier's point
    expect(h().activeAbilities).toEqual(['knight_debilitate']);
    // 50 spent now, and tier 6 opens at 50: one more point out would leave nothing stranded only because the
    // modifier went with its ability.
    expect(useStore.getState().refundTalent('h0', 'knight_vanguard')).toBe(true);
  });

  it('a whole build to the capstone: 25 points in the branch, then one capstone only', () => {
    reset();
    spend('knight_guard', 5);
    spend('knight_debilitate', 5);
    const trunk = ['knight_t1_health', 'knight_t1_armor', 'knight_t2_health', 'knight_t2_block', 'knight_t3_armor', 'knight_t3_magicResist', 'knight_t4_health', 'knight_t4_block', 'knight_vanguard', 'knight_unyielding', 'knight_warden'];
    for (const key of trunk) expect(spend(key, 5).every(Boolean), key).toBe(true);
    expect(spend('knight_cap_living_wall')).toEqual([false]); // 65 spent: tier 10 opens at 90
    for (const key of ['knight_bastion_t5_magicResist', 'knight_bastion_t7_armor', 'knight_bastion_t7_health', 'knight_bastion_t8_block', 'knight_bastion_t9_health']) spend(key, 5);
    expect(h().talentPoints).toBe(120 - 90);
    expect(spend('knight_cap_living_wall')).toEqual([true]);
    expect(spend('knight_cap_vengeance')).toEqual([false]);
    // The capstone's branch points cannot be pulled from under it.
    expect(useStore.getState().refundTalent('h0', 'knight_bastion_t9_health')).toBe(false);
    expect(useStore.getState().refundTalent('h0', 'knight_cap_living_wall')).toBe(true);
    expect(useStore.getState().refundTalent('h0', 'knight_bastion_t9_health')).toBe(true);
  });

  it('respec gives every point back, for free', () => {
    reset();
    spend('knight_guard', 5);
    spend('knight_t1_health', 5);
    const gold = useStore.getState().gold;
    useStore.getState().respec('h0');
    expect(h().talents).toEqual({});
    expect(h().talentPoints).toBe(120);
    expect(h().activeAbilities).toEqual([]);
    expect(useStore.getState().gold).toBe(gold);
  });

  it('applying a preset saved against another tree trims it to what the tree accepts, losing no point', () => {
    reset({ level: 30, talentPoints: 30 });
    useStore.setState((s) => ({
      roster: s.roster.map((x) => ({
        ...x,
        loadouts: [{ classKey: 'knight', talents: { knight_guard: 5, knight_bulwark: 5, knight_battlecry: 5, knight_r4_s0: 5 }, activeAbilities: ['knight_bulwark', 'knight_gone'] }, null],
      })),
    }));
    useStore.getState().applyLoadout('h0', 0);
    expect(h().talents).toEqual({ knight_guard: 5, knight_bulwark: 5 });
    expect(h().activeAbilities).toEqual(['knight_bulwark', 'knight_guard']);
    expect(h().talentPoints).toBe(20);
  });
});

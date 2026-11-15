import { describe, expect, it } from 'vitest';
import {
  MAX_ACTIVE_ABILITIES,
  branchPoints,
  canSpend,
  learnedAbilityNodes,
  refundOne,
  sanitizeTalents,
  spentPoints,
} from '@/sim/talentRules';
import { talentNodes } from '@/data/talents';
import { CLASS_KEYS } from '@/data/classes';

// The rules of the talent tree (docs/redesign/CLASSES.md §2, F1): what can be bought, what can be given back,
// and what a save is trimmed to.

const reason = (classKey: string, talents: Record<string, number>, key: string, points = 99): string => {
  const c = canSpend(classKey, talents, points, key);
  return c.ok ? 'ok' : c.reason;
};

/** The whole Knight trunk with Stone Skin + Cleave: 10 + 40 + 15 = 65 points. */
const TRUNK: Record<string, number> = {
  knight_guard: 5, knight_debilitate: 5,
  knight_t1_health: 5, knight_guardian: 5, knight_t2_health: 5, knight_t2_block: 5,
  knight_t3_armor: 5, knight_t3_magicResist: 5, knight_t4_health: 5, knight_t4_block: 5,
  knight_vanguard: 5, knight_unyielding: 5, knight_warden: 5,
};
/** Bastion's six passives (30 points) on top of the trunk: 95 spent. */
const BASTION: Record<string, number> = {
  ...TRUNK,
  knight_bastion_t5_magicResist: 5, knight_close_ranks: 5, knight_bastion_t7_health: 5,
  knight_bastion_t8_block: 5, knight_shelter: 5, knight_bastion_t9_damageReduction: 5,
};

describe('canSpend', () => {
  it('a fresh hero can buy any tier-1 node, and nothing above it', () => {
    for (const key of ['knight_guard', 'knight_debilitate', 'knight_t1_health', 'knight_guardian']) {
      expect(reason('knight', {}, key, 1)).toBe('ok');
    }
    const c = canSpend('knight', {}, 1, 'knight_bulwark');
    expect(c).toEqual({ ok: false, reason: 'tierLocked', need: 10 });
    expect(reason('knight', {}, 'knight_cap_living_wall')).toBe('tierLocked');
  });

  it('says there are no points only when nothing else is in the way', () => {
    expect(reason('knight', {}, 'knight_guard', 0)).toBe('noPoints');
    expect(reason('knight', {}, 'knight_bulwark', 0)).toBe('tierLocked');
    expect(reason('knight', { knight_guard: 5 }, 'knight_guard', 3)).toBe('maxRank');
    expect(reason('knight', {}, 'no_such_node')).toBe('unknownNode');
    expect(reason('mage', {}, 'knight_guard')).toBe('unknownNode');
  });

  it('only two different abilities may hold points; ranking a learned one further is free', () => {
    const two = { knight_guard: 5, knight_debilitate: 5, knight_t1_health: 5, knight_guardian: 5 };
    expect(MAX_ACTIVE_ABILITIES).toBe(2);
    expect(canSpend('knight', two, 5, 'knight_bulwark')).toEqual({ ok: false, reason: 'abilityCap', max: 2 });
    expect(reason('knight', { ...two, knight_guard: 3 }, 'knight_guard')).toBe('ok');
    expect(reason('knight', two, 'knight_t2_health')).toBe('ok');
    // The branch abilities count too: with two learned, the tier-5 ability stays closed.
    expect(reason('knight', BASTION, 'knight_holdtheline')).toBe('abilityCap');
  });

  it('a modifier needs its ability learned', () => {
    expect(reason('knight', BASTION, 'knight_mod_shared_skin')).toBe('ok'); // Stone Skin is learned
    expect(canSpend('knight', BASTION, 5, 'knight_mod_mending_bulwark')).toEqual({ ok: false, reason: 'needsAbility', abilityKey: 'knight_bulwark' });
    expect(reason('knight', BASTION, 'knight_mod_standard_bearer')).toBe('needsAbility'); // Hold the Line is not
  });

  it('a "choose one" pair takes a single point between the two', () => {
    const both = { ...TRUNK, knight_debilitate: 0, knight_bulwark: 5 }; // Stone Skin + Bulwark: both modifiers apply
    delete (both as Record<string, number>).knight_debilitate;
    expect(reason('knight', both, 'knight_mod_shared_skin')).toBe('ok');
    expect(reason('knight', both, 'knight_mod_mending_bulwark')).toBe('ok');
    const taken = { ...both, knight_mod_shared_skin: 1 };
    expect(canSpend('knight', taken, 5, 'knight_mod_mending_bulwark')).toEqual({ ok: false, reason: 'chooseOne', otherKey: 'knight_mod_shared_skin' });
  });

  it('a capstone needs tier 10 and 25 points in its own branch, and excludes the other capstone', () => {
    // 95 spent (tier 10 is open) and 30 in Bastion, none in Scourge.
    expect(branchPoints('knight', BASTION, 'bastion')).toBe(30);
    expect(reason('knight', BASTION, 'knight_cap_living_wall')).toBe('ok');
    expect(canSpend('knight', BASTION, 5, 'knight_cap_vengeance')).toEqual({ ok: false, reason: 'branchPoints', need: 25, have: 0 });
    // With 25 in each branch the second capstone is still refused: choose one.
    const split = {
      ...BASTION, knight_bastion_t9_damageReduction: 0,
      knight_scourge_t5_block: 5, knight_weathered_hide: 5, knight_scourge_t7_lifesteal: 5, knight_scourge_t8_armor: 5, knight_scourge_t9_attackDamage: 5,
      knight_cap_living_wall: 1,
    };
    expect(branchPoints('knight', split, 'bastion')).toBe(25);
    expect(branchPoints('knight', split, 'scourge')).toBe(25);
    expect(canSpend('knight', split, 5, 'knight_cap_vengeance')).toEqual({ ok: false, reason: 'chooseOne', otherKey: 'knight_cap_living_wall' });
  });
});

describe('refundOne', () => {
  it('gives one point back, and refuses when a ranked node would be left in a closed tier', () => {
    const t = { knight_guard: 5, knight_t1_health: 5, knight_bulwark: 1 }; // 11 spent; tier 2 needs 10
    const ok = refundOne('knight', t, 'knight_bulwark');
    expect(ok.ok && ok.talents).toEqual({ knight_guard: 5, knight_t1_health: 5 });
    expect(ok.ok && ok.refunded).toBe(1);
    expect(refundOne('knight', t, 'knight_t1_health').ok).toBe(true); // 10 left: tier 2 still open
    const tight = { knight_guard: 5, knight_t1_health: 5, knight_t2_block: 1 }; // tier 2 holds a point at 11 spent
    expect(refundOne('knight', { ...tight, knight_t1_health: 4 }, 'knight_t1_health')).toEqual({ ok: false, reason: 'tierStranded', nodeKey: 'knight_t2_block' });
    expect(refundOne('knight', t, 'knight_t3_armor')).toEqual({ ok: false, reason: 'notRanked' });
    expect(refundOne('knight', t, 'nope')).toEqual({ ok: false, reason: 'unknownNode' });
  });

  it('taking the last point out of an ability gives its modifier back with it', () => {
    const t = { ...BASTION, knight_guard: 1, knight_mod_shared_skin: 1 };
    const r = refundOne('knight', t, 'knight_guard');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.refunded).toBe(2); // the ability's point and the modifier's
    expect(r.talents.knight_guard).toBeUndefined();
    expect(r.talents.knight_mod_shared_skin).toBeUndefined();
    // Dropping a rank that is not the last keeps the modifier.
    const keep = refundOne('knight', { ...t, knight_guard: 2 }, 'knight_guard');
    expect(keep.ok && keep.talents.knight_mod_shared_skin).toBe(1);
  });

  it('the capstone keeps its branch points: they cannot be taken out from under it', () => {
    const t = { ...BASTION, knight_bastion_t9_damageReduction: 0, knight_cap_living_wall: 1 }; // exactly 25 in Bastion
    expect(refundOne('knight', t, 'knight_bastion_t5_magicResist')).toEqual({ ok: false, reason: 'capstoneStranded', nodeKey: 'knight_cap_living_wall' });
    expect(refundOne('knight', t, 'knight_cap_living_wall').ok).toBe(true);
  });
});

describe('sanitizeTalents (old or damaged saves)', () => {
  it('drops unknown keys and gives their points back', () => {
    const old = { knight_guard: 3, knight_r0_s2: 5, knight_r4_s0: 5, warrior_slam: 2 };
    const out = sanitizeTalents('knight', old, 20, ['knight_guard']);
    expect(out.talents).toEqual({ knight_guard: 3 });
    expect(out.talentPoints).toBe(17); // 20 earned − 3 still validly spent
  });

  it('keeps the first two abilities when three hold points — the active ones first', () => {
    const three = { knight_guard: 2, knight_debilitate: 2, knight_bulwark: 2, knight_t1_health: 5, knight_guardian: 5 };
    const byTree = sanitizeTalents('knight', three, 30);
    expect(learnedAbilityNodes('knight', byTree.talents).map((n) => n.key)).toEqual(['knight_guard', 'knight_debilitate']);
    expect(byTree.talentPoints).toBe(30 - 14);
    const byActive = sanitizeTalents('knight', three, 30, ['knight_bulwark', 'knight_guard']);
    expect(learnedAbilityNodes('knight', byActive.talents).map((n) => n.key)).toEqual(['knight_guard', 'knight_bulwark']);
  });

  it('an ability left out for the cap takes the place of a chosen one that the other rules drop', () => {
    // Bulwark (tier 2) is preferred, but with 7 points spent its tier is closed: Cleave, cut for the cap, stays.
    const few = sanitizeTalents('knight', { knight_guard: 2, knight_bulwark: 5, knight_debilitate: 5 }, 120, ['knight_bulwark', 'knight_guard']);
    expect(few.talents).toEqual({ knight_guard: 2, knight_debilitate: 5 });
    expect(few.talentPoints).toBe(113);
    // The same when the chosen one falls for lack of earned points.
    const poor = sanitizeTalents('knight', { knight_guard: 5, knight_bulwark: 5, knight_debilitate: 5 }, 8, ['knight_bulwark', 'knight_guard']);
    expect(poor.talents).toEqual({ knight_guard: 5, knight_debilitate: 3 });
    expect(poor.talentPoints).toBe(0);
    // Nothing changes when the chosen two hold.
    const fine = sanitizeTalents('knight', { knight_guard: 5, knight_bulwark: 5, knight_debilitate: 5, knight_t1_health: 5 }, 120, ['knight_bulwark', 'knight_guard']);
    expect(fine.talents).toEqual({ knight_guard: 5, knight_bulwark: 5, knight_t1_health: 5 });
  });

  it('clamps ranks, and ignores ranks that are not whole positive numbers', () => {
    const bad = { knight_guard: 99, knight_t1_health: -3, knight_guardian: Number.NaN, knight_debilitate: 2.9, knight_bulwark: '5' };
    const out = sanitizeTalents('knight', bad, 40);
    expect(out.talents).toEqual({ knight_guard: 5, knight_debilitate: 2 });
    expect(out.talentPoints).toBe(33);
  });

  it('never leaves more spent than earned, a node in a closed tier, an orphan modifier or two of a pair', () => {
    const over = { ...BASTION, knight_mod_shared_skin: 1, knight_mod_mending_bulwark: 1, knight_mod_standard_bearer: 1, knight_cap_living_wall: 1, knight_cap_vengeance: 1 };
    const full = sanitizeTalents('knight', over, 120);
    expect(full.talents.knight_mod_shared_skin).toBe(1);
    expect(full.talents.knight_mod_mending_bulwark).toBeUndefined(); // Bulwark is not learned
    expect(full.talents.knight_mod_standard_bearer).toBeUndefined(); // Hold the Line is not learned
    expect(full.talents.knight_cap_living_wall).toBe(1);
    expect(full.talents.knight_cap_vengeance).toBeUndefined(); // the second capstone
    expect(full.talentPoints).toBe(120 - spentPoints(full.talents));
    // The same build on a level-12 hero: trimmed from the far end until it is a build 12 points can hold.
    const low = sanitizeTalents('knight', over, 12);
    expect(spentPoints(low.talents)).toBeLessThanOrEqual(12);
    expect(low.talentPoints).toBe(12 - spentPoints(low.talents));
    for (const n of talentNodes('knight')) {
      if ((low.talents[n.key] ?? 0) > 0) expect(spentPoints(low.talents)).toBeGreaterThanOrEqual(n.rowIndex * 10);
    }
  });

  it('whatever it returns, the tree accepts: every kept node could be given back and bought again', () => {
    for (const k of CLASS_KEYS) {
      const everything = Object.fromEntries(talentNodes(k).map((n) => [n.key, 7]));
      for (const earned of [0, 1, 9, 35, 64, 97, 120, 500]) {
        const out = sanitizeTalents(k, everything, earned);
        expect(spentPoints(out.talents)).toBeLessThanOrEqual(earned);
        expect(learnedAbilityNodes(k, out.talents).length).toBeLessThanOrEqual(2);
        expect(out.talents).toEqual(sanitizeTalents(k, out.talents, earned).talents); // already clean: unchanged
      }
    }
  });

  it('never throws on garbage', () => {
    for (const junk of [null, undefined, 7, 'x', [], { a: { b: 1 } }]) {
      expect(sanitizeTalents('knight', junk, 10)).toEqual({ talents: {}, talentPoints: 10 });
    }
    expect(sanitizeTalents('mage', { knight_guard: 1 }, 10)).toEqual({ talents: {}, talentPoints: 10 });
    expect(sanitizeTalents('knight', { knight_guard: 1 }, Number.NaN)).toEqual({ talents: {}, talentPoints: 0 });
  });
});

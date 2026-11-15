import { describe, expect, it } from 'vitest';
import { sanitizeHeroTalents } from '@/persistence/sanitizeHero';
import { migrate } from '@/persistence/saveManager';
import { useStore } from '@/state/store';
import { heroAbilities, buildHeroCombatant, partyAuraMods } from '@/sim/loadout';
import { spentPoints } from '@/sim/talentRules';
import { abilityArtStem } from '@/ui/abilityArt';
import { layoutTalentTree } from '@/ui/panels/hero/talentsLayout';
import { talentTree } from '@/data/talents';
import type { HeroState, SaveV1 } from '@/persistence/saveSchema';

// Tolerant loading (docs/redesign/CLASSES.md §7): a save written against another talent tree — or a damaged
// one — loads without throwing, with its unknown entries dropped and every point given back.

const hero = (over: Partial<HeroState>): HeroState => ({
  id: 'h0', classKey: 'knight', level: 40, exp: 0, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [], ...over,
});

/** A save from before the redesign: positional passive keys (`knight_r4_s0`), five abilities learned. */
const OLD_TREE: Record<string, number> = {
  knight_guard: 5, knight_debilitate: 5, knight_bulwark: 5, knight_battlecry: 5,
  knight_r0_s2: 5, knight_r0_s3: 5, knight_r1_s1: 5, knight_r4_s0: 5,
};

function saveWith(roster: HeroState[]): SaveV1 {
  return {
    version: 1, seed: 7, lastSavedAt: 1, progress: { globalStageIndex: 12, world: 2, stage: 2 }, maxClearedStage: 11,
    lootRngState: 0, lootDrawCount: 0, nextEntryId: 1, gold: 10, researchPoints: 0,
    unlockedClasses: ['knight', 'ranger', 'priest'], partySlots: ['h0', null, null], roster,
    inventory: [], inventoryGems: [], inventorySlotUpgrades: 0, stash: [], stashPages: 1, stashSlotUpgrades: 0,
    techTree: {}, chests: [], autoOpen: { unlocked: false, lastRunAt: 0 }, pets: { ownedKeys: [], selectedKey: null },
    settings: { uiScale: 1, dockOrientation: 'bottom' }, cube: { unlocked: false },
    online: { accountId: null, premiumCurrency: 0, premiumUntil: null },
  };
}

describe('sanitizeHeroTalents', () => {
  it('a save with keys the tree does not know: they are dropped and their points come back', () => {
    const out = sanitizeHeroTalents(hero({ talents: OLD_TREE, activeAbilities: ['knight_guard', 'knight_slam_of_old'] }));
    expect(Object.keys(out.talents).sort()).toEqual(['knight_debilitate', 'knight_guard']);
    expect(out.activeAbilities).toEqual(['knight_guard', 'knight_debilitate']); // the stale key is gone
    expect(out.talentPoints).toBe(40 - 10); // every point the level earned, minus what is still validly spent
    expect(out.talentPoints + spentPoints(out.talents)).toBe(40);
  });

  it('a save with three abilities with points keeps two — the active ones first', () => {
    const three = { knight_guard: 2, knight_debilitate: 3, knight_bulwark: 4, knight_t1_health: 5 };
    const out = sanitizeHeroTalents(hero({ talents: three, activeAbilities: ['knight_bulwark', 'knight_debilitate'] }));
    expect(heroAbilities('knight', out.talents).map((a) => a.def.key).sort()).toEqual(['knight_bulwark', 'knight_debilitate']);
    expect(out.activeAbilities).toEqual(['knight_bulwark', 'knight_debilitate']);
    expect(out.talents.knight_guard).toBeUndefined();
    expect(out.talentPoints).toBe(40 - 12);
    // No active list at all (a very old save): the first two in tree order.
    const bare = sanitizeHeroTalents({ ...hero({ talents: three }), activeAbilities: undefined as unknown as string[] });
    expect(bare.activeAbilities).toEqual(['knight_guard', 'knight_debilitate']);
  });

  it('wrong ranks and a wrong point count are put right from the level', () => {
    const out = sanitizeHeroTalents(hero({ level: 12, talentPoints: 999, talents: { knight_guard: 50, knight_t1_health: -2, knight_t1_armor: 3.7 } }));
    expect(out.talents).toEqual({ knight_guard: 5, knight_t1_armor: 3 });
    expect(out.talentPoints).toBe(4);
  });

  it('both presets get the same treatment; a hero without presets stays without', () => {
    const out = sanitizeHeroTalents(hero({
      loadouts: [
        { classKey: 'knight', talents: OLD_TREE, activeAbilities: ['knight_battlecry', 'nope'] },
        { classKey: 'mage', talents: { mage_fireball: 3 }, activeAbilities: ['mage_fireball'] },
      ],
    }));
    // Battle Cry is kept first (it was active)… but with the old passives gone only 10 points are left spent,
    // and its tier opens at 20: it goes, and the ability that had been left out for the two-ability cap takes
    // its place. What is left is a build the tree accepts.
    expect(out.loadouts?.[0]).toEqual({
      classKey: 'knight',
      talents: { knight_guard: 5, knight_debilitate: 5 },
      activeAbilities: ['knight_guard', 'knight_debilitate'],
    });
    expect(out.loadouts?.[1]).toBeNull(); // a preset of a removed class can never apply: dropped
    expect('loadouts' in sanitizeHeroTalents(hero({}))).toBe(false);
    expect(sanitizeHeroTalents(hero({ loadouts: [null, null] })).loadouts).toEqual([null, null]);
  });

  it('a clean hero comes out as it went in', () => {
    const clean = hero({ level: 12, talentPoints: 9, talents: { knight_guard: 3 }, activeAbilities: ['knight_guard'] });
    expect(sanitizeHeroTalents(clean)).toEqual(clean);
  });
});

describe('loading an old or damaged save into the game', () => {
  it('does not throw, and what it leaves can be built, fought with and drawn', () => {
    const save = saveWith([
      hero({ talents: OLD_TREE, activeAbilities: ['knight_guard', 'knight_bulwark', 'knight_battlecry'], talentPoints: 3 }),
      hero({ id: 'h1', classKey: 'ranger', level: 9, talents: { ranger_r9_s9: 4, ranger_fast_fire: 9, garbage: Number.NaN }, activeAbilities: ['ranger_volley_of_old'] }),
      hero({ id: 'h2', classKey: 'priest', level: 3, talents: { priest_mend: 5, priest_powerinfusion: 5, priest_holyshield: 5 } }),
    ]);
    const migrated = migrate(JSON.parse(JSON.stringify(save)));
    expect(migrated).not.toBeNull();
    if (migrated === null) return;
    expect(() => useStore.getState().hydrate(migrated)).not.toThrow();
    const roster = useStore.getState().roster;
    expect(roster.map((h) => h.talentPoints + spentPoints(h.talents))).toEqual([40, 9, 3]); // nobody lost a point
    expect(roster[0]?.activeAbilities).toEqual(['knight_guard', 'knight_bulwark']);
    expect(roster[1]?.talents).toEqual({ ranger_fast_fire: 5 });
    expect(roster[1]?.activeAbilities).toEqual(['ranger_fast_fire']);
    expect(spentPoints(roster[2]?.talents ?? {})).toBeLessThanOrEqual(3); // a level-3 hero cannot hold 15 points
    // The sim builds every hero and the interface helpers answer for every key that is left.
    const configs = roster.map((h) => ({ id: h.id, classKey: h.classKey, level: h.level, equipment: h.equipment, talents: h.talents }));
    const auras = partyAuraMods(configs);
    for (const c of configs) {
      expect(() => buildHeroCombatant(c, auras)).not.toThrow();
      expect(() => layoutTalentTree(talentTree(c.classKey))).not.toThrow();
      for (const a of heroAbilities(c.classKey, c.talents)) expect(typeof abilityArtStem(a.def.key)).toBe('string');
    }
  });

  it('the store’s talent actions keep working on the loaded hero', () => {
    useStore.getState().hydrate(saveWith([hero({ level: 20, talents: OLD_TREE })]));
    const st = useStore.getState();
    expect(st.roster[0]?.talentPoints).toBe(10);
    expect(st.spendTalent('h0', 'knight_t1_health')).toBe(true);
    expect(st.spendTalent('h0', 'knight_r0_s2')).toBe(false); // a key from the old tree: refused, not a throw
    expect(st.refundTalent('h0', 'knight_r0_s2')).toBe(false);
    expect(useStore.getState().roster[0]?.talents.knight_t1_health).toBe(1);
  });
});

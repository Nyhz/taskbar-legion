import { describe, expect, it } from 'vitest';
import { heroConfig, heroStatsNow, partyAuras, partyCombatMods, type StoredHero } from '@/sim/partyStats';
import { buildHeroCombatant, partyAuraMods } from '@/sim/loadout';
import { liveStats } from '@/sim/liveStats';
import { CLASS_KEYS } from '@/data/classes';
import { talentNodes } from '@/data/talents';

// The stats the interface shows are the stats the party fights with: sim/partyStats goes through the same
// functions the engine builds its combatants with.

const hero = (classKey: string, talents: Record<string, number> = {}, level = 60): StoredHero => ({
  id: classKey, classKey, level, equipment: {}, talents,
});
const everyNode = (classKey: string): Record<string, number> =>
  Object.fromEntries(talentNodes(classKey).map((n) => [n.key, n.maxRank]));

describe('partyAuras', () => {
  it('lists exactly the mods of partyAuraMods, in order, each with its giver', () => {
    const rosters: StoredHero[][] = [
      CLASS_KEYS.map((k) => hero(k, everyNode(k))),
      [hero('knight', { knight_warden: 3 }), hero('ranger'), hero('priest', { priest_retribution: 5, priest_sacred_ward: 2 })],
      [hero('priest', { priest_mend: 5, priest_powerinfusion: 5, priest_retribution: 5 })], // the aura is a passive: two abilities beside it
      [],
    ];
    for (const roster of rosters) {
      const auras = partyAuras(roster);
      expect(auras.map((a) => a.mod)).toEqual(partyAuraMods(roster.map(heroConfig)));
      for (const a of auras) expect(talentNodes(a.classKey).some((n) => n.key === a.nodeKey)).toBe(true);
    }
  });

  it('names the node and the hero behind an aura', () => {
    const auras = partyAuras([hero('knight', { knight_warden: 5 }), hero('ranger')]);
    expect(auras).toHaveLength(1);
    expect(auras[0]).toMatchObject({ heroId: 'knight', classKey: 'knight', nodeKey: 'knight_warden' });
    expect(auras[0]?.mod.key).toBe('health');
  });

  it('Retribution is a passive talent: its aura counts whatever abilities are learned', () => {
    expect(partyAuras([hero('priest', { priest_retribution: 5 })]).map((a) => a.nodeKey)).toEqual(['priest_retribution']);
    expect(partyAuras([hero('priest', { priest_mend: 1, priest_powerinfusion: 1, priest_retribution: 5 })]).map((a) => a.nodeKey)).toEqual(['priest_retribution']);
  });
});

describe('heroStatsNow', () => {
  const roster = [
    hero('knight', { knight_guard: 5, knight_t1_health: 5, knight_t1_armor: 5, knight_warden: 5, knight_unyielding: 5 }),
    hero('ranger', { ranger_t1_attackDamage: 5 }),
    hero('priest', { priest_retribution: 5, priest_sacred_ward: 5 }),
  ];
  const partyMods = partyCombatMods(roster, []);

  it('equals the stats of the combatant the engine builds, for every hero of the party', () => {
    for (const h of roster) {
      const c = buildHeroCombatant(heroConfig(h), partyMods);
      expect(heroStatsNow(h, partyMods)).toEqual(liveStats(c));
      expect(heroStatsNow(h, partyMods, c)).toEqual(liveStats(c));
      expect(heroStatsNow(h, partyMods).health).toBe(c.maxHp);
    }
  });

  it('includes what the others give: the Ranger has more life beside a Knight with Warden', () => {
    const ranger = roster[1] as StoredHero;
    const alone = heroStatsNow(ranger, partyCombatMods([ranger], []));
    const inParty = heroStatsNow(ranger, partyMods);
    expect(inParty.health).toBeGreaterThan(alone.health);
    expect(inParty.damageIncrease).toBeGreaterThan(alone.damageIncrease); // the Priest's aura
  });

  it('follows the combatant: a stat that holds only under a share of life shows while it holds', () => {
    const knight = roster[0] as StoredHero;
    const c = buildHeroCombatant(heroConfig(knight), partyMods);
    const healthy = heroStatsNow(knight, partyMods, c);
    c.hp = c.maxHp * 0.2;
    const hurt = heroStatsNow(knight, partyMods, c);
    expect(hurt).toEqual(liveStats(c));
    expect(hurt.damageReduction).toBeGreaterThan(healthy.damageReduction);
  });

  it('the account mods are part of what every hero carries', () => {
    const knight = roster[0] as StoredHero;
    const plus = heroStatsNow(knight, partyCombatMods(roster, [{ key: 'armor', mode: 'flat', value: 100 }]));
    expect(plus.armor).toBeGreaterThan(heroStatsNow(knight, partyMods).armor);
  });
});

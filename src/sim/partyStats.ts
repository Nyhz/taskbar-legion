import type { Combatant } from './world';
import { aggregate, type EffectiveStats, type StatMod } from './stats';
import { effectStatMods } from './effects';
import { MAX_ACTIVE_ABILITIES, heroAbilities, heroBaseStats, heroStaticMods, partyAuraMods, type HeroConfig } from './loadout';
import { talentNodes } from '@/data/talents';

// A hero's stats AS THE PARTY FIGHTS WITH THEM, for whoever shows them (the hero window, the sheet, the
// talent tooltips, the gear comparison). The engine builds each combatant from its config plus the party-wide
// mods (account mods + every hero's auras: an aura ability that is slotted, a role talent that gives the whole
// party a stat); these are the same steps over the same functions, so a figure on screen is the figure in the
// fight. Pure.

/** A hero as the save holds it: what a combat config is made from. */
export type StoredHero = Pick<HeroConfig, 'id' | 'classKey' | 'level' | 'equipment' | 'talents'>;

/** The combat config of a stored hero: its ranked abilities ARE its active ones (two at most). */
export function heroConfig(hero: StoredHero): HeroConfig {
  const activeAbilities = heroAbilities(hero.classKey, hero.talents)
    .slice(0, MAX_ACTIVE_ABILITIES)
    .map((a) => a.def.key);
  return { id: hero.id, classKey: hero.classKey, level: hero.level, equipment: hero.equipment, talents: hero.talents, activeAbilities };
}

/** The mods EVERY hero of the party carries: the account's combat mods, then the party's auras. */
export function partyCombatMods(roster: readonly StoredHero[], accountMods: readonly StatMod[]): StatMod[] {
  return [...accountMods, ...partyAuraMods(roster.map(heroConfig))];
}

/** One aura of the party and who gives it. */
export interface PartyAura {
  heroId: string;
  classKey: string;
  /** The talent node it comes from (an aura ability's node key is its ability key). */
  nodeKey: string;
  mod: StatMod;
}

/** The party's auras one by one, with their giver — the same mods as `partyAuraMods`, in the same order.
 *  Each is found by asking `partyAuraMods` about that node alone, so the rule lives in one place. */
export function partyAuras(roster: readonly StoredHero[]): PartyAura[] {
  const out: PartyAura[] = [];
  for (const hero of roster) {
    const config = heroConfig(hero);
    for (const node of talentNodes(hero.classKey)) {
      const rank = hero.talents[node.key] ?? 0;
      if (rank <= 0) continue;
      for (const mod of partyAuraMods([{ ...config, talents: { [node.key]: rank } }])) {
        out.push({ heroId: hero.id, classKey: hero.classKey, nodeKey: node.key, mod });
      }
    }
  }
  return out;
}

/** The hero's stats right now: base + gear + talents + the party's mods, plus — when its combatant is given —
 *  the effects on it and the stats that hold only while its life is under a share (sim/liveStats). */
export function heroStatsNow(
  hero: StoredHero,
  partyMods: readonly StatMod[],
  combatant?: Combatant,
): EffectiveStats {
  const mods = [...heroStaticMods(heroConfig(hero), partyMods)];
  if (combatant !== undefined) {
    mods.push(...effectStatMods(combatant.effects));
    for (const m of combatant.lowHpMods ?? []) if (combatant.hp < combatant.maxHp * m.hpBelow) mods.push(m.mod);
  }
  return aggregate(heroBaseStats(hero.classKey, hero.level), mods);
}

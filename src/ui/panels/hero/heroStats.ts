import { aggregate } from '@/sim/stats';
import { equipmentMods, heroBaseStats, talentPassiveMods } from '@/sim/loadout';
import { effectStatMods } from '@/sim/effects';
import type { Bonuses } from '@/sim/bonuses';
import type { Combatant } from '@/sim/world';
import { classDef } from '@/data/classes';
import { STATS, type StatKey } from '@/data/stats';
import { format } from '@/sim/num';
import type { HeroState } from '@/persistence/saveSchema';

// The hero's effective stats, as the sim's combat aggregate computes them: gear + talents + account bonuses,
// plus the live effects on the combatant (so a buff like Stone Skin shows while it is up). Derived, never stored.

export function heroStats(
  hero: HeroState,
  bonuses: Bonuses,
  combatant: Combatant | undefined,
): Record<StatKey, number> {
  const mods = [
    ...equipmentMods(hero.equipment),
    ...talentPassiveMods(hero.classKey, hero.talents),
    ...bonuses.combatMods,
    ...effectStatMods(combatant?.effects ?? []),
  ];
  return aggregate(heroBaseStats(hero.classKey, hero.level), mods);
}

const OFFENCE: readonly StatKey[] = ['attackDamage', 'attackSpeed', 'critChance', 'critDamage'];
const DEFENCE: readonly StatKey[] = ['health', 'armor', 'magicResist', 'block', 'damageReduction'];

/** The ten stats beside the paper doll: four of offence plus the one that marks the role (heal power for a
 *  healer, multistrike otherwise), then five of defence. The sheet tab lists everything. */
export function dollStats(classKey: string): { offence: StatKey[]; defence: StatKey[] } {
  const fifth: StatKey = classDef(classKey).role === 'healer' ? 'healPower' : 'multistrike';
  return { offence: [...OFFENCE, fifth], defence: [...DEFENCE] };
}

/** A stat's value as the panel writes it: a percent with one decimal at most, a flat number shortened. */
export function statText(key: StatKey, value: number): string {
  if (STATS[key].kind === 'percent') return `${Number(value.toFixed(1))} %`;
  return format(Math.round(value));
}

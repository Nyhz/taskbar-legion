import type { Combatant } from '@/sim/world';
import type { Rng } from '@/sim/rng';
import { heroAbilities, type ResolvedAbility } from '@/sim/loadout';
import type { StatKey } from '@/data/stats';
import { talentNodes, tryTalentNode } from '@/data/talents';
import { canSpend } from '@/sim/talentRules';

// Shared builders for the class-kit tests (docs/redesign/CLASSES.md, F2–F6).

/** A bare combatant: 1000 life, no stats, standing at x = 0 with a 30 px reach. */
export function unit(over: Partial<Combatant> & { id: string; side: 'hero' | 'enemy' }): Combatant {
  return {
    classKey: 'knight', hp: 1000, maxHp: 1000, baseStats: {}, staticMods: [], effects: [],
    cooldowns: {}, attackTimerMs: 0, x: 0, range: 30, moveSpeed: 0, abilities: [], alive: true,
    ...over,
  };
}

export const base = (s: Partial<Record<StatKey, number>>): Partial<Record<StatKey, number>> => s;

/** The ability as a hero with these talents casts it (modifiers applied), at its rank. */
export function learned(classKey: string, talents: Record<string, number>, abilityKey: string): ResolvedAbility {
  const found = heroAbilities(classKey, talents).find((a) => a.def.key === abilityKey);
  if (found === undefined) throw new Error(`${abilityKey} is not learned in this build`);
  return found;
}

/** An RNG whose every chance fails (no crit, no block) and that counts how often it was asked. */
export function quietRng(): Rng & { draws: number } {
  const rng = {
    draws: 0,
    next: (): number => { rng.draws += 1; return 0.999999; },
    int: (max: number): number => { rng.draws += 1; return max - 1; },
    range: (_min: number, max: number): number => { rng.draws += 1; return max; },
    chance: (): boolean => { rng.draws += 1; return false; },
    pick: <T,>(items: readonly T[]): T => { rng.draws += 1; return items[0] as T; },
    state: (): number => 0,
  };
  return rng;
}

/** An RNG whose every chance succeeds (always crits, always blocks). */
export function luckyRng(): Rng {
  return { ...quietRng(), chance: () => true };
}

export const effect = (c: Combatant | undefined, key: string): Combatant['effects'][number] | undefined =>
  c?.effects.find((e) => e.defKey === key);

/** A valid build that holds every node of `wanted` at its top rank: each point goes through the tree's own
 *  rules, and stat passives (lowest tier first) are bought on the way to open the tiers the wanted nodes need. */
export function buildTalents(classKey: string, wanted: readonly string[], points = 120): Record<string, number> {
  const talents: Record<string, number> = {};
  let left = points;
  const tryKey = (key: string): boolean => {
    if (!canSpend(classKey, talents, left, key).ok) return false;
    talents[key] = (talents[key] ?? 0) + 1;
    left -= 1;
    return true;
  };
  for (let guard = 0; guard < 1000 && left > 0; guard++) {
    if (wanted.some(tryKey)) continue;
    const pending = wanted.filter((k) => (talents[k] ?? 0) < (tryTalentNode(classKey, k)?.maxRank ?? 0));
    if (pending.length === 0) break;
    // Something wanted is still closed: buy a passive of the branch it needs points in, else of the trunk.
    const lanes = new Set(pending.map((k) => tryTalentNode(classKey, k)?.lane));
    const fillers = talentNodes(classKey).filter((n) => n.kind === 'passive' || n.kind === 'role');
    const filler = fillers.find((n) => lanes.has(n.lane) && tryKey(n.key)) ?? fillers.find((n) => tryKey(n.key));
    if (filler === undefined) break;
  }
  for (const k of wanted) {
    if ((talents[k] ?? 0) !== tryTalentNode(classKey, k)?.maxRank) throw new Error(`build could not hold ${k}`);
  }
  return talents;
}

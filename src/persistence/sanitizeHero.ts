import type { HeroState, Loadout } from './saveSchema';
import { hasTalentTree, talentPointsAtLevel } from '@/data/talents';
import { learnedAbilityNodes, sanitizeTalents } from '@/sim/talentRules';

// Load-time sanitiser for a hero's talents (docs/redesign/CLASSES.md §7). A save written against another
// talent tree — or a damaged one — must load without throwing and without losing a point: keys the tree does
// not know are dropped from `talents`, from the active abilities and from both presets; at most two abilities
// keep their points; and the points to spend are recomputed as (earned by level) − (still validly spent).
// Pure. The class must be a known one (hydrate drops heroes of removed classes first).

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((k): k is string => typeof k === 'string') : []);

/** The learned abilities in the saved order, then the rest in tree order (learned IS active). */
function activeFor(classKey: string, talents: Record<string, number>, saved: readonly string[]): string[] {
  const learned = learnedAbilityNodes(classKey, talents).map((n) => n.key);
  return [...saved.filter((k, i) => learned.includes(k) && saved.indexOf(k) === i), ...learned.filter((k) => !saved.includes(k))];
}

function sanitizeLoadout(lo: Loadout | null | undefined, earned: number): Loadout | null {
  // A preset of a class that no longer exists can never be applied: it goes.
  if (lo === null || lo === undefined || typeof lo.classKey !== 'string' || !hasTalentTree(lo.classKey)) return null;
  const saved = strings(lo.activeAbilities);
  const { talents } = sanitizeTalents(lo.classKey, lo.talents, earned, saved);
  return { classKey: lo.classKey, talents, activeAbilities: activeFor(lo.classKey, talents, saved) };
}

/** The hero with talents, points to spend, active abilities and presets the current tree accepts. */
export function sanitizeHeroTalents(hero: HeroState): HeroState {
  const level = Number.isFinite(hero.level) ? hero.level : 1;
  const earned = talentPointsAtLevel(level);
  const saved = strings(hero.activeAbilities);
  const { talents, talentPoints } = sanitizeTalents(hero.classKey, hero.talents, earned, saved);
  const out: HeroState = { ...hero, talents, talentPoints, activeAbilities: activeFor(hero.classKey, talents, saved) };
  // Presets only exist on saves that have them (older saves carry none: leave them without).
  if (Array.isArray(hero.loadouts)) {
    out.loadouts = [sanitizeLoadout(hero.loadouts[0], earned), sanitizeLoadout(hero.loadouts[1], earned)];
  } else {
    delete out.loadouts;
  }
  return out;
}

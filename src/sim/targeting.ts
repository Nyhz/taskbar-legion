import type { Combatant } from './world';
import { behindBack } from './bossMechanics';
import { BACK_LINE_SHOT_PCT, TARGET_PRIORITY } from '@/data/enemies';
import { steadyRoll } from './steady';
import { MOVE_EPS } from '@/data/field';

// Who the heroes that shoot (the Ranger, the Priest) pick. Two distances, kept apart on purpose:
//   - `range` is where a hero STANDS — she walks until the nearest enemy is that far, as always, and that is also
//     what says the fight has reached her (sim/combat, sim/abilities: nothing here changes it);
//   - `shotReach` is how far her shot can pick a target once she stands there: long enough for the support at the
//     far end of a wave.
// Within that reach she picks by PRIORITY (data/enemies TARGET_PRIORITY): what a boss summoned over the party
// first (it was the nearest thing, and still is what pecks her), then the boss, then the support, the shooters,
// the beasts, the soldiers and the brutes; an elite before the rest of its kind; the nearest of equals. No rng.

/** How far a hero's shot can pick a target: its shot reach, or — a hero without one — where it stands. */
export function reachOf(hero: Combatant): number {
  return hero.shotReach ?? hero.range;
}

/** Whether `e` is within `hero`'s shot reach (with the walk's tolerance, as the stand check has). */
export function inShotReach(hero: Combatant, e: Combatant): boolean {
  if (behindBack(hero, e)) return false; // a summon flying behind him: the heroes further back shoot it
  return Math.abs(e.x - hero.x) <= reachOf(hero) + MOVE_EPS;
}

const UNRANKED = TARGET_PRIORITY.indexOf('soldier');

/** Its place in the order: lower is shot first. */
export function targetRank(e: Combatant): number {
  if (e.summon !== undefined) return 0;
  if (e.isBoss === true) return 1;
  const role = e.enemyRole === undefined ? UNRANKED : TARGET_PRIORITY.indexOf(e.enemyRole);
  return 2 + (role < 0 ? UNRANKED : role) * 2 + (e.isElite === true ? 0 : 1);
}

/** The living enemy within `hero`'s shot reach that comes first in the order (ties: the nearest to the party,
 *  then the list's order) — or undefined with nobody in reach. */
export function pickTarget(hero: Combatant, enemies: readonly Combatant[]): Combatant | undefined {
  let best: Combatant | undefined;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const e of enemies) {
    if (!e.alive || !inShotReach(hero, e)) continue;
    const rank = targetRank(e);
    if (rank < bestRank || (rank === bestRank && best !== undefined && e.x < best.x)) {
      best = e;
      bestRank = rank;
    }
  }
  return best;
}

/** Where a shooting hero's BASIC shot goes (data/enemies BACK_LINE_SHOT_PCT): a summon a boss sent over the party
 *  first, always; otherwise one shot in four by the order (the back of the wave: the support, the shooters…) and the
 *  rest at `front`, the enemy nearest her — the front of the wave. */
export function shotTarget(hero: Combatant, enemies: readonly Combatant[], front: Combatant): Combatant {
  const best = pickTarget(hero, enemies);
  if (best === undefined) return front;
  if (best.summon !== undefined) return best;
  return steadyRoll(hero, 'backShot', BACK_LINE_SHOT_PCT) ? best : front;
}

/** How many living enemies a blast of `radius` centred on `centre` catches (itself included). */
export function caughtBy(centre: Combatant, enemies: readonly Combatant[], radius: number): number {
  let n = 0;
  for (const e of enemies) if (e.alive && Math.abs(e.x - centre.x) <= radius) n += 1;
  return n;
}

/** The living enemy within `hero`'s shot reach whose blast of `radius` catches the MOST enemies — among equals an
 *  elite or a boss, then the nearest to the party, then the list's order. Undefined with nobody in reach. No rng. */
export function biggestCluster(hero: Combatant, enemies: readonly Combatant[], radius: number): Combatant | undefined {
  let best: Combatant | undefined;
  let bestCaught = 0;
  const tough = (c: Combatant): boolean => c.isElite === true || c.isBoss === true;
  for (const e of enemies) {
    if (!e.alive || !inShotReach(hero, e)) continue;
    const caught = caughtBy(e, enemies, radius);
    const better =
      best === undefined || caught > bestCaught || (caught === bestCaught && ((tough(e) && !tough(best)) || (tough(e) === tough(best) && e.x < best.x)));
    if (better) {
      best = e;
      bestCaught = caught;
    }
  }
  return best;
}

// Economy + character-growth model for the progression probe: XP→level, a default talent
// allocation (so heroes actually have abilities/ultimates), and the gold→tech spend policy.
//
// Talent policy (class redesign, docs/redesign/CLASSES.md): an "average" build, not a min-maxed one, and
// always a build the tree accepts (every point goes through sim/talentRules.canSpend):
//   (the policy is PROBE_DEFAULT_BUILD in builds.ts; any other build can be passed instead)
//   1. the class's first two abilities (the tier-1 pair, the two the probe always fielded) to rank 5;
//   2. the whole TRUNK, lowest tier first: stat passives and the three role talents;
//   3. ONE branch per role (PROBE_BRANCH: Knight → Bastion, Ranger → Marksman, Priest → Devotion), lowest tier
//      first: its passives, the "choose one" modifier of an ability the hero has, and its capstone as soon as
//      tier 10 and the 25 branch points allow. The branch's own ability stays unlearned (two abilities already);
//   4. whatever is left goes into the other branch: its passives, and its modifier of an ability the hero has.
//
// Tech policy (the #1 pacing lever — easy to re-order here): bootstrap the party, then make
// chests actually flow (auto-open + storage, which fight the ~50% overflow loss), then
// compound income, then chest drop-rate.

import { totalExpToReach, MAX_LEVEL } from '@/data/stageScaling';
import { TECH_NODES, TECH_NODE_MAP, nodeCost } from '@/data/techTree';
import { buildTalents, fieldedAbilities, PROBE_DEFAULT_BUILD, type ClassBuild } from './builds';
import type { HeroConfig } from '@/sim/loadout';

export const TECH_PRIORITY: readonly string[] = [
  'party_size', // open party slots (recruiting itself is gated by class-unlock gold in the loop)
  'auto_open', // open chests automatically → loot actually flows (cuts the overflow loss)
  'store_normal',
  'store_stage',
  'store_zone', // storage caps ↑ → fewer chests lost to overflow
  'eco_gold',
  'eco_xp', // compounding income
  'chest_drop_normal',
  'chest_drop_stage',
  'chest_gem',
  'eco_offline',
];

export function freshHero(id: string, classKey: string, level: number, build?: ClassBuild): HeroConfig {
  const cfg: HeroConfig = { id, classKey, level, equipment: {}, talents: {}, activeAbilities: [], autoDefaultAbilities: true };
  applyBuild(cfg, level, build);
  return cfg;
}

/** Give `cfg` the talents of `build` (the default when none) at `level`, and field exactly its abilities. */
export function applyBuild(cfg: HeroConfig, level: number, build?: ClassBuild): void {
  const b = build ?? PROBE_DEFAULT_BUILD[cfg.classKey];
  cfg.talents = defaultTalents(cfg.classKey, level, b);
  cfg.activeAbilities = b === undefined ? [] : fieldedAbilities(cfg.classKey, level, b);
}

/** Highest level reachable with `xp` total experience (cap 120). */
export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= totalExpToReach(lvl + 1)) lvl += 1;
  return lvl;
}

/** The branch the probe's hero of each class specialises in (one per role). */
export const PROBE_BRANCH: Record<string, string> = Object.fromEntries(Object.entries(PROBE_DEFAULT_BUILD).map(([c, b]) => [c, b.branch]));

/** Greedy "average" talent build for `points` (≈ level), following the policy at the top of this file — or `build`
 *  when one is given (test/sim/probe/builds.ts: any pair of abilities, branch, modifiers, spend order). */
export function defaultTalents(classKey: string, points: number, build?: ClassBuild): Record<string, number> {
  const b = build ?? PROBE_DEFAULT_BUILD[classKey];
  if (b === undefined) throw new Error(`No default build for ${classKey}`);
  return buildTalents(classKey, points, b);
}

/** Update a hero's level + talents to reflect accumulated XP. Returns true if level changed. */
export function syncGrowth(config: HeroConfig, xp: number, build?: ClassBuild): boolean {
  const lvl = levelForXp(xp);
  if (lvl === config.level) return false;
  config.level = lvl;
  applyBuild(config, lvl, build);
  return true;
}

/** Spend gold on tech by priority until nothing affordable/beneficial remains. Mutates
 *  `techRanks`; returns leftover gold. Recruiting (party_size's payoff) is handled in the loop. `only` restricts
 *  the buying to those nodes (the loop saves for the party before anything else); `extra` (tooling, ProbeConfig.extraTech)
 *  appends nodes after the default priority. */
export function buyTech(gold: number, techRanks: Record<string, number>, only?: readonly string[], extra?: readonly string[]): number {
  let purse = gold;
  const list = only ?? (extra !== undefined && extra.length > 0 ? [...TECH_PRIORITY, ...extra] : TECH_PRIORITY);
  for (;;) {
    let bought = false;
    for (const key of list) {
      const node = TECH_NODE_MAP[key];
      if (node === undefined) continue;
      const rank = techRanks[key] ?? 0;
      if (node.maxRanks !== undefined && rank >= node.maxRanks) continue;
      const cost = nodeCost(node, rank);
      if (purse < cost) continue;
      purse -= cost;
      techRanks[key] = rank + 1;
      bought = true;
      break; // restart from the top of the priority list
    }
    if (!bought) break;
  }
  return purse;
}

// Re-export the node table size sanity (keeps TECH_NODES import meaningful for future use).
export const TECH_NODE_COUNT = TECH_NODES.length;

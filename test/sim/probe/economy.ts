// Economy + character-growth model for the progression probe: XP→level, a default talent
// allocation (so heroes actually have abilities/ultimates), and the gold→tech spend policy.
//
// Talent policy (class redesign, docs/redesign/CLASSES.md): an "average" build, not a min-maxed one, and
// always a build the tree accepts (every point goes through sim/talentRules.canSpend):
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
import { talentNodes, TRUNK, type TalentNode } from '@/data/talents';
import { canSpend } from '@/sim/talentRules';
import type { HeroConfig } from '@/sim/loadout';

const ABILITY_RANK_CAP = 5; // stop dumping points into one ability past this

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

export function freshHero(id: string, classKey: string, level: number): HeroConfig {
  const cfg: HeroConfig = { id, classKey, level, equipment: {}, talents: {}, activeAbilities: [], autoDefaultAbilities: true };
  cfg.talents = defaultTalents(classKey, level);
  return cfg;
}

/** Highest level reachable with `xp` total experience (cap 120). */
export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= totalExpToReach(lvl + 1)) lvl += 1;
  return lvl;
}

/** The branch the probe's hero of each class specialises in (one per role). */
export const PROBE_BRANCH: Record<string, string> = { knight: 'bastion', ranger: 'marksman', priest: 'devotion' };

/** How soon the policy wants a node: abilities, then the trunk, then its branch, then the other one. */
function priority(classKey: string, n: TalentNode): number {
  if (n.kind === 'ability') return 0;
  if (n.lane === TRUNK) return 1;
  return n.lane === PROBE_BRANCH[classKey] ? 2 : 3;
}

/** Greedy "average" talent build for `points` (≈ level), following the policy at the top of this file. Among
 *  the nodes the tree lets it raise, it takes the most wanted, then the lowest tier, then tree order. */
export function defaultTalents(classKey: string, points: number): Record<string, number> {
  const nodes = talentNodes(classKey);
  // Only the first two abilities are ever learned (the probe's fixed pair).
  const pair = new Set(nodes.filter((n) => n.kind === 'ability').slice(0, 2).map((n) => n.key));
  const ranks: Record<string, number> = {};
  let spent = 0;
  while (spent < points) {
    let pick: TalentNode | undefined;
    for (const n of nodes) {
      if (n.kind === 'ability' && (!pair.has(n.key) || (ranks[n.key] ?? 0) >= ABILITY_RANK_CAP)) continue;
      if (!canSpend(classKey, ranks, points - spent, n.key).ok) continue;
      if (pick === undefined || priority(classKey, n) < priority(classKey, pick) ||
        (priority(classKey, n) === priority(classKey, pick) && n.rowIndex < pick.rowIndex)) pick = n;
    }
    if (pick === undefined) break; // nothing left to rank (everything bought or closed)
    ranks[pick.key] = (ranks[pick.key] ?? 0) + 1;
    spent += 1;
  }
  return ranks;
}

/** Update a hero's level + talents to reflect accumulated XP. Returns true if level changed. */
export function syncGrowth(config: HeroConfig, xp: number): boolean {
  const lvl = levelForXp(xp);
  if (lvl === config.level) return false;
  config.level = lvl;
  config.talents = defaultTalents(config.classKey, lvl);
  return true;
}

/** Spend gold on tech by priority until nothing affordable/beneficial remains. Mutates
 *  `techRanks`; returns leftover gold. Recruiting (party_size's payoff) is handled in the loop. `only` restricts
 *  the buying to those nodes (the loop saves for the party before anything else). */
export function buyTech(gold: number, techRanks: Record<string, number>, only?: readonly string[]): number {
  let purse = gold;
  for (;;) {
    let bought = false;
    for (const key of only ?? TECH_PRIORITY) {
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

// Economy + character-growth model for the progression probe: XP→level, a default talent
// allocation (so heroes actually have abilities/ultimates), and the gold→tech spend policy.
//
// Talent policy: spend points (≈ level) greedily, ability nodes first within each unlocked
// row (rows unlock at rowIndex*10 spent), so the Priest's heal and each class's signature
// come online early — an "average" build, not a min-maxed one.
//
// Tech policy (the #1 pacing lever — easy to re-order here): bootstrap the party, then make
// chests actually flow (auto-open + storage, which fight the ~50% overflow loss), then
// compound income, then chest drop-rate.

import { totalExpToReach, MAX_LEVEL } from '@/data/stageScaling';
import { TECH_NODES, TECH_NODE_MAP, nodeCost } from '@/data/techTree';
import { talentNodes } from '@/data/talents';
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

/** Greedy "average" talent build for `points` (≈ level): fill unlocked rows, abilities first.
 *  A row unlocks once cumulative spent ≥ rowIndex*10 (rowUnlockThreshold). */
export function defaultTalents(classKey: string, points: number): Record<string, number> {
  const nodes = talentNodes(classKey);
  const ranks: Record<string, number> = {};
  let spent = 0;
  while (spent < points) {
    let pick: (typeof nodes)[number] | undefined;
    let pickIsAbility = false;
    for (const n of nodes) {
      if (n.rowIndex * 10 > spent) continue; // row not yet unlocked
      const r = ranks[n.key] ?? 0;
      const isAbility = n.kind === 'ability';
      if (isAbility && r >= ABILITY_RANK_CAP) continue;
      // prefer the lowest-row ability; otherwise the lowest-row node available
      if (pick === undefined) {
        pick = n;
        pickIsAbility = isAbility;
      } else if (isAbility && !pickIsAbility) {
        pick = n;
        pickIsAbility = true;
      } else if (isAbility === pickIsAbility && n.rowIndex < pick.rowIndex) {
        pick = n;
      }
    }
    if (pick === undefined) break; // nothing left to rank (everything capped)
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
 *  `techRanks`; returns leftover gold. Recruiting (party_size's payoff) is handled in the loop. */
export function buyTech(gold: number, techRanks: Record<string, number>): number {
  let purse = gold;
  for (;;) {
    let bought = false;
    for (const key of TECH_PRIORITY) {
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

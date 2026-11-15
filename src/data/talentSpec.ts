import type { StatKey } from './stats';
import { STATS } from './stats';
import type { AbilityPatch } from './abilityPatch';
import type { TriggerDef } from './triggers';
import type { UltimatePatch } from './ultimates';
import { abilityDef } from './abilities';

// The talent-tree MODEL (docs/redesign/CLASSES.md §2, F1): node kinds and the small constructors the class
// files (data/talentTrees/*) write their trees with. A tree is ten tiers: tiers 1–4 are the common TRUNK,
// tiers 5–9 hold two nodes for each of the class's two BRANCHES, tier 10 holds each branch's capstone.
//
// Node keys are STABLE: each is a literal written in the class file and is what a save stores. Moving a node
// to another tier or renaming what the player reads must NOT change its key.

export type TalentNodeKind = 'ability' | 'passive' | 'role' | 'modifier' | 'capstone';

/** The lane of the trunk nodes; a branch node's lane is its branch key. */
export const TRUNK = 'trunk';

/** A condition on the target of a hit or a heal (role talents). */
export type TargetCondition =
  | { type: 'hpBelow'; frac: number } // under this share of its life
  | { type: 'approaching' } // an enemy that has not reached the fight yet
  | { type: 'eliteOrBoss' }
  | { type: 'firstHit' } // an enemy this hero has not hit yet
  | { type: 'ranged' } // an enemy that fights from range
  | { type: 'afflicted' } // an enemy that bleeds, burns or is slowed
  | { type: 'always' };

/** An EFFECT passive (second combat wave, B — agreed 2026-11-15): a passive with behaviour of its own, read by
 *  sim/passives.ts. The figure per rank is the role's `perRank`; what is written here are its fixed numbers. */
export type PassiveEffect =
  // The owner takes a share of the damage AIMED at the heroes behind the front one (mitigated by his own defences).
  | { is: 'intercept' }
  // While the owner lives, the rest of the party takes less from area blows.
  | { is: 'areaGuard' }
  // When an ally drops under `hpBelow` of its life, that ally takes less damage for a while (`effectKey`).
  | { is: 'allyLowGuard'; hpBelow: number; effectKey: string }
  // Each blocked hit is a stack of less damage taken (up to `maxStacks`); all lost after `missesToLose` hits in
  // a row without a block.
  | { is: 'blockStreak'; maxStacks: number; missesToLose: number }
  // Hits over `lifeFrac` of the owner's life are reduced.
  | { is: 'bigHitGuard'; lifeFrac: number }
  // The owner's critical hits also leave a bleed (`effectKey`) worth a share of that hit, over the effect's time.
  | { is: 'critBleed'; effectKey: string }
  // When the owner's shot kills, a share of the damage left over goes to the enemy behind.
  | { is: 'overkillPierce' }
  // While the owner lives, healing that does not fit becomes a shield (`effectKey`), up to a share of life.
  | { is: 'overhealShield'; effectKey: string }
  // While the owner lives, the hero with the least life takes less damage.
  | { is: 'lowestGuard' }
  // Fallen heroes come back sooner.
  | { is: 'fasterRespawn' }
  // Enemies hit by the owner's damage abilities take more damage from everyone for a while (`effectKey`).
  | { is: 'condemn'; effectKey: string };

/** What a ROLE talent does — a passive with behaviour (F4). Values are per rank. */
export type RoleEffect =
  // A stat for the whole party, from a passive node (sim/loadout.partyAuraMods).
  | { type: 'partyStat'; stat: StatKey; mode: 'flat' | 'percent'; valuePerRank: number }
  // Life regeneration for the whole party while the owner lives: % of each hero's max HP per second.
  | { type: 'partyRegen'; pctMaxHpPerSecPerRank: number }
  // A stat for the owner while its own life is under a share.
  | { type: 'selfStatWhen'; hpBelow: number; stat: StatKey; mode: 'flat' | 'percent'; valuePerRank: number }
  // More damage dealt / stronger heals, depending on who receives them.
  | { type: 'dealt'; what: 'damage' | 'heal'; when: TargetCondition; pctPerRank: number }
  // An effect passive: `perRank` is its figure (a percentage) per rank.
  | { type: 'passive'; effect: PassiveEffect; perRank: number };

export interface TalentNode {
  /** Stable key (what a save stores). An ability node's key is its ability key. */
  key: string;
  /** 0-based tier. */
  rowIndex: number;
  kind: TalentNodeKind;
  /** TRUNK, or the key of the branch it belongs to. */
  lane: string;
  name: string;
  /** What it does, in English (role talents, effect passives, modifiers, capstones). */
  desc?: string;
  maxRank: number;
  /** passive: a percent of a stat per rank. */
  passive?: { stat: StatKey; mode: 'flat' | 'percent'; valuePerRank: number };
  /** ability: the ability it teaches. */
  abilityKey?: string;
  /** role, or an effect passive: its behaviour. */
  role?: RoleEffect;
  /** modifier: the ability it changes — usable only while that ability is learned, and given back with it. */
  modifies?: string;
  /** modifier: the data patch on that ability. */
  patch?: AbilityPatch;
  /** modifier: triggers the hero carries with it. */
  triggers?: readonly TriggerDef[];
  /** capstone: how it transforms the class ultimate. */
  ult?: UltimatePatch;
  /** Nodes sharing a group are a "choose one": only one of them may hold points. */
  chooseGroup?: string;
  /** capstone: points it needs spent in its own branch. */
  branchPoints?: number;
}

export interface TalentBranch {
  key: string;
  name: string;
}

/** A node as a class file writes it: everything but its place in the tree. */
export type NodeSpec = Omit<TalentNode, 'rowIndex' | 'lane'>;

export interface BranchSpec extends TalentBranch {
  /** Tiers 5–10, in order: five rows of two nodes, then the capstone alone. */
  rows: NodeSpec[][];
}

export interface ClassTreeSpec {
  classKey: string;
  /** Tiers 1–4. */
  trunk: NodeSpec[][];
  branches: [BranchSpec, BranchSpec];
}

const RANKS = 5;
/** Points a capstone needs in its own branch. */
export const CAPSTONE_BRANCH_POINTS = 25;

/** An ability node (5 ranks). Its key IS the ability key. */
export function ability(abilityKey: string): NodeSpec {
  return { key: abilityKey, kind: 'ability', name: abilityDef(abilityKey).name, maxRank: RANKS, abilityKey };
}

/** A passive (5 ranks): `perRank` percent of a stat. Flat-origin stats (life, armour, magic resist, attack
 *  damage) are a percent of the hero's total; percent stats (crit, block…) add points. */
export function stat(key: string, statKey: StatKey, perRank: number): NodeSpec {
  return {
    key, kind: 'passive', name: STATS[statKey].label, maxRank: RANKS,
    passive: { stat: statKey, mode: 'percent', valuePerRank: perRank },
  };
}

/** A role talent (5 ranks). */
export function role(key: string, name: string, desc: string, effect: RoleEffect): NodeSpec {
  return { key, kind: 'role', name, desc, maxRank: RANKS, role: effect };
}

/** An EFFECT passive (5 ranks): a passive with behaviour of its own instead of a stat — it stands where a stat
 *  passive would (same frame, same place in the row) and carries a role effect. */
export function effect(key: string, name: string, desc: string, behaviour: RoleEffect): NodeSpec {
  return { key, kind: 'passive', name, desc, maxRank: RANKS, role: behaviour };
}

/** A modifier (1 rank) of an ability: a patch on its definition and/or triggers. */
export function modifier(
  key: string,
  name: string,
  desc: string,
  modifies: string,
  change: { patch?: AbilityPatch; triggers?: readonly TriggerDef[] },
): NodeSpec {
  return { key, kind: 'modifier', name, desc, maxRank: 1, modifies, ...change };
}

/** A branch's capstone (1 rank): transforms the class ultimate. */
export function capstone(key: string, name: string, desc: string, ult: UltimatePatch): NodeSpec {
  return { key, kind: 'capstone', name, desc, maxRank: 1, ult, branchPoints: CAPSTONE_BRANCH_POINTS };
}

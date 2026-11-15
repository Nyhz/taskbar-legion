import { talentTree, type RoleEffect, type TalentBranch, type TalentNode } from '@/data/talents';

// What a talent node's tooltip needs beyond its numbers, as DATA: the interface words it in the player's
// language (ui/panels/hero/talentWords). Pure and total.

/** The branch a node belongs to, or undefined for a trunk node. */
export function nodeBranch(classKey: string, node: TalentNode): TalentBranch | undefined {
  return talentTree(classKey).branches.find((b) => b.key === node.lane);
}

/** How a role talent's value reads: a percentage, or a percentage per second. */
export type RoleUnit = 'percent' | 'percentPerSecond';

/** A role talent's value per rank and its unit, for the "per rank / now / at max" lines. */
export function roleValue(role: RoleEffect): { perRank: number; unit: RoleUnit } {
  switch (role.type) {
    case 'partyStat':
    case 'selfStatWhen':
      return { perRank: role.valuePerRank, unit: 'percent' };
    case 'partyRegen':
      return { perRank: role.pctMaxHpPerSecPerRank, unit: 'percentPerSecond' };
    case 'dealt':
      return { perRank: role.pctPerRank, unit: 'percent' };
  }
}

/** What a node asks for beyond its tier: a capstone's points in its own branch, or being one of a "choose
 *  one" pair. */
export type NodeRequirement = { type: 'capstone'; points: number; branch: TalentBranch } | { type: 'chooseOne' };

export function nodeRequirement(classKey: string, node: TalentNode): NodeRequirement | undefined {
  const branch = nodeBranch(classKey, node);
  if (node.branchPoints !== undefined && branch !== undefined) return { type: 'capstone', points: node.branchPoints, branch };
  if (node.chooseGroup !== undefined) return { type: 'chooseOne' };
  return undefined;
}

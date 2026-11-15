import { tryAbilityDef } from '@/data/abilities';
import { talentTree, tryTalentNode, type RoleEffect, type TalentNode, type TalentNodeKind } from '@/data/talents';
import type { SpendBlock } from './talentRules';

// English lines about talent nodes, for tooltips — like the ability lines of sim/abilities.ts, they stay in
// English and come from here until the class kits get their dictionaries (docs/redesign/I18N.md). Pure and
// total: an unknown key gives a sensible line, never a throw.

export const NODE_KIND_LABEL: Record<TalentNodeKind, string> = {
  ability: 'Ability',
  passive: 'Passive',
  role: 'Role talent',
  modifier: 'Modifier',
  capstone: 'Capstone',
};

const nodeName = (classKey: string, key: string): string =>
  tryTalentNode(classKey, key)?.name ?? tryAbilityDef(key)?.name ?? key;

/** Name of the branch a node belongs to, or undefined for a trunk node. */
export function branchName(classKey: string, node: TalentNode): string | undefined {
  return talentTree(classKey).branches.find((b) => b.key === node.lane)?.name;
}

/** Why a point cannot go into a node, in words. */
export function spendBlockLine(classKey: string, block: SpendBlock, node?: TalentNode): string {
  switch (block.reason) {
    case 'unknownNode':
      return 'This talent no longer exists.';
    case 'maxRank':
      return 'Already at its top rank.';
    case 'tierLocked':
      return `Opens at ${block.need} points spent.`;
    case 'abilityCap':
      return `Already has ${block.max} abilities. Give back the points of one to learn another.`;
    case 'needsAbility':
      return `Needs ${nodeName(classKey, block.abilityKey)}.`;
    case 'chooseOne':
      return `Choose one: ${nodeName(classKey, block.otherKey)} is already taken.`;
    case 'branchPoints': {
      const branch = node === undefined ? undefined : branchName(classKey, node);
      return `Needs ${block.need} points in ${branch ?? 'its branch'} (has ${block.have}).`;
    }
    case 'noPoints':
      return 'No talent points to spend.';
  }
}

/** A role talent's value per rank and its unit, for the "per rank / now / at max" lines. */
export function roleValue(role: RoleEffect): { perRank: number; unit: string } {
  switch (role.type) {
    case 'partyStat':
    case 'selfStatWhen':
      return { perRank: role.valuePerRank, unit: ' %' };
    case 'partyRegen':
      return { perRank: role.pctMaxHpPerSecPerRank, unit: ' %/s' };
    case 'dealt':
      return { perRank: role.pctPerRank, unit: ' %' };
  }
}

/** What a node asks for beyond its tier, in words: a capstone's branch points, a "choose one" pair. */
export function nodeRequirementLines(classKey: string, node: TalentNode): string[] {
  const lines: string[] = [];
  const branch = branchName(classKey, node);
  if (node.branchPoints !== undefined && branch !== undefined) {
    lines.push(`Needs ${node.branchPoints} points in ${branch}. Only one capstone.`);
  } else if (node.chooseGroup !== undefined) {
    lines.push('Choose one of the pair.');
  }
  return lines;
}

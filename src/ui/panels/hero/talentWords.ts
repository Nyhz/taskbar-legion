import type { AbilityDef, AbilityTarget } from '@/data/abilities';
import type { TalentNode, TalentNodeKind } from '@/data/talents';
import { abilityAuraFact, abilityEffectFacts, type EffectFact, type LifeBasis } from '@/sim/abilityFacts';
import { format } from '@/sim/num';
import type { EffectiveStats } from '@/sim/stats';
import type { SpendBlock } from '@/sim/talentRules';
import { nodeRequirement, type RoleUnit } from '@/sim/talentFacts';
import { abilityName, getLanguage, statLabel, t, talentBranchName, talentNodeName, type PlainTextKey } from '@/i18n';

// The words of the talents wing, in the player's language. The simulation hands over FACTS (why a point is
// refused, what each effect of an ability does at a rank: sim/talentRules, sim/talentFacts, sim/abilityFacts)
// and this module writes them. Pure — no React — and total: an unknown key gives a sensible line, never a throw.

const KIND_TEXT: Record<TalentNodeKind, PlainTextKey> = {
  ability: 'talents.ability',
  passive: 'talents.passive',
  role: 'talents.kindRole',
  modifier: 'talents.kindModifier',
  capstone: 'talents.kindCapstone',
};

/** What kind of node it is: "Ability", "Role talent"… */
export function nodeKindName(kind: TalentNodeKind): string {
  return t(KIND_TEXT[kind]);
}

const TARGET_TEXT: Record<AbilityTarget, PlainTextKey> = {
  self: 'talents.targetSelf',
  lowestAllyHp: 'talents.targetLowestAlly',
  lowestOtherAlly: 'talents.targetLowestOtherAlly',
  frontEnemy: 'talents.targetFrontEnemy',
  backEnemy: 'talents.targetBackEnemy',
  meleeEnemies: 'talents.targetMeleeEnemies',
  allEnemies: 'talents.targetAllEnemies',
  allAllies: 'talents.targetAllAllies',
  randomDpsAlly: 'talents.targetRandomDps',
  twoDpsAllies: 'talents.targetTwoHeroes',
  tank: 'talents.targetTank',
};

/** Who an ability (or one of its effects) lands on. */
export function targetName(target: AbilityTarget): string {
  return t(TARGET_TEXT[target]);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** A name mid-sentence: Spanish writes it in lower case ("+10 % de armadura"), English keeps its capitals. */
function inSentence(name: string): string {
  return getLanguage() === 'es' ? lowerFirst(name) : name;
}

/** A number as the language writes it: Spanish uses a decimal comma. At most `digits` decimals, none wasted. */
export function figure(value: number, digits = 1): string {
  const text = String(+value.toFixed(digits));
  return getLanguage() === 'es' ? text.replace('.', ',') : text;
}

/** A signed amount with its unit: "+12 %", "−3", "+0.05 %/s". */
export function signed(value: number, unit: '' | ' %' | ' %/s', digits = 2): string {
  return `${value < 0 ? '−' : '+'}${figure(Math.abs(value), digits)}${unit}`;
}

/** The unit of a role talent's value. */
export function roleUnit(unit: RoleUnit): ' %' | ' %/s' {
  return unit === 'percentPerSecond' ? ' %/s' : ' %';
}

/** Why a point cannot go into a node, in words. `node` is the node asked about (for its branch). */
export function spendBlockLine(classKey: string, block: SpendBlock, node?: TalentNode): string {
  switch (block.reason) {
    case 'unknownNode':
      return t('talents.blockGone');
    case 'maxRank':
    case 'noPoints':
      return ''; // being full, or having nothing to spend, is not worth a warning
    case 'tierLocked':
      return t('talents.tierNeeds', { n: block.need });
    case 'abilityCap':
      return t('talents.capFull', { max: block.max });
    case 'needsAbility':
      return t('talents.needsAbility', { name: abilityName(block.abilityKey) });
    case 'chooseOne':
      return t('talents.chooseOneTaken', { name: talentNodeName(classKey, block.otherKey) });
    case 'branchPoints':
      return t('talents.branchPointsShort', {
        need: block.need,
        have: block.have,
        branch: node === undefined ? t('talents.branch') : talentBranchName(classKey, node.lane),
      });
  }
}

/** What a node asks for beyond its tier, in words: a capstone's branch points, a "choose one" pair. */
export function nodeRequirementLine(classKey: string, node: TalentNode): string | undefined {
  const req = nodeRequirement(classKey, node);
  if (req === undefined) return undefined;
  return req.type === 'capstone'
    ? t('talents.capstoneNeeds', { n: req.points, branch: talentBranchName(classKey, req.branch.key) })
    : t('talents.chooseOnePair');
}

const LIFE_TEXT: Record<LifeBasis, PlainTextKey> = {
  self: 'talents.lifeSelf',
  tank: 'talents.lifeTank',
  target: 'talents.lifeTarget',
};

/** A damage amount, shortened ("1.48K"), with the language's decimal mark. */
function amount(value: number): string {
  const text = format(Math.round(value));
  return getLanguage() === 'es' ? text.replace('.', ',') : text;
}

function seconds(ms: number): string {
  return figure(ms / 1000, 1);
}

function factLine(fact: EffectFact): string {
  switch (fact.type) {
    case 'damage': {
      const n = amount(fact.amount);
      return fact.crit === 'always' ? t('talents.fxDamageAlwaysCrit', { n }) : fact.crit === 'can' ? t('talents.fxDamageCrit', { n }) : t('talents.fxDamage', { n });
    }
    case 'dot':
      return t('talents.fxDot', { n: amount(fact.amount), s: seconds(fact.ms) });
    case 'heal':
      return t('talents.fxHeal', { pct: figure(fact.pct), life: t(LIFE_TEXT[fact.of]) });
    case 'hot':
      return t('talents.fxHot', { pct: figure(fact.pct), life: t(LIFE_TEXT[fact.of]), s: seconds(fact.ms) });
    case 'shield':
      return t('talents.fxShield', { pct: figure(fact.pct), life: t(LIFE_TEXT[fact.of]), s: seconds(fact.ms) });
    case 'stat':
      return t('talents.fxStat', {
        value: signed(fact.value, fact.percent ? ' %' : '', 1),
        stat: inSentence(statLabel(fact.stat)),
        s: seconds(fact.ms),
      });
    case 'weaken':
      return t('talents.fxWeaken', { pct: figure(fact.pct), s: seconds(fact.ms) });
    case 'vulnerable':
      return t('talents.fxVulnerable', { pct: figure(fact.pct), s: seconds(fact.ms) });
    case 'root':
      return t('talents.fxRoot', { s: seconds(fact.ms) });
    case 'silence':
      return t('talents.fxSilence', { s: seconds(fact.ms) });
  }
}

/** One line per effect of an ability at a rank and the hero's stats, the party aura (if it is one) first. An
 *  effect with a target of its own says who it lands on; a probabilistic one, its chance. */
export function abilityLines(ability: AbilityDef, rank: number, stats: EffectiveStats, healEff: number): string[] {
  const lines: string[] = [];
  const aura = abilityAuraFact(ability, rank);
  if (aura !== null) {
    lines.push(t('talents.fxAura', { value: signed(aura.value, aura.percent ? ' %' : '', 1), stat: inSentence(statLabel(aura.stat)) }));
  }
  for (const fact of abilityEffectFacts(ability, rank, stats, healEff)) {
    let line = factLine(fact);
    if (fact.on !== undefined) line = `${line} (${lowerFirst(targetName(fact.on))})`;
    if (fact.chance !== undefined) line = t('talents.fxChance', { pct: figure(fact.chance * 100, 0), line });
    lines.push(line);
  }
  return lines;
}

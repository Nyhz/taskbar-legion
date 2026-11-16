import type { AbilityDef, AbilityTarget } from '@/data/abilities';
import type { TalentNode, TalentNodeKind } from '@/data/talents';
import {
  abilityAuraFact, abilityEffectFacts, abilityFireFact, ultimateFireFact,
  type EffectFact, type FireFact, type LifeBasis,
} from '@/sim/abilityFacts';
import type { FireRule } from '@/data/abilities';
import type { UltimateDef, UltimatePatch } from '@/data/ultimates';
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

// Hero abilities only: a target only enemies use has no line here and falls back to the front enemy's.
const TARGET_TEXT: Partial<Record<AbilityTarget, PlainTextKey>> = {
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
  priorityEnemy: 'talents.targetPriority',
  biggestCluster: 'talents.targetCluster',
  mostHitAlly: 'talents.targetMostHit',
  hurtAlly: 'talents.targetHurt',
  harmedAlly: 'talents.targetHarmed',
  triageAlly: 'talents.targetTriage',
  nextHurtAlly: 'talents.targetNextHurt',
};

/** Who an ability (or one of its effects) lands on. */
export function targetName(target: AbilityTarget): string {
  return t(TARGET_TEXT[target] ?? 'talents.targetFrontEnemy');
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
    case 'cleanse':
      if (!Number.isFinite(fact.count)) return t('talents.fxCleanseAll');
      return fact.count <= 1 ? t('talents.fxCleanse') : t('talents.fxCleanseMany', { n: fact.count });
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

function ruleLine(rule: FireRule): string {
  switch (rule.when) {
    case 'inReach':
      return rule.foes <= 1 ? t('talents.firesReach') : t('talents.firesReachSeveral', { n: rule.foes });
    case 'worthIt':
      return t('talents.firesWorthIt', { n: rule.foes });
    case 'cluster':
      return t('talents.firesCluster', { n: rule.foes });
    case 'selfHit':
      return t('talents.firesSelfHit');
    case 'partyHit':
      return rule.atAreaBlow === true ? t('talents.firesPartyHitBoss') : t('talents.firesPartyHit');
    case 'allyHit':
      return t('talents.firesAllyHit');
    case 'allyBelow':
      return rule.orHeavyHit === true
        ? t('talents.firesAllyBelowOrHit', { pct: figure(rule.frac * 100, 0) })
        : t('talents.firesAllyBelow', { pct: figure(rule.frac * 100, 0) });
    case 'partyHurt':
      return rule.orHarmed !== undefined
        ? t('talents.firesPartyHurtOrHarmed', { n: rule.allies, pct: figure(rule.frac * 100, 0), low: figure(rule.orOneBelow * 100, 0), h: rule.orHarmed })
        : t('talents.firesPartyHurt', { n: rule.allies, pct: figure(rule.frac * 100, 0), low: figure(rule.orOneBelow * 100, 0) });
    case 'harmedOrBelow':
      return rule.orHeavyHit === true
        ? t('talents.firesHarmedOrHit', { pct: figure(rule.frac * 100, 0) })
        : t('talents.firesHarmed', { pct: figure(rule.frac * 100, 0) });
    case 'bossWindup':
      return rule.heavy === true ? t('talents.firesBossWindupHeavy') : t('talents.firesBossWindup');
  }
}

function fireFactLine(fact: FireFact): string {
  if (fact.when === 'ready') return t('talents.firesReady');
  if (fact.when === 'charged') {
    // A charge ability with a plain "an enemy in reach" rule only needs its charges said.
    const rule = fact.rule;
    const extra = rule === undefined || (rule.when === 'inReach' && rule.foes <= 1) ? '' : ` ${ruleLine(rule)}`;
    return `${t('talents.firesCharged', { n: fact.charges })}${extra}`;
  }
  return ruleLine(fact);
}

/** WHEN an ability fires, in words — the tooltip's "When it fires" line: its rule, and its rule against a boss when
 *  it has one of its own (round 7: one trigger for the waves, another for the bosses). */
export function fireLine(ability: AbilityDef): string {
  const line = fireFactLine(abilityFireFact(ability));
  const boss = ability.firesBoss;
  if (boss === undefined || boss.length === 0) return line;
  const rules = boss.map((r) => lowerFirst(ruleLine(r).replace(/\.$/, '')));
  return `${line} ${t('talents.firesAgainstBoss', { rule: rules.join(t('talents.firesOr')) })}`;
}

/** When a class ultimate fires, in words; `patch` is the capstone the hero holds (elites too). */
export function ultimateFireLine(ultimate: UltimateDef, patch?: UltimatePatch): string {
  const fact = ultimateFireFact(ultimate, patch);
  if (fact.when === 'lethal') return t('talents.firesLethal', { n: fact.perStage });
  return fact.elites ? t('talents.firesBossOrElite') : t('talents.firesBoss');
}

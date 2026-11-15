import type { TalentNode } from '@/data/talents';
import { TARGET_LABEL, tryAbilityDef, type AbilityDef } from '@/data/abilities';
import { ULTIMATES } from '@/data/ultimates';
import { NODE_KIND_LABEL, nodeRequirementLines, roleValue } from '@/sim/talentText';
import { healPowerEffectiveness } from '@/data/difficulties';
import { abilityAuraLine, abilityCooldownMs, abilityEffectLines } from '@/sim/abilities';
import { heroAbilities } from '@/sim/loadout';
import type { EffectiveStats } from '@/sim/stats';
import { useStore } from '@/state/store';
import { statLabel, useT, type PlainTextKey } from '@/i18n';
import { Tip, TipLine, TipName, TipSub, TipText, TipTitle, TipWarn, type TipSide } from '@/ui/kit';

// The tooltip of a talent node. An ability says who it targets, how often it fires (cooldown with the hero's
// reduction, or its charge, or "aura"), what each effect does at the hero's CURRENT stats and rank (with the
// modifiers the hero holds), and what the next point would add. A passive or a role talent says its value per
// rank, now, next and at the top. A modifier says which ability it changes; a capstone what it needs.
//
// Names, descriptions and effect lines of abilities, role talents, modifiers and capstones still come in
// ENGLISH from data/ and sim/: they join the language dictionaries when the class kits are approved
// (docs/redesign/I18N.md). The two targets the redesign added have no dictionary entry yet either.

const TARGET_TEXT: Partial<Record<AbilityDef['target'], PlainTextKey>> = {
  self: 'talents.targetSelf',
  lowestAllyHp: 'talents.targetLowestAlly',
  frontEnemy: 'talents.targetFrontEnemy',
  meleeEnemies: 'talents.targetMeleeEnemies',
  allEnemies: 'talents.targetAllEnemies',
  allAllies: 'talents.targetAllAllies',
  randomDpsAlly: 'talents.targetRandomDps',
  tank: 'talents.targetTank',
};

export interface TalentsTipProps {
  classKey: string;
  /** The hero's talents: an ability is described as this hero casts it, with the modifiers it holds. */
  talents: Record<string, number>;
  node: TalentNode;
  rank: number;
  /** The hero's effective stats (gear + talents + account), for the ability figures. */
  stats: EffectiveStats;
  side: TipSide;
  /** Why the node cannot be raised now, already translated (closed tier, two abilities learned). */
  blocked?: string | undefined;
}

export function TalentsTip(props: TalentsTipProps): React.JSX.Element {
  const { node } = props;
  if (node.kind === 'ability' && node.abilityKey !== undefined) {
    // The ability as THIS hero casts it (its modifiers applied); a stale key falls through to the plain tip.
    const mine = heroAbilities(props.classKey, props.talents).find((a) => a.def.key === node.abilityKey);
    const ability = mine?.def ?? tryAbilityDef(node.abilityKey);
    if (ability !== undefined) return <AbilityTip {...props} ability={ability} />;
  }
  if (node.kind === 'modifier' || node.kind === 'capstone') return <SpecialTip {...props} />;
  return <PassiveTip {...props} />;
}

function seconds(ms: number, digits: number): string {
  return (ms / 1000).toFixed(digits);
}

function AbilityTip({
  node,
  rank,
  stats,
  side,
  blocked,
  ability,
}: TalentsTipProps & { ability: AbilityDef }): React.JSX.Element {
  const t = useT();
  // Heals are shown as they would land HERE: each difficulty devalues heal power (combat resolves it the same).
  const healEff = healPowerEffectiveness(useStore((s) => s.hud.globalStage));
  const shown = Math.max(1, rank);
  // A node without points already previews rank 1, so a separate "next" block only makes sense from rank 1 on.
  const next = rank >= 1 && rank < node.maxRank ? rank + 1 : null;
  const linesAt = (r: number): string[] => {
    const aura = abilityAuraLine(ability, r);
    const lines = abilityEffectLines(ability, r, stats, stats.health, healEff);
    return aura !== null ? [aura, ...lines] : lines;
  };
  const targetKey = TARGET_TEXT[ability.target];
  const cdMs = abilityCooldownMs(ability, shown, stats);
  const reduced = cdMs < ability.cooldownMs - 1;

  return (
    <Tip side={side} size="wide">
      <TipName tone="gold">{ability.name}</TipName>
      <TipSub end={`${rank} / ${node.maxRank}`}>{t('talents.ability')}</TipSub>
      <TipText>{ability.desc}</TipText>
      <TipLine label={t('talents.target')} value={targetKey !== undefined ? t(targetKey) : TARGET_LABEL[ability.target]} />
      {ability.aura !== undefined ? (
        <TipLine label={t('talents.kind')} value={t('talents.aura')} />
      ) : ability.charge !== undefined ? (
        // Charges from attacks have a dictionary line; charges a trigger gives (blocked hits) are told by
        // the description, so only the number it fires at is shown.
        <TipLine
          label={t('talents.charge')}
          value={
            ability.charge.perAttack > 0
              ? t('talents.chargeValue', { per: ability.charge.perAttack, at: ability.charge.toCast })
              : ability.charge.toCast
          }
        />
      ) : (
        <TipLine
          label={t('talents.cooldown')}
          value={
            reduced
              ? t('talents.cooldownReduced', { s: seconds(cdMs, 1), base: seconds(ability.cooldownMs, 0) })
              : t('talents.seconds', { s: seconds(ability.cooldownMs, 0) })
          }
        />
      )}
      <div className="tk-tal-at">
        {rank === 0 ? t('talents.atFirstRank') : t('talents.atRank', { n: shown })}
      </div>
      {linesAt(shown).map((line, i) => (
        <div key={i} className="tk-tal-fx">
          {line}
        </div>
      ))}
      {next !== null && (
        <>
          <div className="tk-tal-at">{t('talents.atNextRank', { n: next })}</div>
          {linesAt(next).map((line, i) => (
            <div key={i} className="tk-tal-fx next">
              {line}
            </div>
          ))}
        </>
      )}
      {blocked !== undefined && <TipWarn>{blocked}</TipWarn>}
    </Tip>
  );
}

/** A modifier or a capstone: one point, described in words. */
function SpecialTip({ classKey, node, rank, side, blocked }: TalentsTipProps): React.JSX.Element {
  const changes =
    node.kind === 'modifier'
      ? node.modifies === undefined ? undefined : tryAbilityDef(node.modifies)?.name
      : ULTIMATES[classKey]?.name;
  return (
    <Tip side={side} size="wide">
      <TipName tone="gold">{node.name}</TipName>
      <TipSub end={`${rank} / ${node.maxRank}`}>
        {changes === undefined ? NODE_KIND_LABEL[node.kind] : `${NODE_KIND_LABEL[node.kind]} · ${changes}`}
      </TipSub>
      {node.desc !== undefined && <TipText>{node.desc}</TipText>}
      {nodeRequirementLines(classKey, node).map((line) => (
        <TipText key={line}>{line}</TipText>
      ))}
      {blocked !== undefined && <TipWarn>{blocked}</TipWarn>}
    </Tip>
  );
}

/** A stat passive or a role talent: its value per rank, now, next and at the top. */
function PassiveTip({ node, rank, side, blocked }: TalentsTipProps): React.JSX.Element {
  const t = useT();
  const p = node.passive;
  const role = node.role === undefined ? undefined : roleValue(node.role);
  if (p === undefined && role === undefined) {
    return (
      <Tip side={side}>
        <TipTitle>{node.name}</TipTitle>
      </Tip>
    );
  }
  // The NODE's mode, not the stat's native kind: flat-origin stats (health, armour, magic resist, attack damage)
  // are PERCENT talent nodes (data/talentSpec `stat`).
  const unit = role !== undefined ? role.unit : p?.mode === 'percent' ? ' %' : '';
  const perRank = role !== undefined ? role.perRank : (p?.valuePerRank ?? 0);
  const amount = (ranks: number): string => {
    const v = perRank * ranks;
    return `+${Number.isInteger(v) ? String(v) : String(+v.toFixed(2))}${unit}`;
  };
  return (
    <Tip side={side} size={role !== undefined ? 'wide' : undefined}>
      <TipTitle>{p !== undefined ? statLabel(p.stat) : node.name}</TipTitle>
      {role !== undefined && node.desc !== undefined && <TipText>{node.desc}</TipText>}
      <TipLine label={role !== undefined ? NODE_KIND_LABEL.role : t('talents.passive')} value={`${rank} / ${node.maxRank}`} />
      <TipLine label={t('talents.perRank')} value={amount(1)} />
      {rank > 0 && <TipLine label={t('talents.now')} value={amount(rank)} />}
      {rank < node.maxRank && <TipLine label={t('talents.nextRank')} value={amount(rank + 1)} tone="good" />}
      <TipLine label={t('talents.atMax')} value={amount(node.maxRank)} />
      {blocked !== undefined && <TipWarn>{blocked}</TipWarn>}
    </Tip>
  );
}

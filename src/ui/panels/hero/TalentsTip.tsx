import type { TalentNode } from '@/data/talents';
import { tryAbilityDef, type AbilityDef } from '@/data/abilities';
import { healPowerEffectiveness } from '@/data/difficulties';
import { abilityAuraLine, abilityCooldownMs, abilityEffectLines } from '@/sim/abilities';
import type { EffectiveStats } from '@/sim/stats';
import { useStore } from '@/state/store';
import { statLabel, useT, type PlainTextKey } from '@/i18n';
import { Tip, TipLine, TipName, TipSub, TipText, TipTitle, TipWarn, type TipSide } from '@/ui/kit';

// The tooltip of a talent node. An ability says who it targets, how often it fires (cooldown with the hero's
// reduction, or its charge, or "aura"), what each effect does at the hero's CURRENT stats and rank, and what the
// next point would add. A passive says its value per rank, now, next and at the top.
//
// The ability's name, its description and its effect lines still come in ENGLISH from data/ and sim/: they join
// the language dictionaries when the class redesign lands (docs/redesign/I18N.md).

const TARGET_TEXT: Record<AbilityDef['target'], PlainTextKey> = {
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
  node: TalentNode;
  rank: number;
  /** The hero's effective stats (gear + talents + account), for the ability figures. */
  stats: EffectiveStats;
  side: TipSide;
  /** Why the node cannot be raised now, already translated (closed tier, two abilities learned). */
  blocked?: string | undefined;
}

export function TalentsTip(props: TalentsTipProps): React.JSX.Element {
  const ability =
    props.node.kind === 'ability' && props.node.abilityKey !== undefined
      ? tryAbilityDef(props.node.abilityKey)
      : undefined;
  return ability !== undefined ? <AbilityTip {...props} ability={ability} /> : <PassiveTip {...props} />;
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
  const cdMs = abilityCooldownMs(ability, shown, stats);
  const reduced = cdMs < ability.cooldownMs - 1;

  return (
    <Tip side={side} size="wide">
      <TipName tone="gold">{ability.name}</TipName>
      <TipSub end={`${rank} / ${node.maxRank}`}>{t('talents.ability')}</TipSub>
      <TipText>{ability.desc}</TipText>
      <TipLine label={t('talents.target')} value={t(TARGET_TEXT[ability.target])} />
      {ability.aura !== undefined ? (
        <TipLine label={t('talents.kind')} value={t('talents.aura')} />
      ) : ability.charge !== undefined ? (
        <TipLine
          label={t('talents.charge')}
          value={t('talents.chargeValue', { per: ability.charge.perAttack, at: ability.charge.toCast })}
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

function PassiveTip({ node, rank, side, blocked }: TalentsTipProps): React.JSX.Element {
  const t = useT();
  const p = node.passive;
  if (p === undefined) {
    return (
      <Tip side={side}>
        <TipTitle>{node.name}</TipTitle>
      </Tip>
    );
  }
  // The NODE's mode, not the stat's native kind: flat-origin stats (health, armour, magic resist, attack damage)
  // are PERCENT talent nodes (data/talents FLAT_TO_PERCENT).
  const unit = p.mode === 'percent' ? ' %' : '';
  const amount = (ranks: number): string => {
    const v = p.valuePerRank * ranks;
    return `+${Number.isInteger(v) ? String(v) : v.toFixed(1)}${unit}`;
  };
  return (
    <Tip side={side}>
      <TipTitle>{statLabel(p.stat)}</TipTitle>
      <TipLine label={t('talents.passive')} value={`${rank} / ${node.maxRank}`} />
      <TipLine label={t('talents.perRank')} value={amount(1)} />
      {rank > 0 && <TipLine label={t('talents.now')} value={amount(rank)} />}
      {rank < node.maxRank && <TipLine label={t('talents.nextRank')} value={amount(rank + 1)} tone="good" />}
      <TipLine label={t('talents.atMax')} value={amount(node.maxRank)} />
      {blocked !== undefined && <TipWarn>{blocked}</TipWarn>}
    </Tip>
  );
}

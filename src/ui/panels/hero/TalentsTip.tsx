import type { TalentNode } from '@/data/talents';
import { tryAbilityDef, type AbilityDef } from '@/data/abilities';
import { roleValue } from '@/sim/talentFacts';
import { abilityCooldownMs } from '@/sim/abilities';
import { heroAbilities } from '@/sim/loadout';
import type { EffectiveStats } from '@/sim/stats';
import { abilityDescription, abilityName, talentNodeDescription, talentNodeName, ultimateName, useT } from '@/i18n';
import { Tip, TipLine, TipName, TipSub, TipText, TipTitle, TipWarn, type TipSide } from '@/ui/kit';
import {
  abilityLines, figure, fireLine, nodeKindName, nodeRequirementLine, roleUnit, signed, targetName,
} from './talentWords';

// The tooltip of a talent node. An ability says who it targets, how often it fires (cooldown with the hero's
// reduction, or its charge, or "aura"), what each effect does at the hero's CURRENT stats and rank (with the
// modifiers the hero holds), and what the next point would add. A passive or a role talent says its value per
// rank, now, next and at the top. A modifier says which ability it changes; a capstone what it needs.
//
// Every word is in the player's language: names and descriptions through i18n/names (data dictionaries), the
// lines written from the simulation's facts through ./talentWords.

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
  return figure(ms / 1000, digits);
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
  const shown = Math.max(1, rank);
  // A node without points already previews rank 1, so a separate "next" block only makes sense from rank 1 on.
  const next = rank >= 1 && rank < node.maxRank ? rank + 1 : null;
  const linesAt = (r: number): string[] => abilityLines(ability, r, stats);
  const cdMs = abilityCooldownMs(ability, shown, stats);
  const reduced = cdMs < ability.cooldownMs - 1;

  return (
    <Tip side={side} size="wide">
      <TipName tone="gold">{abilityName(ability.key)}</TipName>
      <TipSub end={`${rank} / ${node.maxRank}`}>{t('talents.ability')}</TipSub>
      <TipText>{abilityDescription(ability.key)}</TipText>
      <TipLine label={t('talents.target')} value={targetName(ability.target)} />
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
      {ability.aura === undefined && (
        <>
          <div className="tk-tal-at">{t('talents.fires')}</div>
          <div className="tk-tal-fx">{fireLine(ability)}</div>
        </>
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
  const changes = node.kind === 'modifier' ? (node.modifies === undefined ? '' : abilityName(node.modifies)) : ultimateName(classKey);
  const kind = nodeKindName(node.kind);
  const desc = talentNodeDescription(classKey, node.key);
  const needs = nodeRequirementLine(classKey, node);
  return (
    <Tip side={side} size="wide">
      <TipName tone="gold">{talentNodeName(classKey, node.key)}</TipName>
      <TipSub end={`${rank} / ${node.maxRank}`}>{changes === '' ? kind : `${kind} · ${changes}`}</TipSub>
      {desc !== undefined && <TipText>{desc}</TipText>}
      {needs !== undefined && <TipText>{needs}</TipText>}
      {blocked !== undefined && <TipWarn>{blocked}</TipWarn>}
    </Tip>
  );
}

/** A stat passive or a role talent: its value per rank, now, next and at the top. */
function PassiveTip({ classKey, node, rank, side, blocked }: TalentsTipProps): React.JSX.Element {
  const t = useT();
  const p = node.passive;
  const role = node.role === undefined ? undefined : roleValue(node.role);
  const name = talentNodeName(classKey, node.key);
  if (p === undefined && role === undefined) {
    return (
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
      </Tip>
    );
  }
  // The NODE's mode, not the stat's native kind: flat-origin stats (health, armour, magic resist, attack damage)
  // are PERCENT talent nodes (data/talentSpec `stat`).
  const unit = role !== undefined ? roleUnit(role.unit) : p?.mode === 'percent' ? ' %' : '';
  const perRank = role !== undefined ? role.perRank : (p?.valuePerRank ?? 0);
  const amount = (ranks: number): string => signed(perRank * ranks, unit);
  const desc = role === undefined ? undefined : talentNodeDescription(classKey, node.key);
  return (
    <Tip side={side} size={role !== undefined ? 'wide' : undefined}>
      <TipTitle>{name}</TipTitle>
      {desc !== undefined && <TipText>{desc}</TipText>}
      <TipLine label={nodeKindName(node.kind === 'role' ? 'role' : 'passive')} value={`${rank} / ${node.maxRank}`} />
      <TipLine label={t('talents.perRank')} value={amount(1)} />
      {rank > 0 && <TipLine label={t('talents.now')} value={amount(rank)} />}
      {rank < node.maxRank && <TipLine label={t('talents.nextRank')} value={amount(rank + 1)} tone="good" />}
      <TipLine label={t('talents.atMax')} value={amount(node.maxRank)} />
      {blocked !== undefined && <TipWarn>{blocked}</TipWarn>}
    </Tip>
  );
}

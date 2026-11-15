import type { TalentNode } from '@/data/talents';
import type { SpendCheck } from '@/sim/talentRules';
import type { EffectiveStats } from '@/sim/stats';
import { talentNodeName } from '@/i18n';
import { Node, type NodeKind, type NodeState, type TipSide } from '@/ui/kit';
import { talentNodeArtStem } from '@/ui/abilityArt';
import { TalentsTip } from './TalentsTip';
import { hasPips, type PlacedNode } from './talentsLayout';
import { spendBlockLine } from './talentWords';

// One node of the talents wing. The frame says the kind: a plate for an ability, a round seal for a stat passive,
// a seal with four points for a ROLE talent — and the same pointed seal, a size down, for an EFFECT passive —, the teal plate for a modifier, the octagon for a capstone. Its
// sign comes from ui/abilityArt.talentNodeArtStem (stand-ins for role talents, modifiers and capstones until
// theirs are drawn).
//
// A node that cannot take a point now (its tier is closed, two abilities are already learned, its ability is
// missing, the other of its pair is taken, its branch is short of points) is dimmed and does not answer a
// click; its tooltip says why — sim/talentRules.canSpend gives the reason, ./talentWords the sentence.

const FRAME: Record<TalentNode['kind'], NodeKind> = {
  ability: 'ability',
  passive: 'passive',
  role: 'role',
  modifier: 'modifier',
  capstone: 'ultimate',
};

export interface TalentsTabNodeProps {
  classKey: string;
  talents: Record<string, number>;
  placed: PlacedNode;
  /** What sim/talentRules.canSpend says about putting a point here. */
  check: SpendCheck;
  stats: EffectiveStats;
  side: TipSide;
  onSpend: () => void;
  onRefund: () => void;
}

export function TalentsTabNode({ classKey, talents, placed, check, stats, side, onSpend, onRefund }: TalentsTabNodeProps): React.JSX.Element {
  const node = placed.node;
  const rank = talents[node.key] ?? 0;
  const state: NodeState = rank >= node.maxRank ? 'max' : rank > 0 ? 'on' : 'off';
  // Why it cannot be raised, in words. Having no points to spend, or being full, is not worth a warning.
  const why = check.ok ? '' : spendBlockLine(classKey, check, node);
  const blocked = why === '' ? undefined : why;
  const locked = blocked !== undefined;
  const sign = talentNodeArtStem(classKey, node);
  const name = talentNodeName(classKey, node.key);
  const pips = hasPips(node) ? { rank, max: node.maxRank } : undefined;
  const style = { left: placed.x, top: placed.y };
  const refund = (e: React.MouseEvent): void => {
    e.preventDefault();
    onRefund();
  };
  const tip = <TalentsTip classKey={classKey} talents={talents} node={node} rank={rank} stats={stats} side={side} blocked={blocked} />;

  return (
    <Node
      kind={node.kind === 'passive' && node.role !== undefined ? 'effect' : FRAME[node.kind]}
      state={state}
      sign={sign}
      alt={name}
      locked={locked}
      pips={pips}
      onClick={check.ok ? onSpend : undefined}
      onContextMenu={refund}
      style={style}
    >
      {tip}
    </Node>
  );
}

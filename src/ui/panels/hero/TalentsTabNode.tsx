import type { TalentNode } from '@/data/talents';
import { MAX_ACTIVE_ABILITIES, type SpendCheck } from '@/sim/talentRules';
import { spendBlockLine } from '@/sim/talentText';
import type { EffectiveStats } from '@/sim/stats';
import { useT } from '@/i18n';
import { Node, type NodeKind, type NodeState, type TipSide } from '@/ui/kit';
import { talentNodeArtStem } from '@/ui/abilityArt';
import { TalentsTip } from './TalentsTip';
import { hasPips, type PlacedNode } from './talentsLayout';

// One node of the talents wing. The frame says the kind (kit `Node`): a plate for an ability, a seal for a
// passive or a role talent (a role talent wears a ring), the teal plate for a modifier, the octagon for a
// capstone. Its sign comes from ui/abilityArt.talentNodeArtStem (stand-ins for role talents, modifiers and
// capstones until theirs are drawn).

const FRAME: Record<TalentNode['kind'], NodeKind> = {
  ability: 'ability',
  passive: 'passive',
  role: 'passive',
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
  const t = useT();
  const node = placed.node;
  const rank = talents[node.key] ?? 0;
  const state: NodeState = rank >= node.maxRank ? 'max' : rank > 0 ? 'on' : 'off';
  // Why it cannot be raised, in words. Having no points to spend, or being full, is not worth a warning.
  const blocked =
    check.ok || check.reason === 'noPoints' || check.reason === 'maxRank'
      ? undefined
      : check.reason === 'tierLocked'
        ? t('talents.tierNeeds', { n: check.need })
        : check.reason === 'abilityCap'
          ? t('talents.capFull', { max: MAX_ACTIVE_ABILITIES })
          : spendBlockLine(classKey, check, node);
  return (
    <Node
      kind={FRAME[node.kind]}
      state={state}
      sign={talentNodeArtStem(classKey, node)}
      alt={node.name}
      locked={blocked !== undefined}
      pips={hasPips(node) ? { rank, max: node.maxRank } : undefined}
      onClick={check.ok ? onSpend : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onRefund();
      }}
      className={node.kind === 'role' ? 'role' : undefined}
      style={{ left: placed.x, top: placed.y }}
    >
      <TalentsTip classKey={classKey} talents={talents} node={node} rank={rank} stats={stats} side={side} blocked={blocked} />
    </Node>
  );
}

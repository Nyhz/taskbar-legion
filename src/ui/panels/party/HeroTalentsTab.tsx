import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/state/store';
import { talentTree, rowUnlockThreshold, type TalentNode } from '@/data/talents';
import { abilityDef } from '@/data/abilities';
import { STAT_ICON, abilityIcon } from '@/ui/icons';
import { aggregate, type EffectiveStats } from '@/sim/stats';
import { heroBaseStats, equipmentMods, talentPassiveMods, heroAbilities, canLearnNewAbility, MAX_ACTIVE_ABILITIES } from '@/sim/loadout';
import { getBonuses } from '@/sim/bonuses';
import { TalentTooltip } from './TalentTooltip';
import { PALETTE } from '@/styles/palette';

// Talents tab: the hero's 10-ROW tree (TALENTS.md) as an ICON grid. Each node is an
// icon with a rank badge; hover shows the value scaled to the hero's current stats;
// left-click ranks it up. Row N unlocks at (N-1)*10 points spent. Free respec (v1).

const TIP_W = 226;

export function HeroTalentsTab({ heroId }: { heroId: string }): React.JSX.Element {
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const spendTalent = useStore((s) => s.spendTalent);
  const refundTalent = useStore((s) => s.refundTalent);
  const respec = useStore((s) => s.respec);
  if (hero === undefined) return <div>No hero.</div>;

  const tree = talentTree(hero.classKey);
  const spent = Object.values(hero.talents).reduce((a, b) => a + b, 0);
  // The ranked ability nodes ARE the active loadout — capped at MAX_ACTIVE_ABILITIES. Once
  // the cap is hit, learning a NEW ability (a rank-0 ability node) is blocked.
  const abilityCount = heroAbilities(hero.classKey, hero.talents).length;
  const canLearnNew = canLearnNewAbility(hero.classKey, hero.talents);
  const bonuses = getBonuses(techRanks, ownedPets);
  const mods = [...equipmentMods(hero.equipment), ...talentPassiveMods(hero.classKey, hero.talents), ...bonuses.combatMods];
  const stats = aggregate(heroBaseStats(hero.classKey, hero.level), mods);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: PALETTE.textMute, fontSize: 11 }}>Spent {spent}</span>
        <span title="Ability nodes you've ranked. These are your active skills — capped, so choose your two." style={{ color: abilityCount >= MAX_ACTIVE_ABILITIES ? PALETTE.gold : PALETTE.textMute, fontSize: 11 }}>
          Abilities {abilityCount}/{MAX_ACTIVE_ABILITIES}
        </span>
        <span style={{ color: PALETTE.xpBlue, fontSize: 11 }}>Points {hero.talentPoints}</span>
      </div>

      {tree.rows.map((row, ri) => {
        const threshold = rowUnlockThreshold(ri);
        const locked = spent < threshold;
        return (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: locked ? 0.45 : 1, borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4 }}>
            <span style={{ width: 30, fontSize: 9, color: PALETTE.textMute, lineHeight: 1.1 }}>
              {locked ? `🔒${threshold}` : `R${ri + 1}`}
            </span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {row.map((node) => {
                const rank = hero.talents[node.key] ?? 0;
                // An unranked ability is locked once the active-ability cap is reached.
                const abilityCapped = node.kind === 'ability' && rank === 0 && !canLearnNew;
                return (
                  <NodeIcon
                    key={node.key}
                    node={node}
                    rank={rank}
                    stats={stats}
                    canBuy={!locked && !abilityCapped && hero.talentPoints > 0 && rank < node.maxRank}
                    abilityCapped={abilityCapped}
                    onBuy={() => spendTalent(hero.id, node.key)}
                    onRefund={() => refundTalent(hero.id, node.key)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={() => respec(hero.id)} style={{ padding: 4, marginTop: 2, background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: PALETTE.textLight, fontSize: 11 }}>
        ↺ Respec (free)
      </button>
    </div>
  );
}

function NodeIcon({
  node,
  rank,
  stats,
  canBuy,
  abilityCapped = false,
  onBuy,
  onRefund,
}: {
  node: TalentNode;
  rank: number;
  stats: EffectiveStats;
  canBuy: boolean;
  abilityCapped?: boolean;
  onBuy: () => void;
  onRefund: () => void;
}): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);

  const isAbility = node.kind === 'ability';
  const icon = isAbility ? abilityIcon(abilityDef(node.abilityKey ?? '')) : node.passive ? STAT_ICON[node.passive.stat] : '✦';
  const maxed = rank >= node.maxRank;
  const started = rank > 0;
  const border = maxed ? PALETTE.hpGreen : started ? PALETTE.gold : canBuy ? PALETTE.goldDim : PALETTE.ink;
  const title = abilityCapped
    ? `Ability slots full (${MAX_ACTIVE_ABILITIES}/${MAX_ACTIVE_ABILITIES}) — refund another ability to learn this one`
    : 'Left-click: rank up · Right-click: refund 1';

  const onEnter = (): void => {
    const r = ref.current?.getBoundingClientRect();
    if (r === undefined) return;
    const left = r.left - TIP_W - 8 > 0 ? r.left - TIP_W - 8 : r.right + 8;
    const top = Math.max(4, Math.min(window.innerHeight - 170, r.top - 2));
    setTip({ left: Math.max(4, left), top });
  };

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={() => setTip(null)}
        onClick={() => canBuy && onBuy()}
        onContextMenu={(e) => { e.preventDefault(); onRefund(); }}
        title={title}
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: isAbility ? '50%' : 4,
          border: `2px solid ${border}`,
          boxShadow: started ? `0 0 7px ${maxed ? PALETTE.hpGreen : PALETTE.gold}` : 'none',
          background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
          color: PALETTE.textLight,
          fontSize: 17,
          opacity: abilityCapped ? 0.4 : 1,
          cursor: canBuy ? 'pointer' : started ? 'pointer' : 'default',
          padding: 0,
        }}
      >
        <span>{icon}</span>
        {abilityCapped && <span style={{ position: 'absolute', top: -3, left: -3, fontSize: 10 }}>🔒</span>}
        <span
          style={{
            position: 'absolute', bottom: -2, right: -2, fontSize: 9, fontWeight: 700,
            padding: '0 2px', background: PALETTE.bgPanel, border: `1px solid ${PALETTE.ink}`,
            color: maxed ? PALETTE.hpGreen : started ? PALETTE.gold : PALETTE.parchment,
          }}
        >
          {rank}/{node.maxRank}
        </span>
      </button>

      {tip !== null &&
        createPortal(
          <div style={{ position: 'fixed', left: tip.left, top: tip.top, zIndex: 9999, pointerEvents: 'none' }}>
            <TalentTooltip node={node} rank={rank} stats={stats} />
          </div>,
          document.body,
        )}
    </>
  );
}

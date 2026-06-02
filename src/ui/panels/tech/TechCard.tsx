import { nodeCost, type TechNode } from '@/data/techTree';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';
import { CATEGORY_COLOR } from './techMeta';
import { cumulativeLabel, effectUnit } from './techDisplay';

// One endlessly-rankable upgrade. Shows the cumulative bonus you own, the per-rank
// effect, the current rank, and a buy button priced for the NEXT rank. No prereqs,
// no graph — click to rank up as long as you can pay (until the optional cap). Fixed
// height so every card lines up regardless of how its label wraps.

const CARD_H = 138;

export function TechCard({
  node,
  rank,
  buyable,
  onBuy,
}: {
  node: TechNode;
  rank: number;
  buyable: boolean;
  onBuy: () => void;
}): React.JSX.Element {
  const accent = CATEGORY_COLOR[node.category];
  const maxed = rank >= node.maxRanks;
  const cost = nodeCost(node, rank);
  const owned = rank > 0;
  const capLabel = Number.isFinite(node.maxRanks) ? `${rank}/${node.maxRanks}` : `Rk ${rank}`;

  return (
    <div
      style={{
        height: CARD_H,
        display: 'flex',
        flexDirection: 'column',
        background: PALETTE.bgInset,
        border: `1px solid ${PALETTE.ink}`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: owned ? `inset 0 0 0 1px ${accent}55` : 'none',
        overflow: 'hidden',
      }}
    >
      {/* header: icon + name + rank pill. alignItems:flex-start so the name can wrap to a
          second line while the icon and rank pill stay pinned to the top edge. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 7px 4px' }}>
        <span
          style={{
            width: 26,
            height: 26,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            lineHeight: 1,
            fontSize: 15,
            background: '#15121c',
            border: `1px solid ${accent}66`,
            borderRadius: 3,
          }}
        >
          {node.icon}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflowWrap: 'anywhere',
            color: PALETTE.textLight,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {node.name}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 9,
            fontWeight: 700,
            color: owned ? accent : PALETTE.textMute,
            background: '#15121c',
            padding: '1px 4px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {capLabel}
        </span>
      </div>

      {/* headline: cumulative bonus owned + per-rank effect (fills remaining height) */}
      <div style={{ flex: 1, padding: '0 7px 4px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: owned ? accent : PALETTE.textMute, fontSize: 15, fontWeight: 700 }}>
            {cumulativeLabel(node, rank)}
          </span>
          <span style={{ color: PALETTE.textMute, fontSize: 9 }}>{owned ? effectUnit(node) : 'not owned'}</span>
        </div>
        <div style={{ color: PALETTE.textMute, fontSize: 9.5, lineHeight: 1.2, marginTop: 2 }}>
          {node.description}
        </div>
      </div>

      {/* buy button — priced for the next rank */}
      <button
        onClick={() => buyable && onBuy()}
        disabled={!buyable}
        title={maxed ? 'Fully upgraded' : buyable ? `Buy next rank for ${format(cost)}g` : `Need ${format(cost)}g`}
        style={{
          flexShrink: 0,
          margin: 0,
          padding: '5px 6px',
          border: 'none',
          borderTop: `1px solid ${PALETTE.ink}`,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: 0.3,
          cursor: buyable ? 'pointer' : 'default',
          color: maxed ? PALETTE.hpGreen : buyable ? PALETTE.ink : PALETTE.textMute,
          background: maxed ? 'transparent' : buyable ? accent : '#1a1622',
          textTransform: 'uppercase',
        }}
      >
        {maxed ? '✓ Max' : `${format(cost)}g`}
      </button>
    </div>
  );
}

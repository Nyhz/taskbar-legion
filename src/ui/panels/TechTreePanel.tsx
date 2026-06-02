import { useStore } from '@/state/store';
import { format } from '@/sim/num';
import { TECH_CATEGORIES, nodesByCategory } from '@/data/techTree';
import { CATEGORY_COLOR, CATEGORY_BLURB } from './tech/techMeta';
import { TechCard } from './tech/TechCard';
import { PALETTE } from '@/styles/palette';

// The main v1 GOLD sink, reworked into a flat catalogue of ENDLESSLY-rankable upgrades
// — one node per type, grouped into categories. No tree, no prereqs: spend gold to rank
// anything up, forever (cost grows exponentially per rank). The panel FILLS its window
// (width 100%) so the 3-column grid always fits — never any horizontal scroll.

export function TechTreePanel(): React.JSX.Element {
  const gold = useStore((s) => s.gold);
  const techRanks = useStore((s) => s.techRanks);
  const canBuyTech = useStore((s) => s.canBuyTech);
  const buyTech = useStore((s) => s.buyTech);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ color: PALETTE.textMute, fontSize: 10 }}>Every upgrade scales forever — spend gold to rank up</span>
        <span style={{ color: PALETTE.gold, fontWeight: 700 }}>💰 {format(gold)}</span>
      </div>

      <div
        className="tl-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          border: `1px solid ${PALETTE.ink}`,
          background: '#100d16',
          padding: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {TECH_CATEGORIES.map((category) => {
          const color = CATEGORY_COLOR[category];
          return (
            <section key={category}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  borderBottom: `1px solid ${color}44`,
                  paddingBottom: 3,
                  marginBottom: 8,
                }}
              >
                <span style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {category}
                </span>
                <span style={{ color: PALETTE.textMute, fontSize: 9.5 }}>{CATEGORY_BLURB[category]}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {nodesByCategory(category).map((node) => (
                  <TechCard
                    key={node.key}
                    node={node}
                    rank={techRanks[node.key] ?? 0}
                    buyable={canBuyTech(node.key)}
                    onBuy={() => buyTech(node.key)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

import type { GemInstance } from '@/data/gems';
import { GEMS } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { tierStyle } from '@/ui/tierStyle';
import { STAT_ICON } from '@/ui/icons';
import { StatRow } from './StatRow';
import { PALETTE } from '@/styles/palette';

// Hover card for a loose gem. Gems are scaler-only and grant the SAME stat(s) in ANY
// socket, so one grant block shows exactly what it adds before committing a (binding) socket.

export function GemTooltip({ gem }: { gem: GemInstance }): React.JSX.Element {
  const def = GEMS[gem.key];
  const accent = def.color;
  const rt = tierStyle(gem.tier);

  return (
    <div
      style={{
        width: 200,
        background: PALETTE.bgDeep,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 0 1px ${PALETTE.ink}, 4px 4px 0 rgba(0,0,0,0.6)`,
        fontSize: 11,
        lineHeight: 1.5,
        imageRendering: 'pixelated',
      }}
    >
      <div
        style={{
          background: PALETTE.bgInset,
          borderBottom: `2px solid ${accent}`,
          boxShadow: `inset 0 0 0 1px ${PALETTE.ink}`,
          padding: '4px 6px',
          textAlign: 'center',
          fontWeight: 700,
          color: accent,
        }}
      >
        {def.name}
      </div>

      <div style={{ padding: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <span
            style={{
              width: 26,
              height: 26,
              flexShrink: 0,
              borderRadius: '50%',
              background: accent,
              border: `2px solid ${PALETTE.ink}`,
              boxShadow: `0 0 6px ${accent}`,
            }}
          />
          <div>
            <div style={{ color: rt.color, fontWeight: 700 }} className={rt.iridescent ? 'tl-iridescent' : undefined}>
              Tier {gem.tier} Gem
            </div>
            <div style={{ color: PALETTE.textMute }}>Socket into a free gem slot</div>
          </div>
        </div>

        <div
          style={{
            color: PALETTE.gold, fontWeight: 700,
            margin: '5px 0 1px', borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 3,
          }}
        >
          Grants (any socket)
        </div>
        {gemGrants(gem).map((g) => (
          <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{STAT_ICON[g.key]}</span>
            <div style={{ flex: 1 }}>
              <StatRow statKey={g.key} value={g.value} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

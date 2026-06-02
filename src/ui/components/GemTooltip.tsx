import type { GemInstance } from '@/data/gems';
import { GEMS } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { tierStyle } from '@/ui/tierStyle';
import { STAT_ICON } from '@/ui/icons';
import { StatRow } from './StatRow';
import { PALETTE } from '@/styles/palette';
import type { SlotCategory } from '@/data/itemSlots';

// Hover card for a loose gem. Socketed grants are category-routed (AFFIXES.md):
// offensive into weapons/jewelry, defensive into armor — so we show all three
// contexts, each computed from this gem's own origin/tier, so the player can see
// exactly what it would add before committing a (binding) socket.

const CONTEXTS: { category: SlotCategory; label: string; glyph: string }[] = [
  { category: 'weapon', label: 'In a Weapon', glyph: '🗡️' },
  { category: 'armor', label: 'In Armor', glyph: '🛡️' },
  { category: 'jewelry', label: 'In Jewelry', glyph: '💍' },
];

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

        {CONTEXTS.map(({ category, label, glyph }) => {
          const grants = gemGrants(gem, category);
          return (
            <div key={category}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, color: PALETTE.gold, fontWeight: 700,
                  margin: '5px 0 1px', borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 3,
                }}
              >
                <span style={{ fontSize: 10 }}>{glyph}</span>{label}
              </div>
              {grants.map((g) => (
                <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{STAT_ICON[g.key]}</span>
                  <div style={{ flex: 1 }}>
                    <StatRow statKey={g.key} value={g.value} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

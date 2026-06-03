import type { OfflineSummary } from '@/sim/offline';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// "While you were away" summary (SPEC §8). Shows the capped catch-up results:
// gold/XP earned, chests gained (already ≤ caps), keys, and stage movement.

function duration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function OfflineSummaryModal({ summary, onClose }: { summary: OfflineSummary; onClose: () => void }): React.JSX.Element {
  const chestTotal = summary.chests.reduce((a, c) => a + c.count, 0);
  return (
    <div
      style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', zIndex: 200,
      }}
    >
      <div style={{ width: 280, background: PALETTE.bgPanel, border: `2px solid ${PALETTE.ink}`, boxShadow: `0 0 0 2px ${PALETTE.gold}`, padding: 12, color: PALETTE.textLight }}>
        <div style={{ fontWeight: 700, color: PALETTE.gold, letterSpacing: 1, marginBottom: 8 }}>WHILE YOU WERE AWAY</div>
        <div style={{ color: PALETTE.textMute, marginBottom: 8 }}>{duration(summary.cappedMs)} of expedition (capped at 12h)</div>
        <Row label="Gold" value={format(summary.gold)} color={PALETTE.gold} />
        <Row label="XP" value={format(summary.xp)} color={PALETTE.xpBlue} />
        <Row label="Chests" value={String(chestTotal)} color={PALETTE.research} />
        <Row label="Stage" value={`${summary.fromStage} → ${summary.toStage}`} color={PALETTE.parchment} />
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: 6, background: PALETTE.titleRed, border: `1px solid ${PALETTE.ink}`, color: PALETTE.textLight, fontWeight: 700 }}>
          Collect
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
      <span style={{ color: PALETTE.textMute }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

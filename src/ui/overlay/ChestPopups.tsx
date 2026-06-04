import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/state/store';
import { getBonuses } from '@/sim/bonuses';
import { chestCapacity, autoOpenIntervalMs } from '@/sim/chests';
import { CHEST_TYPES, chestCountOf, type ChestType } from '@/data/chests';
import { openChestPopup } from '@/ui/loot/revealLoot';
import { PALETTE } from '@/styles/palette';

// Per-type chest popups floating over the strip. A popup appears the moment you
// hold ≥1 chest of a type: a chest placeholder + one square per storage slot
// (filled as chests drop in). Click it to crack every chest of that type — the
// popup vanishes and the loot streams into the bag (see revealLoot).
//
// Auto-open (the 'auto_open' tech, once unlocked) cracks EVERY pending chest of EVERY
// type at once on a fixed interval (10min base, −45s/rank, floored at 1min; the Time Imp
// pet shaves another 90s). The hover tooltip surfaces when that next sweep is due — see
// autoOpenLine + engine.autoOpen().

const LABEL: Record<ChestType, string> = { normal: 'Normal', stageBoss: 'Stage Boss', zoneBoss: 'Zone Boss' };
const GLYPH: Record<ChestType, string> = { normal: '📦', stageBoss: '🎁', zoneBoss: '💎' };
const FILL: Record<ChestType, string> = { normal: PALETTE.parchment, stageBoss: PALETTE.gold, zoneBoss: PALETTE.research };
const COLUMNS: Record<ChestType, number> = { normal: 3, stageBoss: 2, zoneBoss: 2 };

// "4m 12s" / "37s" from a millisecond remainder (ceil so it never shows 0s while pending).
function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// The tooltip's auto-open line. Mirrors engine.autoOpen()'s schedule exactly: it fires once
// nowMs − (lastRunAt ?? 0) ≥ interval, sweeping all chests (but it waits if the bag is full).
function autoOpenLine(unlocked: boolean, lastRunAt: number | null, intervalMs: number, nowMs: number): string {
  if (!unlocked) return 'Auto-open: locked — unlock in the Tech panel';
  const remaining = Math.max(0, (lastRunAt ?? 0) + intervalMs - nowMs);
  return remaining <= 0 ? 'Auto-open: due now (opens all chests)' : `Auto-open all in ${formatRemaining(remaining)}`;
}

export function ChestPopups(): React.JSX.Element | null {
  const chests = useStore((s) => s.chests);
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const autoOpen = useStore((s) => s.autoOpen);
  // Round to whole seconds so this only re-renders ~1×/sec (not every 60fps HUD push).
  const nowSec = useStore((s) => Math.floor(s.hud.clockMs / 1000));
  const bonuses = getBonuses(techRanks, ownedPets);

  const stacks = CHEST_TYPES.map((type) => ({
    type,
    count: chestCountOf(chests, type), // sum across drop-stage stacks of this type
    capacity: chestCapacity(type, bonuses),
  })).filter((s) => s.count > 0);

  if (stacks.length === 0) return null;

  const autoLine = autoOpenLine(autoOpen.unlocked, autoOpen.lastRunAt, autoOpenIntervalMs(bonuses), nowSec * 1000);

  return (
    <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stacks.map(({ type, count, capacity }) => (
        <Popup key={type} type={type} count={count} capacity={capacity} autoLine={autoLine} />
      ))}
    </div>
  );
}

function Popup({ type, count, capacity, autoLine }: { type: ChestType; count: number; capacity: number; autoLine: string }): React.JSX.Element {
  // Portal tooltip (native `title` is unreliable over the Pixi overlay) — positioned just
  // to the right of the popup, clamped on-screen, and torn down on mouse-leave.
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const onEnter = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ left: Math.min(r.right + 8, window.innerWidth - 180), top: r.top });
  };

  return (
    <>
      <button
        data-interactive="true"
        onMouseEnter={onEnter}
        onMouseLeave={() => setTip(null)}
        onClick={() => {
          setTip(null);
          openChestPopup(type);
        }}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 6px',
          background: PALETTE.bgPanel,
          border: `1px solid ${PALETTE.gold}`,
          color: PALETTE.textLight,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{GLYPH[type]}</span>
        <span
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLUMNS[type]}, 9px)`,
            gap: 2,
          }}
        >
          {Array.from({ length: capacity }, (_, i) => (
            <span
              key={i}
              style={{
                width: 9,
                height: 9,
                background: i < count ? FILL[type] : PALETTE.bgInset,
                border: `1px solid ${i < count ? PALETTE.goldDim : PALETTE.ink}`,
              }}
            />
          ))}
        </span>
      </button>
      {tip !== null &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: tip.left,
              top: tip.top,
              zIndex: 10001,
              pointerEvents: 'none',
              background: PALETTE.bgPanel,
              border: `1px solid ${PALETTE.gold}`,
              boxShadow: `0 0 0 1px ${PALETTE.ink}, 3px 3px 0 rgba(0,0,0,0.6)`,
              padding: '5px 7px',
              fontSize: 10,
              lineHeight: 1.5,
              color: PALETTE.textLight,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 700, color: PALETTE.gold }}>
              Click: open {count} {LABEL[type]} chest{count === 1 ? '' : 's'}
            </div>
            <div style={{ color: PALETTE.textMute }}>{autoLine}</div>
          </div>,
          document.body,
        )}
    </>
  );
}

import { useState } from 'react';
import { resetGame } from '@/persistence/saveManager';
import { PALETTE } from '@/styles/palette';

// Options popover (New Game, …). Opened from the cogwheel in the Party panel header.
// (UI zoom is fixed at 1.5× now — no longer adjustable.)

export function OptionsPopover({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div
      data-interactive="true"
      style={{
        width: 200,
        background: PALETTE.bgPanel,
        border: `2px solid ${PALETTE.ink}`,
        boxShadow: `0 0 0 1px ${PALETTE.goldDim}`,
        padding: 8,
        fontSize: 12,
        color: PALETTE.textLight,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: PALETTE.gold }}>Options</span>
        <button
          onClick={onClose}
          style={{
            background: PALETTE.titleRedHi,
            color: PALETTE.textLight,
            border: `1px solid ${PALETTE.ink}`,
            width: 18,
            height: 18,
            padding: 0,
            lineHeight: '14px',
          }}
        >
          ×
        </button>
      </div>

      <Section label="Save">
        <button
          onClick={() => {
            if (window.confirm('Start a NEW GAME? This erases all progress (stage, gear, gold, tech) and cannot be undone.')) {
              void resetGame();
            }
          }}
          style={{
            flex: 1,
            padding: '5px 0',
            background: PALETTE.bgInset,
            border: `1px solid ${PALETTE.enemyAccent}`,
            color: PALETTE.enemyAccent,
            fontWeight: 700,
          }}
        >
          ⟳ New Game
        </button>
      </Section>
    </div>
  );
}

// The cogwheel that lives in the Party panel header (left of the close button). It
// toggles the options popover, anchored just below the title bar.
export function SettingsHeaderButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        title="Settings"
        style={{
          background: open ? PALETTE.gold : PALETTE.titleRedHi,
          color: open ? PALETTE.ink : PALETTE.textLight,
          border: `1px solid ${PALETTE.ink}`,
          width: 18,
          height: 18,
          lineHeight: '14px',
          fontWeight: 700,
          padding: 0,
        }}
      >
        ⚙
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 80 }}>
          <OptionsPopover onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: PALETTE.textMute, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4 }}>{children}</div>
    </div>
  );
}


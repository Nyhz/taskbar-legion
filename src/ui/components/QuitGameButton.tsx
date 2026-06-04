import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE } from '@/styles/palette';
import { quitGame } from '@/platform/quit';

// The power button in the Party panel header (top-right, beside the close ×). It
// opens a confirm modal; "Yes" saves and closes the desktop app, "Back" dismisses.
// Only meaningful under Tauri — see App, which renders it for the desktop build.

export function QuitGameButton(): React.JSX.Element {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        aria-label="Quit game"
        title="Quit game"
        style={{
          background: PALETTE.titleRedHi,
          color: PALETTE.textLight,
          border: `1px solid ${PALETTE.ink}`,
          width: 18,
          height: 18,
          lineHeight: '14px',
          fontWeight: 700,
          padding: 0,
        }}
      >
        ⏻
      </button>
      {confirming && <QuitConfirmModal onClose={() => setConfirming(false)} />}
    </>
  );
}

function QuitConfirmModal({ onClose }: { onClose: () => void }): React.JSX.Element {
  return createPortal(
    <div
      data-interactive="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 260,
          background: PALETTE.bgPanel,
          border: `2px solid ${PALETTE.enemyAccent}`,
          boxShadow: `0 0 0 1px ${PALETTE.ink}, 6px 6px 0 0 rgba(0,0,0,0.5)`,
          color: PALETTE.textLight,
          padding: 14,
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 700, letterSpacing: 1, color: PALETTE.gold, marginBottom: 10 }}>
          Quit Taskbar Legion?
        </div>
        <div style={{ color: PALETTE.textMute, marginBottom: 14, lineHeight: 1.5 }}>
          Your progress is saved before the game closes.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '6px 0',
              background: PALETTE.bgInset,
              border: `1px solid ${PALETTE.goldDim}`,
              color: PALETTE.textLight,
              fontWeight: 700,
            }}
          >
            Back
          </button>
          <button
            onClick={() => void quitGame()}
            style={{
              flex: 1,
              padding: '6px 0',
              background: PALETTE.titleRed,
              border: `1px solid ${PALETTE.enemyAccent}`,
              color: PALETTE.textLight,
              fontWeight: 700,
            }}
          >
            Yes, Quit
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

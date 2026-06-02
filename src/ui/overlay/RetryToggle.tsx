import { useState } from 'react';
import { useStore } from '@/state/store';
import { PALETTE } from '@/styles/palette';

// Bottom-right toggle on the strip. When ON, a wipe keeps the party on its current stage
// (re-attempt it) instead of retreating a stage — see Simulation.handleWipe. While active,
// a pair of arrows circles the button to signal the "looping / retry" state. A custom
// hover tooltip (not the native `title`) shows instantly at the button's top-left.

export function RetryToggle(): React.JSX.Element {
  const active = useStore((s) => s.retryStage);
  const setRetryStage = useStore((s) => s.setRetryStage);
  const [hover, setHover] = useState(false);

  return (
    <div
      data-interactive="true"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        right: 8,
        bottom: 8,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {hover && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)', // above the button
            right: 0, // right-aligned → grows up-and-left, sitting at the button's top-left
            width: 150,
            padding: '4px 6px',
            background: PALETTE.bgPanel,
            border: `1px solid ${PALETTE.gold}`,
            color: PALETTE.parchment,
            fontSize: 10,
            lineHeight: 1.3,
            textAlign: 'left',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <b style={{ color: PALETTE.gold }}>RETRY {active ? 'ON' : 'OFF'}</b> — when active, the party stays on the same stage on a wipe instead of retreating.
        </div>
      )}
      <button
        onClick={() => setRetryStage(!active)}
        style={{
          position: 'relative',
          width: 30,
          height: 30,
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          lineHeight: 1,
          background: active ? PALETTE.titleRed : PALETTE.bgInset,
          border: `2px solid ${active ? PALETTE.gold : PALETTE.ink}`,
          color: active ? PALETTE.gold : PALETTE.textMute,
          boxShadow: active ? `0 0 6px ${PALETTE.gold}` : 'none',
        }}
      >
        <span>↻</span>
        {active && (
          <span className="tl-spin" style={{ position: 'absolute', inset: -6, pointerEvents: 'none' }}>
            <Arrow style={{ top: -4, left: '50%', transform: 'translateX(-50%) rotate(0deg)' }} />
            <Arrow style={{ bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(180deg)' }} />
          </span>
        )}
      </button>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: active ? PALETTE.gold : PALETTE.textMute }}>RETRY</span>
    </div>
  );
}

function Arrow({ style }: { style: React.CSSProperties }): React.JSX.Element {
  return <span style={{ position: 'absolute', fontSize: 10, lineHeight: 1, color: PALETTE.gold, ...style }}>➤</span>;
}

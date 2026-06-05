import { useState } from 'react';
import { useStore } from '@/state/store';
import { SCALE_MIN, SCALE_MAX, SCALE_STEP } from '@/state/slices/uiSlice';
import { PALETTE } from '@/styles/palette';

// The scale button on the RIGHT of the strip top bar. Opens a small popover with two
// independent sliders — Menu Scale (the floating menus) and Game Scale (the strip + its
// top bar) — each snapping to 0.75 / 1.00 / 1.25.

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: PALETTE.parchment }}>{label}</span>
        <span style={{ color: PALETTE.gold, fontWeight: 700 }}>{value.toFixed(2)}×</span>
      </div>
      <input
        type="range"
        min={SCALE_MIN}
        max={SCALE_MAX}
        step={SCALE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: PALETTE.gold, cursor: 'pointer' }}
      />
    </div>
  );
}

export function ScaleControls(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const menuScale = useStore((s) => s.menuScale);
  const setMenuScale = useStore((s) => s.setMenuScale);
  const gameScale = useStore((s) => s.gameScale);
  const setGameScale = useStore((s) => s.setGameScale);

  // stopPropagation on pointerdown so clicking the control never starts the strip's window-drag.
  const stop = (e: React.PointerEvent): void => e.stopPropagation();

  return (
    <div style={{ position: 'relative' }} onPointerDown={stop}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="UI scale"
        title="UI scale"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 20, padding: 0, cursor: 'pointer',
          fontSize: 13, lineHeight: 1,
          background: open ? PALETTE.titleRed : PALETTE.bgInset,
          border: `1px solid ${open ? PALETTE.gold : PALETTE.ink}`,
          color: open ? PALETTE.gold : PALETTE.parchment,
        }}
      >
        ⤢
      </button>
      {open && (
        <div
          data-interactive="true"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 90,
            width: 172,
            background: PALETTE.bgPanel,
            border: `2px solid ${PALETTE.ink}`,
            boxShadow: `0 0 0 1px ${PALETTE.goldDim}, 4px 4px 0 0 rgba(0,0,0,0.5)`,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: 11,
          }}
        >
          <Slider label="Menu Scale" value={menuScale} onChange={setMenuScale} />
          <Slider label="Game Scale" value={gameScale} onChange={setGameScale} />
        </div>
      )}
    </div>
  );
}

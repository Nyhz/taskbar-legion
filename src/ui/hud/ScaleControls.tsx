import { useState } from 'react';
import { useStore } from '@/state/store';
import { SCALE_MIN, SCALE_STEP, MENU_SCALE_MAX, GAME_SCALE_MAX } from '@/state/slices/uiSlice';
import { PALETTE } from '@/styles/palette';

// The scale button on the RIGHT of the strip top bar. Opens a small popover with two
// independent rows of buttons — Menu Scale (the floating menus, 0.75/1.00) and Game Scale
// (the strip + its top bar, 0.75/1.00/1.25).

// The discrete stops from SCALE_MIN up to `max`, in SCALE_STEP increments (rounded to dodge
// float drift): max 1.0 → [0.75, 1.00]; max 1.25 → [0.75, 1.00, 1.25].
function stopsTo(max: number): number[] {
  const out: number[] = [];
  for (let s = SCALE_MIN; s <= max + 1e-6; s += SCALE_STEP) out.push(Math.round(s * 100) / 100);
  return out;
}

function ScaleRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ color: PALETTE.parchment }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {stopsTo(max).map((s) => {
          const active = Math.abs(value - s) < 0.001;
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              style={{
                flex: 1,
                padding: '3px 0',
                background: active ? PALETTE.gold : PALETTE.bgInset,
                border: `1px solid ${active ? PALETTE.gold : PALETTE.goldDim}`,
                color: active ? PALETTE.ink : PALETTE.gold,
                fontWeight: 700,
              }}
            >
              {s.toFixed(2)}×
            </button>
          );
        })}
      </div>
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
          <span
            style={{
              alignSelf: 'flex-start',
              padding: '1px 5px',
              background: PALETTE.titleRed,
              border: `1px solid ${PALETTE.enemyAccent}`,
              color: PALETTE.textLight,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            Experimental
          </span>
          <ScaleRow label="Menu Scale" value={menuScale} max={MENU_SCALE_MAX} onChange={setMenuScale} />
          <ScaleRow label="Game Scale" value={gameScale} max={GAME_SCALE_MAX} onChange={setGameScale} />
        </div>
      )}
    </div>
  );
}

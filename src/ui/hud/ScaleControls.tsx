import { useState } from 'react';
import { useStore } from '@/state/store';
import { SCALE_MIN, SCALE_STEP, MENU_SCALE_MAX, displayPixelRatio, displayViewportHeight } from '@/state/slices/uiSlice';
import { gameScaleStops, screenPixelsPerArtPixel } from '@/state/pixelScale';
import { PALETTE } from '@/styles/palette';

// The scale button on the RIGHT of the strip top bar. Opens a small popover with two independent rows of
// buttons — Menu Scale (the floating menus, 0.75/1.00) and Game Scale (the strip + its top bar). The game's
// stops are whole screen pixels per art pixel for the display the window is on (state/pixelScale), labelled ×N.

interface Stop {
  value: number;
  label: string;
}

// The menu's stops from SCALE_MIN up to MENU_SCALE_MAX in SCALE_STEP increments (rounded to dodge float drift).
function menuStops(): Stop[] {
  const out: Stop[] = [];
  for (let s = SCALE_MIN; s <= MENU_SCALE_MAX + 1e-6; s += SCALE_STEP) {
    const value = Math.round(s * 100) / 100;
    out.push({ value, label: `${value.toFixed(2)}×` });
  }
  return out;
}

function gameStops(): Stop[] {
  const dpr = displayPixelRatio();
  return gameScaleStops(dpr, displayViewportHeight()).map((value) => ({ value, label: `×${Math.round(screenPixelsPerArtPixel(value, dpr))}` }));
}

function ScaleRow({ label, value, stops, onChange }: { label: string; value: number; stops: Stop[]; onChange: (v: number) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ color: PALETTE.parchment }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {stops.map((stop) => {
          const active = Math.abs(value - stop.value) < 0.001;
          return (
            <button
              key={stop.value}
              onClick={() => onChange(stop.value)}
              style={{
                flex: 1,
                padding: '3px 0',
                background: active ? PALETTE.gold : PALETTE.bgInset,
                border: `1px solid ${active ? PALETTE.gold : PALETTE.goldDim}`,
                color: active ? PALETTE.ink : PALETTE.gold,
                fontWeight: 700,
              }}
            >
              {stop.label}
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
          <ScaleRow label="Menu Scale" value={menuScale} stops={menuStops()} onChange={setMenuScale} />
          <ScaleRow label="Game Scale" value={gameScale} stops={gameStops()} onChange={setGameScale} />
        </div>
      )}
    </div>
  );
}

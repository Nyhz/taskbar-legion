import { useEffect, useRef, type ReactNode } from 'react';
import { PALETTE } from '@/styles/palette';
import { registerSurface } from '@/platform/surfaces';

// The only window chrome in the game — every panel composes it (CODING_STANDARDS).
// It is purely presentational: a scaled pixel box with a title bar. Anchoring,
// positioning and open/close animation are owned by the PARENT wrapper (PanelLayer),
// so the inner scale here never fights the wrapper's animation transforms. Tags
// itself as an interactive surface (v1.5 hit-test hook).

export interface PixelWindowProps {
  id: string;
  title: string;
  width?: number;
  height?: number;
  scale?: number; // per-panel zoom (default PANEL_SCALE) — the party is enlarged, wings compact
  headerActions?: ReactNode; // rendered in the title bar, left of the close button
  onClose: () => void;
  children: ReactNode;
}

// Base scale for the compact side wings. The party menu overrides this with a much
// larger scale (it's the dominant frame); the trio is sized so it still fits the
// 800px strip. transform-origin bottom-left anchors each panel's growth UPWARD from
// the strip baseline.
export const PANEL_SCALE = 1.0;

export function PixelWindow({
  id,
  title,
  width = 360,
  height,
  scale = PANEL_SCALE,
  headerActions,
  onClose,
  children,
}: PixelWindowProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (el === null) return registerSurface({ id, getBounds: () => null });
    return registerSurface({ id, getBounds: () => el.getBoundingClientRect() });
  }, [id]);

  return (
    <div
      ref={rootRef}
      data-interactive="true"
      style={{
        position: 'relative',
        width,
        ...(height !== undefined ? { height } : {}),
        background: PALETTE.bgPanel,
        border: `2px solid ${PALETTE.ink}`,
        boxShadow: `0 0 0 1px ${PALETTE.goldDim}, 4px 4px 0 0 rgba(0,0,0,0.5)`,
        color: PALETTE.textLight,
        fontSize: 12,
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        transform: `scale(${scale})`,
        transformOrigin: 'bottom left',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 6px',
          background: PALETTE.titleRed,
          borderBottom: `2px solid ${PALETTE.ink}`,
        }}
      >
        <span style={{ fontWeight: 700, letterSpacing: 1, color: PALETTE.parchment }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {headerActions}
          <button
            onClick={onClose}
            aria-label="Close"
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
            ×
          </button>
        </div>
      </div>
      <div
        className="tl-scroll"
        style={{ padding: 8, overflow: 'auto', flex: 1, minHeight: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

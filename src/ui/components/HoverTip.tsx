import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE } from '@/styles/palette';

// A small styled hover tooltip. The native `title` attribute doesn't render in the Tauri
// overlay webview, so anything that needs a tooltip wraps its trigger in this. The bubble is
// portaled to <body> with fixed positioning (clamped on-screen) so panel overflow can't clip it.

const MAX_W = 220;

export function HoverTip({ text, children }: { text: string; children: ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const show = (): void => {
    const r = ref.current?.getBoundingClientRect();
    if (r === undefined) return;
    setPos({
      left: Math.max(4, Math.min(r.left, window.innerWidth - MAX_W - 4)),
      top: r.bottom + 4,
    });
  };

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={() => setPos(null)} style={{ cursor: 'help' }}>
        {children}
      </span>
      {pos !== null &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              zIndex: 9999,
              pointerEvents: 'none',
              maxWidth: MAX_W,
              background: PALETTE.bgPanel,
              border: `2px solid ${PALETTE.ink}`,
              boxShadow: `0 0 0 1px ${PALETTE.goldDim}`,
              padding: '4px 6px',
              fontSize: 11,
              lineHeight: 1.3,
              color: PALETTE.textLight,
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

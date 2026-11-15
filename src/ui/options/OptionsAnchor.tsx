import { useLayoutEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { KitRoot } from '@/ui/kit';

// Where the options window stands: hung from the sign that opened it, opening UPWARDS, its right edge on the
// sign's. It is portaled to <body> so it sits above every panel whatever they stack as, and carries its own
// KitRoot at the strip's scale (the scale of the rail and of the title, where its two signs live).

const GAP_ART = 2; // art pixels between the sign and the window
const EDGE = 4; // CSS px kept from the window's edges

export function OptionsAnchor({
  anchor,
  zoom,
  children,
}: {
  /** The sign the window hangs from. */
  anchor: HTMLElement | null;
  /** CSS pixels per art pixel around the sign. */
  zoom: number;
  children: ReactNode;
}): React.JSX.Element | null {
  const [pos, setPos] = useState<{ right: number; bottom: number } | null>(null);

  useLayoutEffect(() => {
    if (anchor === null) return;
    const place = (): void => {
      const r = anchor.getBoundingClientRect();
      setPos({
        right: Math.max(EDGE, window.innerWidth - r.right),
        bottom: Math.max(EDGE, window.innerHeight - r.top + GAP_ART * zoom),
      });
    };
    place();
    const raf = requestAnimationFrame(place); // once more after layout settles (a scale change moves the sign)
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
    };
  }, [anchor, zoom]);

  if (pos === null) return null;
  return createPortal(
    <div
      style={{ position: 'fixed', right: pos.right, bottom: pos.bottom, zIndex: 9000, pointerEvents: 'auto' }}
    >
      <KitRoot zoom={zoom}>{children}</KitRoot>
    </div>,
    document.body,
  );
}

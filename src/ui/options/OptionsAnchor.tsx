import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { KitRoot } from '@/ui/kit';
import { placeOptions } from './optionsPlace';

// Where the options window stands: hung from the sign that opened it, opening UPWARDS, its right edge on the
// sign's — or further right when that would cover an open panel (optionsPlace). It is portaled to <body> so it
// sits above every panel whatever they stack as, and carries its own KitRoot at the strip's scale (the scale of the
// rail and of the title, where its two signs live).

const GAP_ART = 2; // art pixels between the sign and the window
const EDGE = 4; // CSS px kept from the window's edges
const REPLACE_MS = 250; // panels open, close and animate while the options are up: look again this often

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
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (anchor === null) return;
    const place = (): void => {
      const sign = anchor.getBoundingClientRect();
      const panels = [...document.querySelectorAll('[data-panel-box]')].map((el) => el.getBoundingClientRect());
      const next = placeOptions({
        sign,
        size: { width: box.current?.offsetWidth ?? 0, height: box.current?.offsetHeight ?? 0 },
        panels,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        gap: GAP_ART * zoom,
        edge: EDGE,
      });
      setPos((prev) => (prev !== null && prev.right === next.right && prev.bottom === next.bottom ? prev : next));
    };
    place();
    const raf = requestAnimationFrame(place); // once more after layout settles (a scale change moves the sign)
    const timer = window.setInterval(place, REPLACE_MS);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener('resize', place);
    };
  }, [anchor, zoom]);

  if (pos === null) return null;
  return createPortal(
    <div
      ref={box}
      style={{ position: 'fixed', right: pos.right, bottom: pos.bottom, zIndex: 9000, pointerEvents: 'auto' }}
    >
      <KitRoot zoom={zoom}>{children}</KitRoot>
    </div>,
    document.body,
  );
}

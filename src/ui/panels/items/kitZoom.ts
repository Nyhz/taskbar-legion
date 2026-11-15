import { useStore } from '@/state/store';
import { UI_SCALE } from '@/state/pixelScale';

// The zoom of the interface kit for things that live OUTSIDE a panel's own KitRoot — the context menu, the socket
// dialogs and the drag ghost are portaled to <body>, so they need a KitRoot of their own at the same scale as the
// panel they belong to. The panel layer (src/app/PanelLayer) picks that scale per screen and writes it on each
// panel's KitRoot as its inline `zoom`; rather than recompute it here (it depends on which panels are open), this
// reads it back from the DOM: the KitRoot around the element in question, else any open kit window, else the
// scale of the strip's HUD (UI baseline × game scale), which is always on screen.

function zoomOf(el: Element | null | undefined): number | null {
  const root = el?.closest('.tk');
  if (!(root instanceof HTMLElement)) return null;
  const inline = Number.parseFloat(root.style.zoom);
  if (inline > 0) return inline;
  const computed = Number.parseFloat(getComputedStyle(root).zoom);
  return computed > 0 ? computed : null;
}

/** Screen (CSS) pixels per art pixel of the kit around `from`; with no element, of any open kit window. */
export function kitZoomNear(from?: Element | null): number {
  return (
    zoomOf(from) ?? zoomOf(document.querySelector('.tk-book')) ?? UI_SCALE * useStore.getState().gameScale
  );
}

/** The kit zoom at a point of the viewport (where a right-click happened). */
export function kitZoomAt(x: number, y: number): number {
  return kitZoomNear(document.elementFromPoint(x, y));
}

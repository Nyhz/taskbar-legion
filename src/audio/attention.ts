import { useStore } from '@/state/store';
import { setSoundAttention } from './soundEngine';

// Is the player looking at the game? A panel is open, or the pointer is over one of its surfaces (the strip, the HUD,
// a window). The sounds of every blow follow it by default (audio/soundRules). In the desktop overlay the webview
// gets no pointer events while the cursor is over the desktop, so the overlay's own cursor poll reports it
// (platform/desktopOverlay → setCursorOverGame); in a browser, pointer moves over the page do.

let cursorOver = false;
let panelsOpen = false;

function apply(): void {
  setSoundAttention(cursorOver || panelsOpen);
}

/** The overlay's cursor poll: true while the cursor is over a game surface. */
export function setCursorOverGame(over: boolean): void {
  if (over === cursorOver) return;
  cursorOver = over;
  apply();
}

const isBackground = (el: EventTarget | null): boolean =>
  !(el instanceof Element) || el === document.body || el === document.documentElement || el.id === 'tl-app-root';

/** Starts following the panels and, in a browser, the pointer (call once at boot). */
let started_ = false;

export function startSoundAttention(): void {
  if (started_) return; // once (React's strict mode runs boot effects twice)
  started_ = true;
  if (typeof window === 'undefined') return;
  panelsOpen = useStore.getState().openPanels.length > 0;
  useStore.subscribe((s) => {
    const open = s.openPanels.length > 0;
    if (open !== panelsOpen) {
      panelsOpen = open;
      apply();
    }
  });
  document.addEventListener('pointermove', (e) => setCursorOverGame(!isBackground(e.target)), { passive: true });
  document.documentElement.addEventListener('pointerleave', () => setCursorOverGame(false));
  apply();
}

import type { Window } from '@tauri-apps/api/window';
import { isTauri } from './tauri';
import { saveGame } from '@/persistence/saveManager';

// Turns the Tauri webview into the ambient overlay: a transparent, borderless,
// always-on-top window stretched over the current monitor, with the empty (non-UI)
// regions clicking THROUGH to the desktop. No-op in a plain browser, so `npm run dev`
// stays a normal opaque page.
//
// Click-through is driven entirely from JS: we poll the OS cursor position and ask
// `document.elementFromPoint` whether the cursor is over any pointer-interactive UI.
// The App marks its structural transparent layers `pointer-events: none`, so
// elementFromPoint returns null exactly over the empty void → we ignore cursor events
// there and capture them everywhere a real surface (strip, HUD, panels, modals) lives.

const POLL_MS = 20;
let started = false;

export async function setupDesktopOverlay(): Promise<void> {
  if (!isTauri() || started) return;
  started = true;

  // Kill every opaque background so the native transparent window shows through —
  // the page itself paints a solid colour otherwise, defeating `transparent: true`.
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';

  const { getCurrentWindow, currentMonitor, PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();

  // Stretch over the active monitor so bottom-anchored panels have full headroom.
  const mon = await currentMonitor();
  if (mon !== null) {
    await win.setSize(new PhysicalSize(mon.size.width, mon.size.height));
    await win.setPosition(new PhysicalPosition(mon.position.x, mon.position.y));
  }
  await win.setAlwaysOnTop(true);

  // Persist before the OS tears the window down (Cmd+Q, app quit, logout).
  await win.onCloseRequested(async (e) => {
    e.preventDefault();
    try {
      await saveGame();
    } catch {
      // never trap the close on a save failure
    }
    await win.destroy();
  });

  await startClickThrough(win);
}

async function startClickThrough(win: Window): Promise<void> {
  const { cursorPosition } = await import('@tauri-apps/api/window');

  // The window never moves (drag repositions CONTENT, not the OS window), so its
  // origin + scale are cached; refresh them if the monitor/DPI ever changes.
  let origin = await win.outerPosition();
  let scale = await win.scaleFactor();
  const refresh = async (): Promise<void> => {
    origin = await win.outerPosition();
    scale = await win.scaleFactor();
  };
  await win.onMoved(() => void refresh());
  await win.onResized(() => void refresh());

  // The cursor is over "nothing" (→ click straight through to whatever app is behind us)
  // when elementFromPoint lands on a background/structural node rather than a real UI
  // leaf. The strip/HUD/panels/modals are the only nodes that DON'T match this — they're
  // the painted, interactive surfaces. (`<body>`/`<html>`/`#root` cover the whole viewport
  // and stay pointer-events:auto so portaled tooltips/menus keep working, so we must name
  // them explicitly — a bare `=== null` check never fires.)
  const root = document.getElementById('root');
  const isBackground = (el: Element | null): boolean =>
    el === null ||
    el === root ||
    el === document.body ||
    el === document.documentElement ||
    el.id === 'tl-app-root';

  // Default to click-through: if the poll ever stalls we must NOT trap the desktop.
  let ignoring = true;
  await win.setIgnoreCursorEvents(true);

  setInterval(() => {
    void (async () => {
      try {
        const cursor = await cursorPosition();
        const x = (cursor.x - origin.x) / scale;
        const y = (cursor.y - origin.y) / scale;
        const ignore = isBackground(document.elementFromPoint(x, y));
        if (ignore !== ignoring) {
          ignoring = ignore;
          await win.setIgnoreCursorEvents(ignore);
        }
      } catch {
        // transient IPC hiccup — keep polling; the safe default already stands
      }
    })();
  }, POLL_MS);
}

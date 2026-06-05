import type { Window } from '@tauri-apps/api/window';
import { isTauri } from './tauri';
import { isItemDragging } from './dragState';
import { saveGame } from '@/persistence/saveManager';

// Turns the Tauri webview into the ambient overlay: a transparent, borderless,
// always-on-top, NON-MAXIMIZED window that the user can drag freely across monitors.
// No-op in a plain browser, so `npm run dev` stays a normal opaque page.
//
// The window is a FIXED logical footprint (not the whole monitor) — big enough to hold the
// open panel band (~1200 wide, centred on the viewport) and the tallest panel (tech) above
// the strip. Most of it is transparent; only the strip + open panels paint. The empty
// regions click THROUGH to the desktop: we poll the OS cursor and ask
// `document.elementFromPoint` whether it's over any pointer-interactive UI. The App marks
// its structural transparent layers `pointer-events: none`, so elementFromPoint returns a
// background node exactly over the void → we ignore cursor events there and capture them
// everywhere a real surface (strip, HUD, panels, modals) lives.
//
// Dragging across screens is delegated to the OS via `startDragging()` (see startOverlayDrag,
// driven from the App's strip pointer handler) — that's DPI-correct and multi-monitor-native,
// so the window stays crisp on whichever monitor it lands on.

const POLL_MS = 20;

// Fixed, non-maximized footprint in LOGICAL px (constant across monitor DPI). Height holds
// the tallest panel above the HUD + strip even at Menu Scale 1.25 (tech ≈ 700 rendered at 1.0
// → ~875 at 1.25, plus the strip+HUD ≈ 270). Width holds the ~1200 band with a small margin.
// On screens shorter than this the top may still clip — the strip always stays at the bottom.
const OVERLAY_W = 1280;
const OVERLAY_H = 1040;
// Lift the whole window off the screen's bottom edge so the strip clears the OS Dock/taskbar
// (and the title band, centred in the window, rises with it). The window's top simply runs a
// little further off-screen — that region is transparent margin, so nothing is lost.
const BOTTOM_DOCK_MARGIN = 80; // logical px gap between the window bottom and the screen bottom

let overlayStarted = false;
let closeHookSet = false;
let winRef: Window | null = null; // cached so the drag handler can grab it synchronously

interface WinPos {
  x: number;
  y: number;
} // PHYSICAL outer-position (absolute on the virtual desktop, DPI-independent)

// The ambient overlay — set up ONCE on boot and used for BOTH the title screen and the game.
// A transparent, click-through, bottom-docked window: the title content lives in a centred
// band (the rest shows the desktop through), and the game's strip + panels paint at the
// bottom. Because title and game share this exact window, the hand-off needs no resize — the
// title band simply gives way to the strip in place.
export async function setupTitleWindow(): Promise<void> {
  if (!isTauri() || overlayStarted) return;
  overlayStarted = true;

  // Kill every opaque background so the native transparent window shows through — the page
  // itself paints a solid colour otherwise, defeating `transparent: true`. (The title band
  // paints its own scene; everything around it stays see-through.)
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';

  const { getCurrentWindow, currentMonitor, LogicalSize, PhysicalPosition } = await import('@tauri-apps/api/window');
  const win = getCurrentWindow();
  winRef = win;

  try {
    // Non-maximized fixed footprint. LogicalSize keeps the footprint constant across DPI, so
    // moving to a higher-DPI monitor re-renders crisply at the same logical size.
    await win.setSize(new LogicalSize(OVERLAY_W, OVERLAY_H));

    // ALWAYS dock bottom-centre of the current monitor (NOT a remembered prior position).
    const target = await dockBottomPosition(win, currentMonitor);
    if (target !== null) await win.setPosition(new PhysicalPosition(target.x, target.y));

    await win.setAlwaysOnTop(true);
    await registerCloseHook(win);
    await startClickThrough(win);
  } finally {
    // The window boots HIDDEN (tauri.conf `visible:false`) so the user never sees the opaque
    // page paint at the wrong spot — reveal it only now that it's transparent + docked. In a
    // `finally` so a setup hiccup can never leave the window stuck invisible.
    await win.show().catch(() => {});
  }
}

// Persist before the OS tears the window down (Cmd+Q, app quit, logout). Registered once,
// whichever window state set it up first — re-registering would double-save / double-destroy.
async function registerCloseHook(win: Window): Promise<void> {
  if (closeHookSet) return;
  closeHookSet = true;
  await win.onCloseRequested(async (e) => {
    e.preventDefault();
    try {
      await saveGame();
    } catch {
      // never trap the close on a save failure
    }
    await win.destroy();
  });
}

// OS-level window drag — moves the actual window, so it travels freely across monitors and
// stays DPI-correct. Called from the App once a press on the strip passes the drag threshold.
export async function startOverlayDrag(): Promise<void> {
  if (!isTauri()) return;
  try {
    const win = winRef ?? (await import('@tauri-apps/api/window')).getCurrentWindow();
    await win.startDragging();
  } catch {
    // startDragging throws if the mouse button was already released — harmless
  }
}

type CurrentMonitor = () => Promise<{ position: { x: number; y: number }; size: { width: number; height: number } } | null>;

// Bottom-centre of the current monitor for the overlay footprint (logical → physical via DPI).
async function dockBottomPosition(win: Window, currentMonitor: CurrentMonitor): Promise<WinPos | null> {
  const scale = await win.scaleFactor();
  const physW = Math.round(OVERLAY_W * scale);
  const physH = Math.round(OVERLAY_H * scale);
  const mon = await currentMonitor();
  if (mon === null) return null; // best effort if the monitor query fails
  return {
    x: mon.position.x + Math.round((mon.size.width - physW) / 2),
    y: mon.position.y + mon.size.height - physH - Math.round(BOTTOM_DOCK_MARGIN * scale),
  };
}

async function startClickThrough(win: Window): Promise<void> {
  const { cursorPosition } = await import('@tauri-apps/api/window');

  // The window moves whenever the user drags it; keep its origin + scale fresh so the
  // cursor→viewport hit-test below stays accurate. (Position is NOT persisted — the overlay
  // always docks bottom-centre under the title on entry.)
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
        // While an item is being dragged, PIN the window interactive — the drag path crosses
        // pointer-events:none gaps between panels, and toggling click-through mid-gesture makes
        // the webview drop the drag. Otherwise fall back to the hit-test under the cursor.
        const ignore = isItemDragging() ? false : isBackground(document.elementFromPoint(x, y));
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

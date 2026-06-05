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
const OVERLAY_H = 860;

const WIN_POS_KEY = 'taskbar-legion.overlay.winpos.v1';

let started = false;
let winRef: Window | null = null; // cached so the drag handler can grab it synchronously

interface WinPos {
  x: number;
  y: number;
} // PHYSICAL outer-position (absolute on the virtual desktop, DPI-independent)

function loadWinPos(): WinPos | null {
  try {
    const raw = localStorage.getItem(WIN_POS_KEY);
    if (raw === null) return null;
    const p = JSON.parse(raw) as Partial<WinPos>;
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}

function saveWinPos(p: WinPos): void {
  try {
    localStorage.setItem(WIN_POS_KEY, JSON.stringify(p));
  } catch {
    // private mode / quota — non-fatal, the window just won't remember its spot
  }
}

export async function setupDesktopOverlay(): Promise<void> {
  if (!isTauri() || started) return;
  started = true;

  // Kill every opaque background so the native transparent window shows through —
  // the page itself paints a solid colour otherwise, defeating `transparent: true`.
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';

  const { getCurrentWindow, currentMonitor, availableMonitors, LogicalSize, PhysicalPosition } = await import(
    '@tauri-apps/api/window'
  );
  const win = getCurrentWindow();
  winRef = win;

  // Non-maximized fixed footprint. LogicalSize keeps the footprint constant across DPI, so
  // moving to a higher-DPI monitor re-renders crisply at the same logical size.
  await win.setSize(new LogicalSize(OVERLAY_W, OVERLAY_H));

  // Restore the last position only if it still lands on a connected monitor; otherwise dock
  // bottom-centre of the current monitor. This is the guard against the off-screen brick.
  const target = await resolveBootPosition(win, currentMonitor, availableMonitors);
  if (target !== null) await win.setPosition(new PhysicalPosition(target.x, target.y));

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

type MonitorList = () => Promise<Array<{ position: { x: number; y: number }; size: { width: number; height: number } }>>;
type CurrentMonitor = () => Promise<{ position: { x: number; y: number }; size: { width: number; height: number } } | null>;

async function resolveBootPosition(win: Window, currentMonitor: CurrentMonitor, availableMonitors: MonitorList): Promise<WinPos | null> {
  const scale = await win.scaleFactor();
  const physW = Math.round(OVERLAY_W * scale);
  const physH = Math.round(OVERLAY_H * scale);

  const saved = loadWinPos();
  if (saved !== null && (await stripAnchorOnScreen(saved, physW, physH, availableMonitors))) return saved;

  const mon = await currentMonitor();
  if (mon === null) return saved; // best effort if the monitor query fails
  return {
    x: mon.position.x + Math.round((mon.size.width - physW) / 2),
    y: mon.position.y + mon.size.height - physH,
  };
}

// The visible, draggable strip sits at the bottom-centre of the window. A saved position is
// only safe to restore if THAT anchor is on a real monitor — otherwise the strip would be
// unreachable even though the window technically exists.
async function stripAnchorOnScreen(pos: WinPos, physW: number, physH: number, availableMonitors: MonitorList): Promise<boolean> {
  const monitors = await availableMonitors();
  const anchorX = pos.x + physW / 2;
  const anchorY = pos.y + physH - 1;
  return monitors.some(
    (m) =>
      anchorX >= m.position.x &&
      anchorX < m.position.x + m.size.width &&
      anchorY >= m.position.y &&
      anchorY < m.position.y + m.size.height,
  );
}

async function startClickThrough(win: Window): Promise<void> {
  const { cursorPosition } = await import('@tauri-apps/api/window');

  // The window moves whenever the user drags it; keep its origin + scale fresh so the
  // cursor→viewport hit-test below stays accurate, and persist the resting position.
  let origin = await win.outerPosition();
  let scale = await win.scaleFactor();
  let persistTimer: number | undefined;
  const refresh = async (): Promise<void> => {
    origin = await win.outerPosition();
    scale = await win.scaleFactor();
  };
  const persistSoon = (): void => {
    if (persistTimer !== undefined) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      void (async () => {
        const p = await win.outerPosition();
        saveWinPos({ x: p.x, y: p.y });
      })();
    }, 300);
  };
  await win.onMoved(() => {
    void refresh();
    persistSoon();
  });
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

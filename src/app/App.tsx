import { useEffect, useRef, useState } from 'react';
import { GameStrip } from '@/game/GameStrip';
import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { loadGame, saveGame, resetGame, requestPersistentStorage } from '@/persistence/saveManager';
import type { OfflineSummary } from '@/sim/offline';
import { PanelLayer } from './PanelLayer';
import { StripHud } from '@/ui/hud/StripHud';
import { StripOverlay } from '@/ui/overlay/StripOverlay';
import { LootToasts } from '@/ui/overlay/LootToasts';
import { OfflineSummaryModal } from '@/ui/components/OfflineSummaryModal';
import { ContextMenuProvider } from '@/ui/components/ContextMenu';
import { PALETTE } from '@/styles/palette';
import { isTauri } from '@/platform/tauri';
import { setupDesktopOverlay } from '@/platform/desktopOverlay';
import { setStripDragging } from '@/platform/dragState';

const STRIP_LOGICAL_HEIGHT = 160; // must match GameStrip.STRIP_HEIGHT
// The game is a fixed-size strip anchored to the bottom-center of the page — sized for the
// eventual taskbar dock, NOT the full screen width. uiScale zooms the whole thing
// proportionally; at the default 1.5× this renders ~900×240 actual px. A narrower logical
// width (600) shows the same world span in fewer px → a more zoomed-in view (bigger sprites).
const STRIP_LOGICAL_WIDTH = 600;
const MIN_OFFLINE_MS = 60_000; // only show the summary after a meaningful break
const AUTOSAVE_MS = 30_000;

// Desktop overlay: the user can drag the whole strip anywhere on screen. The offset is
// applied to the CONTENT (the strip column), not the OS window — the window stays a
// full-monitor transparent click-through sheet — so dragging never moves the void around.
const OVERLAY_POS_KEY = 'taskbar-legion.overlay.pos.v1';
const DRAG_THRESHOLD = 4; // px of movement before a press becomes a drag (vs. a tap)

interface OverlayPos {
  x: number;
  y: number;
}

function loadOverlayPos(): OverlayPos {
  try {
    const raw = localStorage.getItem(OVERLAY_POS_KEY);
    if (raw === null) return { x: 0, y: 0 };
    const p = JSON.parse(raw) as Partial<OverlayPos>;
    return { x: typeof p.x === 'number' ? p.x : 0, y: typeof p.y === 'number' ? p.y : 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

function saveOverlayPos(p: OverlayPos): void {
  try {
    localStorage.setItem(OVERLAY_POS_KEY, JSON.stringify(p));
  } catch {
    // private mode / quota — non-fatal, the strip just won't remember its spot
  }
}

export function App(): React.JSX.Element {
  const stripRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameStrip | null>(null);
  const uiScale = useStore((s) => s.uiScale);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const tauri = isTauri();
  const [pos, setPos] = useState<OverlayPos>(loadOverlayPos);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    const container = stripRef.current;
    if (container === null) return;
    const game = new GameStrip();
    gameRef.current = game;
    let cancelled = false;

    // Dev/console escape hatch for a clean restart: `resetGame()` in the console wipes
    // ALL persistence and reloads to a fresh 1-1 (also available as Options → New Game).
    (window as unknown as { resetGame: () => void }).resetGame = () => void resetGame();

    // Ask for durable storage up front so the save survives eviction / Safari's
    // 7-day script-storage cap. Best-effort — fire and forget. (No-op under Tauri,
    // where the save is a real file on disk and durability isn't the browser's call.)
    void requestPersistentStorage();

    // Make the desktop window a transparent, click-through, bottom-docked overlay.
    // No-op in a plain browser.
    void setupDesktopOverlay();

    void (async () => {
      const save = await loadGame();
      if (cancelled) return;
      if (save !== null) useStore.getState().hydrate(save);
      await game.init(container, useStore.getState().uiScale, tauri);
      if (cancelled) return;
      if (save !== null) {
        const elapsed = Date.now() - save.lastSavedAt;
        if (elapsed > MIN_OFFLINE_MS) {
          const summary = getEngine()?.runOffline(elapsed);
          if (summary !== undefined && summary.ticks > 0) setOffline(summary);
        }
      }
      void saveGame(); // engine is live now → capture current state (gate is getEngine()!==null)
    })();

    // Persist promptly on progress milestones (stage advance / a newly-beaten boss),
    // not just on the 30s timer — the unload save is an async write the browser often
    // drops, so recent progress would otherwise be lost on reload.
    const unsubProgress = useStore.subscribe((s, prev) => {
      if (s.hud.globalStage !== prev.hud.globalStage || s.hud.maxClearedStage !== prev.hud.maxClearedStage) {
        void saveGame();
      }
    });

    const interval = window.setInterval(() => void saveGame(), AUTOSAVE_MS);
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') void saveGame();
    };
    const onUnload = (): void => void saveGame();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubProgress();
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onUnload);
      void saveGame();
      game.destroy();
      gameRef.current = null;
    };
  }, [tauri]);

  useEffect(() => {
    gameRef.current?.applyScale(uiScale);
  }, [uiScale]);

  // Drag the whole strip (and its panels) around the desktop. A press that doesn't move
  // past the threshold stays a tap, so in-game taps (collect / portal) still work.
  const onStripPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return;
    const start = { cx: e.clientX, cy: e.clientY, px: posRef.current.x, py: posRef.current.y };
    let moved = false;
    const onMove = (ev: PointerEvent): void => {
      const dx = ev.clientX - start.cx;
      const dy = ev.clientY - start.cy;
      if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        moved = true;
        setStripDragging(true);
      }
      if (moved) setPos({ x: start.px + dx, y: start.py + dy });
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (moved) {
        saveOverlayPos(posRef.current);
        // Defer clearing the flag so the click that follows pointerup stays suppressed.
        setTimeout(() => setStripDragging(false), 0);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      id="tl-app-root"
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: tauri ? 'transparent' : PALETTE.bgDeep,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: tauri ? 'none' : undefined,
      }}
    >
      <ContextMenuProvider>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            top: 0,
            transform: `translateX(-50%) translate(${pos.x}px, ${pos.y}px)`,
            width: STRIP_LOGICAL_WIDTH * uiScale,
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: tauri ? 'none' : undefined,
          }}
        >
          {/* Transparent zone above the strip where the floating menu panels live;
              they are bottom-anchored so they rise from the top of the strip. zIndex
              lifts it above the topbar/strip so the tech tree can visibly slide up
              over them from below (panel-zone is pointer-transparent — see PanelLayer). */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 5, pointerEvents: tauri ? 'none' : undefined }}>
            <PanelLayer />
            {/* Loot toasts live here (above the panels via their own zIndex) so an open
                menu can't hide them; anchored to the bottom of this zone, over the strip. */}
            <LootToasts />
          </div>
          {/* The strip itself (HUD + canvas) is the drag handle — grab anywhere to move
              the overlay. pointerEvents:auto re-enables it inside the transparent column. */}
          <div style={{ pointerEvents: tauri ? 'auto' : undefined }} onPointerDown={onStripPointerDown}>
            <StripHud />
          </div>
          <div
            style={{ position: 'relative', height: STRIP_LOGICAL_HEIGHT * uiScale, width: '100%', pointerEvents: tauri ? 'auto' : undefined }}
            onPointerDown={onStripPointerDown}
          >
            <div ref={stripRef} style={{ height: '100%', width: '100%' }} />
            <StripOverlay />
          </div>
        </div>
      </ContextMenuProvider>
      {offline !== null && (
        <div style={{ pointerEvents: 'auto' }}>
          <OfflineSummaryModal summary={offline} onClose={() => setOffline(null)} />
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { GameStrip } from '@/game/GameStrip';
import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { loadGame, saveGame, resetGame } from '@/persistence/saveManager';
import type { OfflineSummary } from '@/sim/offline';
import { PanelLayer } from './PanelLayer';
import { StripHud } from '@/ui/hud/StripHud';
import { StripOverlay } from '@/ui/overlay/StripOverlay';
import { LootToasts } from '@/ui/overlay/LootToasts';
import { OfflineSummaryModal } from '@/ui/components/OfflineSummaryModal';
import { ContextMenuProvider } from '@/ui/components/ContextMenu';
import { PALETTE } from '@/styles/palette';
import { isTauri } from '@/platform/tauri';
import { setupDesktopOverlay, startOverlayDrag } from '@/platform/desktopOverlay';
import { setStripDragging } from '@/platform/dragState';

const STRIP_LOGICAL_HEIGHT = 160; // must match GameStrip.STRIP_HEIGHT
// The game is a fixed-size strip anchored to the bottom-center of the page — sized for the
// eventual taskbar dock, NOT the full screen width. uiScale zooms the whole thing
// proportionally; at the default 1.5× this renders ~900×240 actual px. A narrower logical
// width (600) shows the same world span in fewer px → a more zoomed-in view (bigger sprites).
const STRIP_LOGICAL_WIDTH = 600;
const MIN_OFFLINE_MS = 60_000; // only show the summary after a meaningful break
const AUTOSAVE_MS = 30_000;

// Desktop overlay: dragging the strip moves the actual OS window (via startDragging), so it
// travels freely across monitors and stays DPI-correct. A press only becomes a drag past
// this threshold, so in-game taps (collect / portal) still work.
const DRAG_THRESHOLD = 4; // px of movement before a press becomes a drag (vs. a tap)

export function App(): React.JSX.Element {
  const stripRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameStrip | null>(null);
  const uiScale = useStore((s) => s.uiScale);
  // Game Scale: the whole STRIP — combat canvas + top-bar HUD + RETRY overlay — scales together
  // by gameScale. Independent of Menu Scale (PanelLayer), which the menus use. stripScale drives
  // the canvas; gameScale drives the DOM HUD/overlay zoom (authored at the baseline size).
  const gameScale = useStore((s) => s.gameScale);
  const stripScale = uiScale * gameScale;
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const tauri = isTauri();

  useEffect(() => {
    const container = stripRef.current;
    if (container === null) return;
    const game = new GameStrip();
    gameRef.current = game;
    let cancelled = false;

    // Dev/console escape hatch for a clean restart: `resetGame()` in the console wipes
    // ALL persistence and reloads to a fresh 1-1 (also available as Options → New Game).
    (window as unknown as { resetGame: () => void }).resetGame = () => void resetGame();

    // Make the desktop window a transparent, click-through, bottom-docked overlay.
    // No-op in a plain browser.
    void setupDesktopOverlay();

    void (async () => {
      const save = await loadGame();
      if (cancelled) return;
      if (save !== null) {
        try {
          useStore.getState().hydrate(save);
        } catch (err) {
          // A save that passed migrate but still throws in hydrate must NOT brick the app
          // (the file is persisted → every reload would re-crash). Fall back to a fresh
          // game: hydrate builds its next-state object before calling set, so a throw
          // leaves the store at defaults rather than half-applied.
          console.error('Save hydrate failed — starting fresh to avoid a boot loop', err);
        }
      }
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
    // not just on the 30s timer, so recent progress survives an abrupt teardown.
    const unsubProgress = useStore.subscribe((s, prev) => {
      if (s.hud.globalStage !== prev.hud.globalStage || s.hud.maxClearedStage !== prev.hud.maxClearedStage) {
        void saveGame();
      }
    });

    // Save on app quit is owned by the Tauri window's onCloseRequested hook
    // (desktopOverlay.ts); here we just keep the periodic autosave + the unmount save.
    const interval = window.setInterval(() => void saveGame(), AUTOSAVE_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubProgress();
      void saveGame();
      game.destroy();
      gameRef.current = null;
    };
  }, [tauri]);

  useEffect(() => {
    gameRef.current?.applyScale(uiScale);
  }, [uiScale]);

  // Drag the whole window around the desktop by the strip. Past the threshold we hand the
  // gesture to the OS (startDragging) so the window itself travels — freely across monitors,
  // DPI-correct. A press that doesn't move stays a tap, so in-game taps still work. Browser
  // builds have no window to move, so this is a no-op there.
  const onStripPointerDown = (e: React.PointerEvent): void => {
    if (!tauri || e.button !== 0) return;
    const start = { cx: e.clientX, cy: e.clientY };
    let dragging = false;
    const cleanup = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    const onMove = (ev: PointerEvent): void => {
      if (dragging) return;
      if (Math.hypot(ev.clientX - start.cx, ev.clientY - start.cy) > DRAG_THRESHOLD) {
        dragging = true;
        setStripDragging(true);
        cleanup();
        void startOverlayDrag(); // OS takes over the gesture from here
        // The OS owns the drag now and may swallow the matching pointerup; clear the
        // tap-suppression flag on a short delay so the portal/collect tap stays suppressed
        // through the gesture but re-enables afterwards.
        setTimeout(() => setStripDragging(false), 150);
      }
    };
    const onUp = (): void => cleanup();
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
            transform: 'translateX(-50%)',
            width: STRIP_LOGICAL_WIDTH * stripScale,
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
          {/* The whole strip — HUD bar + combat canvas + overlay — is ONE unit, authored at the
              baseline (×uiScale) size and `zoom`-scaled by gameScale so it all moves in lockstep.
              The canvas itself is a FIXED-resolution bitmap (GameStrip) that this zoom scales; no
              resizeTo, so width + height always change together. It's also the drag handle. */}
          <div style={{ width: STRIP_LOGICAL_WIDTH * uiScale, zoom: gameScale, pointerEvents: tauri ? 'auto' : undefined }} onPointerDown={onStripPointerDown}>
            <StripHud />
            <div style={{ position: 'relative', width: STRIP_LOGICAL_WIDTH * uiScale, height: STRIP_LOGICAL_HEIGHT * uiScale }}>
              <div ref={stripRef} style={{ height: '100%', width: '100%' }} />
              <StripOverlay />
            </div>
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

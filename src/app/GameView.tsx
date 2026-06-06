import { useEffect, useRef, useState } from 'react';
import { GameStrip } from '@/game/GameStrip';
import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { saveGame } from '@/persistence/saveManager';
import type { SaveV1 } from '@/persistence/saveSchema';
import type { OfflineSummary } from '@/sim/offline';
import { PanelLayer } from './PanelLayer';
import { StripHud } from '@/ui/hud/StripHud';
import { StripOverlay } from '@/ui/overlay/StripOverlay';
import { LootToasts } from '@/ui/overlay/LootToasts';
import { revealAllChests } from '@/ui/loot/revealLoot';
import { OfflineSummaryModal } from '@/ui/components/OfflineSummaryModal';
import { isTauri } from '@/platform/tauri';
import { startOverlayDrag } from '@/platform/desktopOverlay';
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

// The live game: the Pixi strip + floating panels. Mounted only once the player picks
// Start/Continue (App switches `screen` to 'game'), so GameStrip.init is deferred until then.
// `bootSave` is the save loaded at boot (already hydrated by App before this mounts) — used
// only to compute the offline-progress summary once the engine is live. `onReady` fires once
// the strip has actually painted its first frame, so App can hold the fade-to-black until the
// game is on screen (no abrupt pop-in).
export function GameView({ bootSave, onReady }: { bootSave: SaveV1 | null; onReady?: () => void }): React.JSX.Element {
  // Keep `onReady` in a ref so the init effect (which must run exactly once) doesn't list it
  // as a dependency and re-create the GameStrip when App re-renders.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const stripRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameStrip | null>(null);
  const uiScale = useStore((s) => s.uiScale);
  // Game Scale: the whole STRIP — combat canvas + top-bar HUD + RETRY overlay — scales together
  // by gameScale. Independent of Menu Scale (PanelLayer), which the menus use. stripScale drives
  // the canvas; gameScale drives the DOM HUD/overlay zoom (authored at the baseline size).
  const gameScale = useStore((s) => s.gameScale);
  const stripScale = uiScale * gameScale;
  const autoOpenPending = useStore((s) => s.autoOpenPending);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const tauri = isTauri();

  useEffect(() => {
    const container = stripRef.current;
    if (container === null) return;
    const game = new GameStrip();
    gameRef.current = game;
    let cancelled = false;

    void (async () => {
      await game.init(container, useStore.getState().uiScale, tauri);
      if (cancelled) return;
      // Signal readiness after the first frame has painted, so the fade reveal lines up with
      // the strip actually being on screen (rather than popping in mid-fade).
      requestAnimationFrame(() => {
        if (!cancelled) onReadyRef.current?.();
      });
      // Offline progress: the store is already hydrated (App did it before switching screens),
      // and the engine is live now — replay the elapsed time and surface the summary.
      if (bootSave !== null) {
        const elapsed = Date.now() - bootSave.lastSavedAt;
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
  }, [tauri, bootSave]);

  useEffect(() => {
    gameRef.current?.applyScale(uiScale);
  }, [uiScale]);

  // Auto-open: when the engine signals its interval is due (autoOpenPending), reveal every
  // chest with the same staggered floating toasts as a manual click — never a silent dump.
  useEffect(() => {
    if (!autoOpenPending) return;
    revealAllChests();
    useStore.getState().clearAutoOpen();
  }, [autoOpenPending]);

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
    <>
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
      {offline !== null && (
        <div style={{ pointerEvents: 'auto' }}>
          <OfflineSummaryModal summary={offline} onClose={() => setOffline(null)} />
        </div>
      )}
    </>
  );
}

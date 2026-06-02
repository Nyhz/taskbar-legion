import { useEffect, useRef, useState } from 'react';
import { GameStrip } from '@/game/GameStrip';
import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { loadGame, saveGame, resetGame } from '@/persistence/saveManager';
import type { OfflineSummary } from '@/sim/offline';
import { PanelLayer } from './PanelLayer';
import { StripHud } from '@/ui/hud/StripHud';
import { StripOverlay } from '@/ui/overlay/StripOverlay';
import { OfflineSummaryModal } from '@/ui/components/OfflineSummaryModal';
import { ContextMenuProvider } from '@/ui/components/ContextMenu';
import { PALETTE } from '@/styles/palette';

const STRIP_LOGICAL_HEIGHT = 130; // must match GameStrip.STRIP_HEIGHT
// The game is a fixed-width strip anchored to the bottom-center of the page — sized
// for the eventual taskbar dock, NOT the full screen width. uiScale zooms the whole
// thing proportionally (logical width stays 800, so layout is aspect-stable).
const STRIP_LOGICAL_WIDTH = 800;
const MIN_OFFLINE_MS = 60_000; // only show the summary after a meaningful break
const AUTOSAVE_MS = 30_000;

export function App(): React.JSX.Element {
  const stripRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameStrip | null>(null);
  const uiScale = useStore((s) => s.uiScale);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);

  useEffect(() => {
    const container = stripRef.current;
    if (container === null) return;
    const game = new GameStrip();
    gameRef.current = game;
    let cancelled = false;

    // Dev/console escape hatch for a clean restart: `resetGame()` in the console wipes
    // ALL persistence and reloads to a fresh 1-1 (also available as Options → New Game).
    (window as unknown as { resetGame: () => void }).resetGame = () => void resetGame();

    void (async () => {
      const save = await loadGame();
      if (cancelled) return;
      if (save !== null) useStore.getState().hydrate(save);
      await game.init(container, useStore.getState().uiScale);
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
    // not just on the 30s timer — the unload save is an async IndexedDB write the
    // browser often drops, so recent progress would otherwise be lost on reload.
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
  }, []);

  useEffect(() => {
    gameRef.current?.applyScale(uiScale);
  }, [uiScale]);

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: PALETTE.bgDeep,
        display: 'flex',
        flexDirection: 'column',
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
            width: STRIP_LOGICAL_WIDTH * uiScale,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Transparent zone above the strip where the floating menu panels live;
              they are bottom-anchored so they rise from the top of the strip. zIndex
              lifts it above the topbar/strip so the tech tree can visibly slide up
              over them from below (panel-zone is pointer-transparent — see PanelLayer). */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 5 }}>
            <PanelLayer />
          </div>
          <StripHud />
          <div style={{ position: 'relative', height: STRIP_LOGICAL_HEIGHT * uiScale, width: '100%' }}>
            <div ref={stripRef} style={{ height: '100%', width: '100%' }} />
            <StripOverlay />
          </div>
        </div>
      </ContextMenuProvider>
      {offline !== null && <OfflineSummaryModal summary={offline} onClose={() => setOffline(null)} />}
    </div>
  );
}

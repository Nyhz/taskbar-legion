import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { loadGame, resetGame } from '@/persistence/saveManager';
import type { SaveV1 } from '@/persistence/saveSchema';
import { GameView } from './GameView';
import { TitleScreen } from '@/ui/title/TitleScreen';
import { ContextMenuProvider } from '@/ui/components/ContextMenu';
import { DragOverlay } from '@/ui/components/dnd';
import { PALETTE } from '@/styles/palette';
import { isTauri } from '@/platform/tauri';
import { fadeOutMusic } from '@/platform/audio';

const EXIT_MS = 680; // title shrink-out duration (matches the .tl-title-exit animation)

// Top-level router: boots at the title screen, then hands off to the live game once the
// player picks Start/Continue. Title + game share ONE window (no resize), so the hand-off is
// a clean "descent": the game mounts BEHIND the still-opaque title, and once it has painted
// the title shrinks toward the bottom-centre strip and fades, revealing the live game in place.
export function App(): React.JSX.Element {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const tauri = isTauri();

  const saveRef = useRef<SaveV1 | null>(null);
  const [booted, setBooted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [exiting, setExiting] = useState(false); // title kept mounted on TOP of the game while it leaves
  const [slideOut, setSlideOut] = useState(false); // play the shrink-out animation
  const revealedRef = useRef(false); // dedupe: the reveal fires once (onReady or the fallback)

  // Boot: load the save ONCE (don't hydrate yet — that happens at the title→game hand-off so
  // the title screen runs on defaults and the offline summary fires on the game, not here).
  useEffect(() => {
    (window as unknown as { resetGame: () => void }).resetGame = () => void resetGame();
    let cancelled = false;
    void (async () => {
      const save = await loadGame();
      if (cancelled) return;
      saveRef.current = save;
      setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Once the game has actually painted (GameView.onReady), shrink the title away to reveal it.
  // A fallback fires it too, so a missed onReady can't strand the title covering the game.
  const startReveal = (): void => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setSlideOut(true);
    window.setTimeout(() => {
      setExiting(false);
      setTransitioning(false);
    }, EXIT_MS + 60);
  };

  const handleStart = (): void => {
    if (transitioning) return;
    revealedRef.current = false;
    setTransitioning(true);
    const save = saveRef.current;
    if (save !== null) {
      try {
        useStore.getState().hydrate(save);
      } catch (err) {
        // A save that passed migrate but throws in hydrate must NOT brick the app —
        // fall through to a fresh game (hydrate leaves the store at defaults on throw).
        console.error('Save hydrate failed — starting fresh to avoid a boot loop', err);
      }
    }
    fadeOutMusic(); // bow the title track out smoothly as the game takes over
    // The window is ALREADY the overlay (set up on boot) — no resize. Keep the title band ON
    // TOP covering the game as it spins up, then shrink it away once the strip has painted.
    setExiting(true);
    setScreen('game'); // mount GameView BEHIND the title band
    window.setTimeout(startReveal, 4000); // fallback if onReady never arrives
  };

  // In Tauri it's ALL one transparent overlay (title band + game both float over the desktop);
  // only the plain-browser dev build paints the opaque page background.
  const overlayChrome = tauri;

  return (
    <div
      id="tl-app-root"
      style={{
        position: 'relative',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: overlayChrome ? 'transparent' : PALETTE.bgDeep,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: overlayChrome ? 'none' : undefined,
      }}
    >
      <ContextMenuProvider>
        {booted && (
          <>
            {screen === 'game' && <GameView bootSave={saveRef.current} onReady={startReveal} />}
            {(screen === 'title' || exiting) && (
              <TitleScreen hasSave={saveRef.current !== null} onStart={handleStart} exiting={slideOut} />
            )}
          </>
        )}
      </ContextMenuProvider>
      {/* The floating drag ghost (portals to <body>); renders nothing unless dragging. */}
      <DragOverlay />
    </div>
  );
}

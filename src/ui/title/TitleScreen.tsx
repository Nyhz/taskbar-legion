import { useEffect, useState } from 'react';
import { PALETTE } from '@/styles/palette';
import { quitGame } from '@/platform/quit';
import { setupTitleWindow } from '@/platform/desktopOverlay';
import {
  initTitleMusic,
  armGestureUnlock,
  isMusicMuted,
  isMusicAvailable,
  toggleMute,
  subscribeAudio,
  playClick,
} from '@/platform/audio';
import { TitleStage } from './TitleStage';
import logoUrl from '@/assets/logos/taskbar-legion-logo.png';

// The start screen: the dusk scene (TitleStage) with the logo, a primary Start/Continue
// button, an Exit button, and a music toggle. It lives in a fixed-height BAND centred in the
// overlay window — the margins above and below stay transparent (the desktop shows through),
// keeping the original title proportions instead of stretching to the full window height.
// On mount it sets up the desktop overlay (Tauri) and kicks off the looping music.

const BAND_H = 720; // the title content band height (centred); matches the TitleScene canvas

export function TitleScreen({ hasSave, onStart, exiting = false }: { hasSave: boolean; onStart: () => void; exiting?: boolean }): React.JSX.Element {
  useEffect(() => {
    void setupTitleWindow();
    initTitleMusic();
    armGestureUnlock();
  }, []);

  return (
    // Full window: transparent + non-interactive so the margins click straight through to the
    // desktop; the centred band is the only painted, interactive surface.
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none', fontFamily: 'inherit' }}>
      <div
        className={exiting ? 'tl-title-exit' : undefined}
        style={{ position: 'relative', width: '100%', height: BAND_H, maxHeight: '100%', overflow: 'hidden', pointerEvents: 'auto' }}
      >
        <TitleStage />

      {/* Logo — top centre, above the face-off. */}
      <div style={{ position: 'absolute', top: '4%', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <img
          src={logoUrl}
          alt="Taskbar Legion"
          className="tl-logo"
          style={{
            maxWidth: '82%',
            maxHeight: 400,
            objectFit: 'contain',
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {/* Menu — low, over the green grass below the face-off. Fades in after the logo. */}
      <div
        className="tl-menu-in"
        style={{
          position: 'absolute',
          top: '74%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          width: 240,
        }}
      >
        <MenuButton onClick={onStart} primary>
          {hasSave ? 'Continue' : 'Start Game'}
        </MenuButton>
        <MenuButton onClick={() => void quitGame()}>Exit</MenuButton>
      </div>

        <MuteToggle />
      </div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}): React.JSX.Element {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => {
        playClick();
        onClick();
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{
        padding: '12px 0',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 2,
        cursor: 'pointer',
        color: PALETTE.textLight,
        background: primary
          ? hover
            ? PALETTE.titleRedHi
            : PALETTE.titleRed
          : hover
            ? PALETTE.bgInset
            : PALETTE.bgPanel,
        border: `2px solid ${primary ? PALETTE.titleRedHi : PALETTE.goldDim}`,
        boxShadow: `0 0 0 1px ${PALETTE.ink}, 4px 4px 0 0 rgba(0,0,0,0.5)`,
      }}
    >
      {children}
    </button>
  );
}

function MuteToggle(): React.JSX.Element | null {
  const [, force] = useState(0);
  useEffect(() => subscribeAudio(() => force((n) => n + 1)), []);
  if (!isMusicAvailable()) return null; // no track loaded → hide the control
  const muted = isMusicMuted();
  return (
    <button
      onClick={() => toggleMute()}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      title={muted ? 'Unmute music' : 'Mute music'}
      className="tl-fade-late"
      style={{
        position: 'absolute',
        top: 14,
        right: 14,
        width: 34,
        height: 34,
        fontSize: 16,
        cursor: 'pointer',
        color: PALETTE.textLight,
        background: PALETTE.bgPanel,
        border: `1px solid ${PALETTE.goldDim}`,
        boxShadow: `0 0 0 1px ${PALETTE.ink}`,
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}

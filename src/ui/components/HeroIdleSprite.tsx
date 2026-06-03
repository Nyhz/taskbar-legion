import { useEffect, useState } from 'react';
import knightIdle from '@/assets/characters/knight/actions/knight-idle.png';
import rangerIdle from '@/assets/characters/ranger/actions/ranger-idle.png';
import priestIdle from '@/assets/characters/priest/actions/priest-idle.png';
import mageIdle from '@/assets/characters/mage/actions/mage-idle.png';
import { PALETTE } from '@/styles/palette';

// An animated IDLE sprite for a class, rendered as a pure-DOM CSS background sprite (the
// React party menu can't use the Pixi sprites). The sheets are horizontal strips of
// 100×100 frames (see game/render/characterFrames.ts); the character sits centred at
// x≈52, feet at y60, head ~y38 (≈22px tall). We scale uniformly so the FIGURE fills the
// box (cover-fit, anchored on the character centre) and let overflow crop the rest, with
// a transparent background by default. Frame count is read from the loaded sheet width.

const FRAME = 100; // source frame is 100×100
const BODY_CX = 52; // character centre x within a frame
const CHAR_CY = 49; // character centre y within a frame (midpoint of head y38 → feet y60)
const CHAR_H = 26; // source px the figure (+ small margin) occupies vertically — lower = bigger

interface IdleDef { url: string; fps: number }
const IDLE: Record<string, IdleDef> = {
  knight: { url: knightIdle, fps: 7 },
  ranger: { url: rangerIdle, fps: 7 },
  priest: { url: priestIdle, fps: 6 },
  mage: { url: mageIdle, fps: 7 },
};

// url → frame count (sheet width / 100), cached after the image loads once.
const frameCounts = new Map<string, number>();

export function HeroIdleSprite({
  classKey, width, height, border, boxShadow, background,
}: {
  classKey: string;
  width: number;
  height: number;
  border?: string;
  boxShadow?: string;
  background?: string; // box background (default transparent — the figure stands free)
}): React.JSX.Element {
  const def = IDLE[classKey];
  const [frames, setFrames] = useState(() => frameCounts.get(def?.url ?? '') ?? 1);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (def === undefined) return;
    const cached = frameCounts.get(def.url);
    if (cached !== undefined) { setFrames(cached); return; }
    const img = new Image();
    img.onload = () => {
      const n = Math.max(1, Math.floor(img.naturalWidth / FRAME));
      frameCounts.set(def.url, n);
      setFrames(n);
    };
    img.src = def.url;
  }, [def]);

  useEffect(() => {
    if (def === undefined || frames <= 1) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames), 1000 / def.fps);
    return () => window.clearInterval(id);
  }, [def, frames]);

  const borderStyle = border ?? 'none';
  if (def === undefined) {
    return <div style={{ width, height, background: PALETTE.bgInset, border: borderStyle, boxShadow }} />;
  }

  // Scale so the figure fills the box height; anchor (BODY_CX, CHAR_CY) at the box centre.
  const scale = height / CHAR_H;

  return (
    <div
      style={{
        width, height, overflow: 'hidden', border: borderStyle, boxShadow,
        background: background ?? 'transparent',
        backgroundImage: `url(${def.url})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frames * FRAME * scale}px ${FRAME * scale}px`,
        backgroundPositionX: `${width / 2 - (frame * FRAME + BODY_CX) * scale}px`,
        backgroundPositionY: `${height / 2 - CHAR_CY * scale}px`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

import { useEffect, useState } from 'react';
import { figureMeta, frameCell, type FigureMeta } from '@/game/render/figureData';
import { heroSheetUrl } from '@/game/render/figureSheets';
import { IDLE } from '@/game/render/figureClip';
import { PALETTE } from '@/styles/palette';

// A class's hero, standing and breathing: the IDLE animation of the strip's own figure (the redesign's art —
// src/assets/strip/figs), drawn in the DOM as a CSS background sprite, since the React panels cannot use the Pixi
// sprites. The art is never stretched: it is shown at a WHOLE number of box pixels per art pixel — the largest
// that lets the tallest hero stand inside the box (×2 in the hero window's niche, ×1 on the title's path).
// The figure stands with its feet FEET_FROM_BOTTOM above the box's bottom edge and its body centred across the
// box; it is not clipped, so a plume or a staff may rise past a box that is lower than the figure.

/** The tallest hero's standing figure, in art pixels (the knight's plume, the priest's staff). */
const HERO_HEIGHT = 40;
/** The ground line sits this far above the box's bottom edge (both callers seat the feet 3 px up: the title's
 *  box puts them on the path, the niche's on its stone slab). */
const FEET_FROM_BOTTOM = 3;

interface IdleSheet {
  url: string;
  meta: FigureMeta;
  /** Columns and rows of the whole atlas, to size the background. */
  rows: number;
}

function idleSheet(classKey: string): IdleSheet | undefined {
  const url = heroSheetUrl(classKey);
  const meta = figureMeta(classKey);
  if (url === undefined || meta === undefined || meta.anims[IDLE] === undefined) return undefined;
  let rows = 0;
  for (const anim of Object.values(meta.anims)) rows = Math.max(rows, anim.row + Math.ceil(anim.n / meta.cols));
  return { url, meta, rows };
}

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
  const sheet = idleSheet(classKey);
  const [frame, setFrame] = useState(0);

  // Step through the idle at each frame's own duration.
  const idle = sheet?.meta.anims[IDLE];
  useEffect(() => {
    if (idle === undefined || idle.n <= 1) return;
    const id = window.setTimeout(() => setFrame((f) => (f + 1) % idle.n), idle.ms[frame % idle.n] ?? 170);
    return () => window.clearTimeout(id);
  }, [idle, frame]);

  const borderStyle = border ?? 'none';
  if (sheet === undefined || idle === undefined) {
    return <div style={{ width, height, background: PALETTE.bgInset, border: borderStyle, boxShadow }} />;
  }

  const { meta, url, rows } = sheet;
  const scale = Math.max(1, Math.floor(height / HERO_HEIGHT));
  const [col, row] = frameCell(meta, idle, frame % idle.n);
  // Centre the standing body across the box; seat the ground row above the bottom edge.
  const bodyCx = meta.root + (meta.box[0] + meta.box[2]) / 2;
  const left = Math.round(width / 2 - bodyCx * scale);
  const top = height - FEET_FROM_BOTTOM - meta.ground * scale;

  return (
    <div style={{ position: 'relative', width, height, border: borderStyle, boxShadow, background: background ?? 'transparent' }}>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: meta.w * scale,
          height: meta.h * scale,
          backgroundImage: `url(${url})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${meta.cols * meta.w * scale}px ${rows * meta.h * scale}px`,
          backgroundPosition: `${-col * meta.w * scale}px ${-row * meta.h * scale}px`,
          imageRendering: 'pixelated',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

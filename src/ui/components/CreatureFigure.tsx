import { useEffect, useState } from 'react';
import { figureMeta, frameCell } from '@/game/render/figureData';
import { creatureSheetLoader } from '@/game/render/figureSheets';
import { IDLE } from '@/game/render/figureClip';

// A creature of the worlds, standing: the IDLE of the strip's own figure (src/assets/strip/figs) drawn in the DOM as
// a CSS background sprite, at ONE box pixel per art pixel (never stretched), like HeroIdleSprite does for the
// heroes. Its atlas is its own small chunk, fetched the first time it is shown. `frame: 'head'` shows only the top
// of the figure in the box (a picker's cell); `dark` shows its shape and nothing else (not yet discovered).

export function CreatureFigure({
  creature, width, height, frame = 'stand', dark = false, animate = true,
}: {
  creature: string;
  width: number;
  height: number;
  frame?: 'stand' | 'head';
  dark?: boolean;
  animate?: boolean;
}): React.JSX.Element {
  const meta = figureMeta(creature);
  const idle = meta?.anims[IDLE];
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let live = true;
    setUrl(undefined);
    void creatureSheetLoader(creature)?.().then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [creature]);

  useEffect(() => {
    if (!animate || dark || idle === undefined || idle.n <= 1) return;
    const id = window.setTimeout(() => setStep((f) => (f + 1) % idle.n), idle.ms[step % idle.n] ?? 170);
    return () => window.clearTimeout(id);
  }, [animate, dark, idle, step]);

  if (meta === undefined || idle === undefined || url === undefined) return <div style={{ width, height }} />;

  let rows = 0;
  for (const anim of Object.values(meta.anims)) rows = Math.max(rows, anim.row + Math.ceil(anim.n / meta.cols));
  const [col, row] = frameCell(meta, idle, step % idle.n);
  const bodyCx = meta.root + (meta.box[0] + meta.box[2]) / 2;
  const left = Math.round(width / 2 - bodyCx);
  // Standing: the feet 3 px above the bottom edge (on the niche's slab). Head: the top of the figure 2 px under
  // the top edge.
  const top = frame === 'stand' ? height - 3 - meta.ground : 2 - (meta.ground + meta.box[1]);

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: meta.w,
          height: meta.h,
          backgroundImage: `url(${url})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${meta.cols * meta.w}px ${rows * meta.h}px`,
          backgroundPosition: `${-col * meta.w}px ${-row * meta.h}px`,
          imageRendering: 'pixelated',
          filter: dark ? 'brightness(0)' : undefined,
          opacity: dark ? 0.55 : undefined,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

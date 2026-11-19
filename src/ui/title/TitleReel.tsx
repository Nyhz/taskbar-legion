import { useEffect, useRef } from 'react';
import { STRIP_ART_HEIGHT, STRIP_ART_WIDTH } from '@/game/render/stripBackdropData';
import { createReel, REEL, stepReel } from './reelScript';
import { ReelArt } from './reelArt';
import { ReelPainter } from './drawReel';

// The title's scene: the party fighting each world's boss in turn (reelScript.ts), on a canvas the size of the strip
// in art pixels — the title's KitRoot zoom brings it to screen size, nearest-neighbour (title.css). It runs from the
// moment the title shows until it unmounts, the backdrop and the boss of the next world fetched ahead.

/** A frame never advances the reel by more than this (a tab in the background, a hitch). */
const MAX_STEP_MS = 50;

export function TitleReel(): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (g === null || g === undefined) return;
    const art = new ReelArt();
    const painter = new ReelPainter(g, art);
    const reel = createReel();
    art.want(0);
    art.want(1);
    let raf = 0;
    let last = performance.now();
    const frame = (now: number): void => {
      const dt = Math.min(MAX_STEP_MS, now - last);
      last = now;
      art.want((reel.world + 1) % REEL.worlds); // the next world, while this one plays
      stepReel(reel, dt, (w) => art.ready(w));
      painter.draw(reel);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      art.dispose();
    };
  }, []);

  return <canvas ref={ref} className="reel" width={STRIP_ART_WIDTH} height={STRIP_ART_HEIGHT} aria-hidden="true" />;
}

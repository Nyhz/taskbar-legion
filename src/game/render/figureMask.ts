import { Rectangle, Texture } from 'pixi.js';
import type { FigureSheet } from './figureTextures';

// A figure's frames as flat WHITE shapes: the same layout, every opaque pixel white. Tinted, a copy of the current
// frame becomes a solid-colour silhouette — what an elite's rim is made of (render/eliteLook): copies of the shape
// drawn a pixel or two off behind the figure. Made once per sheet the first time it is asked for, from the
// sheet's own atlas (a 2D canvas: no filter, so it works wherever the figures themselves draw), and dropped with
// its sheet.

const masks = new Map<FigureSheet, FigureSheet>();

function prune(): void {
  for (const [sheet, mask] of masks) {
    if (!sheet.released) continue;
    masks.delete(sheet);
    let source: Texture['source'] | null = null;
    for (const frames of Object.values(mask.clips)) {
      for (const t of frames) {
        source = t.source;
        t.destroy(false);
      }
    }
    source?.destroy();
  }
}

/** The white shapes of `sheet`, or null if they cannot be made (no canvas, an unloaded sheet). */
export function figureMask(sheet: FigureSheet): FigureSheet | null {
  if (sheet.released) return null;
  const hit = masks.get(sheet);
  if (hit !== undefined) return hit;
  prune();
  const first = Object.values(sheet.clips)[0]?.[0];
  if (first === undefined || typeof document === 'undefined') return null;
  const atlas = first.source;
  const image = atlas.resource as CanvasImageSource | undefined;
  const canvas = document.createElement('canvas');
  canvas.width = atlas.pixelWidth;
  canvas.height = atlas.pixelHeight;
  const ctx = canvas.getContext('2d');
  if (ctx === null || image === undefined) return null;
  try {
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'source-in'; // keep the figure's alpha, replace its colours
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  const white = Texture.from(canvas);
  white.source.scaleMode = 'nearest';
  const clips: Record<string, Texture[]> = {};
  for (const [name, frames] of Object.entries(sheet.clips)) {
    clips[name] = frames.map((t) => new Texture({ source: white.source, frame: new Rectangle(t.frame.x, t.frame.y, t.frame.width, t.frame.height) }));
  }
  const mask: FigureSheet = { key: sheet.key, meta: sheet.meta, clips, released: false };
  masks.set(sheet, mask);
  return mask;
}

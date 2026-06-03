import type { Graphics } from 'pixi.js';
import { hexToNum } from '@/styles/palette';

// Procedural pixel-art bodies drawn with Graphics (ART.md). Distinct silhouette +
// accent per class/enemy. Kept as draw helpers (composed into Container sprites)
// rather than RenderTextures — simple, deterministic, and crisp at every zoom.

const INK = hexToNum('#0d0b12');
const SKIN = hexToNum('#f0d9b5');

export const CLASS_ACCENT: Record<string, string> = {
  knight: '#c9a24b',
  ranger: '#5fae57',
  priest: '#e2dccd',
};

/** Draw a ~12×22 hero body into `g` (origin = top-left of the body). */
export function drawHero(g: Graphics, classKey: string): void {
  const accent = hexToNum(CLASS_ACCENT[classKey] ?? '#c9a24b');
  g.clear();
  g.rect(-1, -1, 14, 24).fill({ color: INK }); // outline
  g.rect(0, 0, 12, 22).fill({ color: accent }); // torso/legs
  g.rect(2, -8, 8, 9).fill({ color: INK });
  g.rect(3, -7, 6, 7).fill({ color: SKIN }); // head
  // a small weapon/staff nub to vary silhouette per role
  g.rect(12, 4, 3, 12).fill({ color: INK });
}

/** Draw an enemy body into `g`. Bosses are bigger + crowned; magic ones tinted blue. */
export function drawEnemy(g: Graphics, opts: { isBoss: boolean; magic: boolean; tint: number }): void {
  const base = opts.magic ? hexToNum('#6a5acd') : opts.tint;
  g.clear();
  const w = opts.isBoss ? 22 : 13;
  const h = opts.isBoss ? 26 : 16;
  g.rect(-1, -1, w + 2, h + 2).fill({ color: INK });
  g.rect(0, 0, w, h).fill({ color: base });
  // eyes
  g.rect(Math.round(w * 0.22), Math.round(h * 0.28), 2, 2).fill({ color: 0xffe27a });
  g.rect(Math.round(w * 0.62), Math.round(h * 0.28), 2, 2).fill({ color: 0xffe27a });
  if (opts.isBoss) {
    // crown
    g.rect(2, -5, w - 4, 4).fill({ color: hexToNum('#e8b24c') });
    g.rect(2, -8, 3, 4).fill({ color: hexToNum('#e8b24c') });
    g.rect(Math.round(w / 2) - 1, -9, 3, 5).fill({ color: hexToNum('#e8b24c') });
    g.rect(w - 5, -8, 3, 4).fill({ color: hexToNum('#e8b24c') });
  }
}

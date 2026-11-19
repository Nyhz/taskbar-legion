import { frameCell } from '@/game/render/figureData';
import { fxFrameAt, fxMeta } from '@/game/render/fxData';
import { backdropKeyFor, backdropWorld, STRIP_ART_HEIGHT as H, STRIP_ART_WIDTH as W, STRIP_PATH_Y } from '@/game/render/stripBackdropData';
import { frameOf, HERO_KEYS, type Actor, type FxRun, type Reel } from './reelScript';
import type { ReelArt } from './reelArt';

// Paints the title's reel (reelScript.ts) on its 600×160 canvas, 1 art pixel = 1 canvas pixel: the world's backdrop
// (the layers behind the fighters, the boss, the heroes, shots and effects, then the layer in front), and between
// two worlds a dithered wipe from one backdrop to the next.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class ReelPainter {
  private readonly tmp = document.createElement('canvas');
  private readonly mask = document.createElement('canvas');
  private maskP = -1;

  constructor(
    private readonly g: CanvasRenderingContext2D,
    private readonly art: ReelArt,
  ) {
    for (const c of [this.tmp, this.mask]) {
      c.width = W;
      c.height = H;
    }
  }

  draw(r: Reel): void {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    this.layers(r, 'back');
    for (const e of r.fx) if (!e.front) this.fx(e);
    if (r.boss !== null) this.figure(r.boss);
    for (const key of HERO_KEYS) this.figure(r.heroes[key]);
    for (const s of r.shots) this.fxFrame(s.key, 0, s.x, s.y);
    for (const e of r.fx) if (e.front) this.fx(e);
    this.layers(r, 'fore');
  }

  /** The backdrop: every layer but the one in front ('back'), or that one ('fore'); mid-wipe, both worlds. */
  private layers(r: Reel, part: 'back' | 'fore'): void {
    if (r.wipe === null) {
      this.world(this.g, r.world, part);
      return;
    }
    this.world(this.g, r.wipe.from, part);
    const t = this.tmp.getContext('2d');
    if (t === null) return;
    t.imageSmoothingEnabled = false;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, W, H);
    this.world(t, r.wipe.to, part);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(this.maskFor(r.wipe.p), 0, 0);
    this.g.drawImage(this.tmp, 0, 0);
  }

  private world(g: CanvasRenderingContext2D, w: number, part: 'back' | 'fore'): void {
    const img = this.art.backdrops.get(w);
    const layers = backdropWorld(backdropKeyFor(w + 1))?.layers;
    if (img === undefined || layers === undefined) return;
    layers.forEach((layer, i) => {
      if ((layer.name === 'fore') === (part === 'fore')) g.drawImage(img, 0, i * H, W, H, 0, 0, W, H);
    });
  }

  /** A dithered sweep from left to right: the next world shows where the mask is set. */
  private maskFor(p: number): HTMLCanvasElement {
    const step = Math.round(p * 64);
    if (step === this.maskP) return this.mask;
    this.maskP = step;
    const m = this.mask.getContext('2d');
    if (m === null) return this.mask;
    const data = m.createImageData(W, H);
    const a = data.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const th = ((BAYER[(y & 3) * 4 + (x & 3)] ?? 0) + 0.5) / 16;
        if (p * 1.35 - x / W - th * 0.35 > 0) a[(y * W + x) * 4 + 3] = 255;
      }
    }
    m.putImageData(data, 0, 0);
    return this.mask;
  }

  private figure(a: Actor): void {
    const sheet = this.art.figures.get(a.key);
    const anim = a.meta.anims[a.anim];
    if (sheet === undefined || anim === undefined || a.alpha <= 0) return;
    const { w, h, root, ground } = a.meta;
    const [col, row] = frameCell(a.meta, anim, frameOf(a));
    const g = this.g;
    g.save();
    g.translate(Math.round(a.x), STRIP_PATH_Y - ground);
    if (a.facing < 0) g.scale(-1, 1);
    g.globalAlpha = a.alpha;
    g.drawImage(sheet.img, col * w, row * h, w, h, -root, 0, w, h);
    const wash = Math.max(a.white, a.flash > 0 ? 0.75 : 0);
    if (wash > 0) {
      g.globalAlpha = a.alpha * wash;
      g.drawImage(sheet.white, col * w, row * h, w, h, -root, 0, w, h);
    }
    g.restore();
  }

  private fx(e: FxRun): void {
    const m = fxMeta(e.key);
    if (m === undefined || e.t < 0) return;
    const f = fxFrameAt(m, e.t);
    if (f >= 0) this.fxFrame(e.key, f, e.x, e.y);
  }

  private fxFrame(key: string, f: number, x: number, y: number): void {
    const m = fxMeta(key);
    const page = m === undefined ? undefined : this.art.fxPages.get(m.page);
    if (m === undefined || page === undefined) return;
    const sx = m.x + (f % m.cols) * m.w;
    const sy = m.y + Math.floor(f / m.cols) * m.h;
    this.g.drawImage(page, sx, sy, m.w, m.h, Math.round(x - m.ax), Math.round(y - m.ay), m.w, m.h);
  }
}

import { creatureSheetLoader, heroSheetUrl } from '@/game/render/figureSheets';
import { backdropSheetLoader } from '@/game/render/backdropSheets';
import { backdropKeyFor } from '@/game/render/stripBackdropData';
import { fxMeta } from '@/game/render/fxData';
import { fxPageUrl } from '@/game/render/fxSheets';
import { bossKeyOf, HERO_KEYS } from './reelScript';

// The art the title's reel paints with, loaded as plain images (no Pixi): the heroes' figures, every page of the
// effects it plays, and per world its backdrop sheet and its boss's figure — those two fetched when the reel is
// about to need them (each is its own chunk). A figure also gets a WHITE copy, for a hit's flash and the column.

const REEL_FX = ['arrive_a_back', 'arrive_a_front', 'arrow', 'arrow_heavy', 'arrow_hit', 'light_bolt', 'light_hit', 'foe_hit', 'block_spark', 'cleave_wave', 'nova_hit', 'heal_bloom'];
const WHITE = '#fffaf0';

export interface Sheet {
  img: HTMLImageElement;
  white: HTMLCanvasElement;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url.slice(0, 60)}`));
    img.src = url;
  });
}

function whiteCopy(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  if (g !== null) {
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = WHITE;
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

export class ReelArt {
  readonly figures = new Map<string, Sheet>();
  readonly backdrops = new Map<number, HTMLImageElement>();
  readonly fxPages = new Map<number, HTMLImageElement>();
  private pending = new Set<string>();
  private dead = false;

  constructor() {
    for (const key of HERO_KEYS) {
      const url = heroSheetUrl(key);
      if (url !== undefined) this.fetchFigure(key, () => Promise.resolve(url));
    }
    const pages = new Set(REEL_FX.map((k) => fxMeta(k)?.page).filter((p): p is number => p !== undefined));
    for (const page of pages) {
      const url = fxPageUrl(page);
      if (url !== undefined) void loadImage(url).then((img) => !this.dead && this.fxPages.set(page, img), () => {});
    }
  }

  /** Stop keeping what still arrives (the title has gone). */
  dispose(): void {
    this.dead = true;
  }

  private fetchFigure(key: string, url: () => Promise<string>): void {
    if (this.figures.has(key) || this.pending.has(key)) return;
    this.pending.add(key);
    void url()
      .then(loadImage)
      .then((img) => {
        if (!this.dead) this.figures.set(key, { img, white: whiteCopy(img) });
      })
      .catch(() => {}) // a missing sheet leaves that world waiting; the reel fights on where it is
      .finally(() => this.pending.delete(key));
  }

  /** Start fetching world `w`'s backdrop and boss (0–9), if not already there. */
  want(w: number): void {
    const boss = bossKeyOf(w);
    const loader = boss === undefined ? undefined : creatureSheetLoader(boss);
    if (boss !== undefined && loader !== undefined) this.fetchFigure(boss, loader);
    const id = `bg${w}`;
    if (this.backdrops.has(w) || this.pending.has(id)) return;
    const bg = backdropSheetLoader(backdropKeyFor(w + 1), 'normal');
    if (bg === undefined) return;
    this.pending.add(id);
    void bg()
      .then(loadImage)
      .then((img) => {
        if (!this.dead) this.backdrops.set(w, img);
      })
      .catch(() => {})
      .finally(() => this.pending.delete(id));
  }

  /** Whether world `w` can be shown: its backdrop, its boss and the heroes are in. */
  ready(w: number): boolean {
    const boss = bossKeyOf(w);
    return this.backdrops.has(w) && boss !== undefined && this.figures.has(boss) && HERO_KEYS.every((k) => this.figures.has(k));
  }
}

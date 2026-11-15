import { Assets, Rectangle, Texture } from 'pixi.js';
import { figureMeta, frameCell } from './figureData';
import type { FigureSheet } from './figureTextures';
import { FX_KEYS, FX_PAGES, PANE_FIGURES, SKIN_NAMES, fxMeta, hasSkin, paneSheetMeta } from './fxData';
import { fxPageUrl, paneSheetUrl, skinSheetUrl } from './fxSheets';

// The ability effects' atlas and the heroes' skins as Pixi textures. Everything loads before the first frame
// (loadFx, from GameStrip.init): the pages of the effects' atlas, and per hero one atlas per skin, cut with the
// hero's own figure meta (a skin has exactly the layout of the figure it repaints).

const frames = new Map<string, Texture[]>();
const skins = new Map<string, FigureSheet>();
const panes = new Map<string, Texture[]>();

// A figure's lit panes (small: one atlas of little cells), cut into its cells.
async function loadPanes(figure: string, url: string): Promise<void> {
  const meta = paneSheetMeta(figure);
  if (meta === undefined) return;
  const atlas = await Assets.load<Texture>(url);
  atlas.source.scaleMode = 'nearest';
  const cut: Texture[] = [];
  const count = Math.floor(atlas.source.height / meta.h) * meta.cols;
  for (let i = 0; i < count; i++) cut.push(new Texture({ source: atlas.source, frame: new Rectangle((i % meta.cols) * meta.w, Math.floor(i / meta.cols) * meta.h, meta.w, meta.h) }));
  panes.set(figure, cut);
}

async function loadSkin(hero: string, skin: string, url: string): Promise<void> {
  const meta = figureMeta(hero);
  if (meta === undefined) return;
  const atlas = await Assets.load<Texture>(url);
  atlas.source.scaleMode = 'nearest';
  const clips: Record<string, Texture[]> = {};
  for (const [name, anim] of Object.entries(meta.anims)) {
    const cut: Texture[] = [];
    for (let i = 0; i < anim.n; i++) {
      const [col, row] = frameCell(meta, anim, i);
      cut.push(new Texture({ source: atlas.source, frame: new Rectangle(col * meta.w, row * meta.h, meta.w, meta.h) }));
    }
    clips[name] = cut;
  }
  skins.set(`${hero}/${skin}`, { key: hero, meta, clips, released: false });
}

/** Load the effects and the skins of these heroes. Rejects if the effects' atlas cannot be loaded. */
export async function loadFx(heroes: readonly string[]): Promise<void> {
  const urls: string[] = [];
  for (let page = 0; page < FX_PAGES; page++) {
    const url = fxPageUrl(page);
    if (url === undefined) throw new Error(`No effects atlas (page ${page})`);
    urls.push(url);
  }
  if (urls.length === 0) throw new Error('No effects atlas');
  // (Every page goes the way every sheet of the game does: a URL the build inlines, through Assets.load.)
  const pages = await Promise.all(urls.map((url) => Assets.load<Texture>(url)));
  for (const page of pages) page.source.scaleMode = 'nearest';
  for (const key of FX_KEYS) {
    const meta = fxMeta(key);
    const atlas = meta === undefined ? undefined : pages[meta.page];
    if (meta === undefined || atlas === undefined) continue;
    const cut: Texture[] = [];
    for (let i = 0; i < meta.n; i++) {
      const x = meta.x + (i % meta.cols) * meta.w;
      const y = meta.y + Math.floor(i / meta.cols) * meta.h;
      cut.push(new Texture({ source: atlas.source, frame: new Rectangle(x, y, meta.w, meta.h) }));
    }
    frames.set(key, cut);
  }
  const jobs: Promise<void>[] = [];
  for (const hero of heroes) {
    for (const skin of SKIN_NAMES) {
      const skinUrl = hasSkin(hero, skin) ? skinSheetUrl(hero, skin) : undefined;
      if (skinUrl !== undefined) jobs.push(loadSkin(hero, skin, skinUrl));
    }
  }
  for (const figure of PANE_FIGURES) {
    const paneUrl = paneSheetUrl(figure);
    if (paneUrl !== undefined) jobs.push(loadPanes(figure, paneUrl));
  }
  await Promise.all(jobs);
}

/** The frames of an effect, or null if it is unknown or not loaded. */
export function fxFrames(key: string): Texture[] | null {
  return frames.get(key) ?? null;
}

/** A hero's figure in a skin (same clips and layout as its own), or null. */
export function heroSkin(hero: string, skin: string | null): FigureSheet | null {
  return skin === null ? null : (skins.get(`${hero}/${skin}`) ?? null);
}

/** The cells of a figure's lit panes (render/fxData panePlace says which is which), or null. */
export function paneCells(figure: string): Texture[] | null {
  return panes.get(figure) ?? null;
}

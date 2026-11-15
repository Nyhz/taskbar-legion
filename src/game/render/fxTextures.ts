import { Assets, Rectangle, Texture } from 'pixi.js';
import { figureMeta, frameCell } from './figureData';
import type { FigureSheet } from './figureTextures';
import { FX_KEYS, SKIN_NAMES, fxMeta, hasSkin } from './fxData';
import { fxAtlasUrl, skinSheetUrl } from './fxSheets';

// The ability effects' atlas and the heroes' skins as Pixi textures. Everything loads before the first frame
// (loadFx, from GameStrip.init): one atlas for all the effects, and per hero one atlas per skin, cut with the
// hero's own figure meta (a skin has exactly the layout of the figure it repaints).

const frames = new Map<string, Texture[]>();
const skins = new Map<string, FigureSheet>();

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
  const url = fxAtlasUrl();
  if (url === undefined) throw new Error('No effects atlas');
  const atlas = await Assets.load<Texture>(url);
  atlas.source.scaleMode = 'nearest';
  for (const key of FX_KEYS) {
    const meta = fxMeta(key);
    if (meta === undefined) continue;
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

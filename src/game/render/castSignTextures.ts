import { Assets } from 'pixi.js';
import type { Texture } from 'pixi.js';

// The ability signs of the interface (src/assets/ui) as Pixi textures, for the sign that rises over a caster.
// Loaded on first use and kept; a stem with no file, or one that fails to load, simply never shows.

const FILES = import.meta.glob<string>('../../assets/ui/{abil,tal,stat}_*.png', { eager: true, query: '?url', import: 'default' });

const URLS: ReadonlyMap<string, string> = new Map(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
);

const loaded = new Map<string, Texture>();
const pending = new Map<string, Promise<Texture | null>>();

/** The sign's texture if it is already in memory, else null (and its load is started). */
export function castSignTexture(stem: string): Texture | null {
  const tex = loaded.get(stem);
  if (tex !== undefined) return tex;
  void loadCastSign(stem);
  return null;
}

/** Load one sign. Resolves to null when there is no such art or it cannot be loaded. */
export function loadCastSign(stem: string): Promise<Texture | null> {
  const known = pending.get(stem);
  if (known !== undefined) return known;
  const url = URLS.get(stem);
  const job: Promise<Texture | null> =
    url === undefined
      ? Promise.resolve(null)
      : Assets.load<Texture>(url)
          .then((tex) => {
            tex.source.scaleMode = 'nearest';
            loaded.set(stem, tex);
            return tex;
          })
          .catch(() => null);
  pending.set(stem, job);
  return job;
}

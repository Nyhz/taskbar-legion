import { Assets, Texture } from 'pixi.js';

// The strip HUD's art (src/assets/ui/hud_s_*: bars, chips, the 7×7 signs) as Pixi textures. All of it loads
// before the first frame (loadStripHud, from GameStrip.init), so a bar never waits for its picture; a stem with
// no file is an empty texture and simply does not show.

const FILES = import.meta.glob<string>('../../assets/ui/hud_s_*.png', { eager: true, query: '?url', import: 'default' });

const URLS: ReadonlyMap<string, string> = new Map(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
);

const loaded = new Map<string, Texture>();

/** Load every piece. A piece that fails to load is left out (it draws nothing). */
export async function loadStripHud(): Promise<void> {
  await Promise.all(
    [...URLS.entries()].map(([stem, url]) =>
      Assets.load<Texture>(url)
        .then((tex) => {
          tex.source.scaleMode = 'nearest';
          loaded.set(stem, tex);
        })
        .catch(() => undefined),
    ),
  );
}

/** A piece by its art stem (e.g. `hud_s_bar_hero`), or the empty texture. */
export function stripHudTexture(stem: string): Texture {
  return loaded.get(stem) ?? Texture.EMPTY;
}

/** The stems that exist as files (for tests and checks). */
export function stripHudStems(): string[] {
  return [...URLS.keys()];
}

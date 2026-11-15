import { Assets, Rectangle, Texture } from 'pixi.js';
import { STRIP_ART_HEIGHT, STRIP_ART_WIDTH, type BackdropGrade } from './stripBackdropData';

// The backdrop sheets (src/assets/strip/wNN_<grade>.png: a world's parallax layers stacked top to bottom), loaded
// LAZILY — only the world the party is in, when it gets there. Each sheet is its own small chunk; like every PNG
// of the game it is inlined as a data: URI by the build (vite.config.ts), which is what keeps images decodable in
// the packaged desktop app, where the webview cannot decode images served over tauri://.

const SHEETS = import.meta.glob<string>('../../assets/strip/w*_*.png', { query: '?url', import: 'default' });

function sheetLoader(key: string, grade: BackdropGrade): (() => Promise<string>) | undefined {
  const suffix = `/${key}_${grade}.png`;
  const path = Object.keys(SHEETS).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : SHEETS[path];
}

// At most two sheets stay in memory (the one on screen and the one before it): 600×1120 px each.
const KEEP = 2;
const cache = new Map<string, { url: string; layers: Texture[] }>();

/** The layer textures of a world's grade, top layer first. Rejects if the sheet does not exist. */
export async function loadBackdropLayers(key: string, grade: BackdropGrade, layerCount: number): Promise<Texture[]> {
  const id = `${key}_${grade}`;
  const hit = cache.get(id);
  if (hit !== undefined) {
    cache.delete(id); // refresh its place: most recently used last
    cache.set(id, hit);
    return hit.layers;
  }
  const loader = sheetLoader(key, grade);
  if (loader === undefined) throw new Error(`No backdrop sheet for ${id}`);
  const url = await loader();
  const sheet = await Assets.load<Texture>(url);
  sheet.source.scaleMode = 'nearest';
  const layers: Texture[] = [];
  for (let i = 0; i < layerCount; i++) {
    layers.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(0, i * STRIP_ART_HEIGHT, STRIP_ART_WIDTH, STRIP_ART_HEIGHT),
      }),
    );
  }
  cache.set(id, { url, layers });
  return layers;
}

/** Drop every cached sheet but the `KEEP` most recent and `current` (call once the new one is on screen). */
export function trimBackdropCache(current: string): void {
  for (const id of [...cache.keys()]) {
    if (cache.size <= KEEP) break;
    if (id === current) continue;
    const entry = cache.get(id);
    cache.delete(id);
    if (entry !== undefined) {
      for (const t of entry.layers) t.destroy(false);
      void Assets.unload(entry.url);
    }
  }
}

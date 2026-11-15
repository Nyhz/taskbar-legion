import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FX_KEYS, FX_PAGES, fxMeta } from '@/game/render/fxData';

// The atlases the game draws from, AS EXPORTED (src/assets): none may be larger on a side than a GPU holds as one
// texture. Many stop at 8192 — and then draw black boxes where the texture should be: the effects' atlas, one
// tall column, reached 8262 px on 2026-11-15 — so the game keeps every sheet within 4096, with room to spare.
// `export-fx` writes the effects in pages and fails rather than write a page over the limit; this is the same
// check on the files that are actually shipped, whichever export wrote them.

const ASSETS = join(__dirname, '..', '..', 'src', 'assets');
/** No sheet of the game is larger than this on a side (tools/assets/pipeline/export_fx.py PAGE_MAX). */
const MAX_SIDE = 4096;

function pngs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...pngs(path));
    else if (name.endsWith('.png')) out.push(path);
  }
  return out;
}

/** Width and height of a PNG, read from its header. */
function pngSize(path: string): { w: number; h: number } {
  const head = readFileSync(path).subarray(0, 24);
  return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
}

describe('the exported atlases', () => {
  it(`none is over ${MAX_SIDE} px on a side — effects, skins, figures, pets, backdrops, the interface`, () => {
    const files = pngs(ASSETS);
    expect(files.length).toBeGreaterThan(100);
    const tooBig = files.map((path) => ({ path: path.slice(ASSETS.length + 1), ...pngSize(path) })).filter((f) => Math.max(f.w, f.h) > MAX_SIDE);
    expect(tooBig).toEqual([]);
  });

  it('the effects are on the pages the meta names, each effect whole inside its page', () => {
    expect(FX_PAGES).toBeGreaterThan(0);
    const pages = Array.from({ length: FX_PAGES }, (_, n) => pngSize(join(ASSETS, 'strip', 'fx', `fx_${n}.png`)));
    for (const key of FX_KEYS) {
      const meta = fxMeta(key);
      if (meta === undefined) throw new Error(key);
      const page = pages[meta.page];
      expect(page, `${key}: page ${meta.page}`).toBeDefined();
      const rows = Math.ceil(meta.n / meta.cols);
      expect(meta.x + meta.w * meta.cols, key).toBeLessThanOrEqual(page?.w ?? 0);
      expect(meta.y + meta.h * rows, key).toBeLessThanOrEqual(page?.h ?? 0);
    }
    // No page is left over from an older export (the game would never load it; it would only weigh).
    const written = readdirSync(join(ASSETS, 'strip', 'fx')).filter((name) => /^fx(_\d+)?\.png$/.test(name)).sort();
    expect(written).toEqual(pages.map((_, n) => `fx_${n}.png`));
  });

  it('no two effects share a pixel of a page', () => {
    const boxes = FX_KEYS.map((key) => {
      const m = fxMeta(key);
      if (m === undefined) throw new Error(key);
      return { key, page: m.page, x0: m.x, y0: m.y, x1: m.x + m.w * m.cols, y1: m.y + m.h * Math.ceil(m.n / m.cols) };
    }).sort((a, b) => a.page - b.page || a.y0 - b.y0);
    const clashes: string[] = [];
    for (let i = 0; i < boxes.length; i++) {
      const a = boxes[i];
      if (a === undefined) continue;
      for (let j = i + 1; j < boxes.length; j++) {
        const b = boxes[j];
        if (b === undefined || b.page !== a.page || b.y0 >= a.y1) break;
        if (b.x0 < a.x1 && a.x0 < b.x1 && b.y0 < a.y1 && a.y0 < b.y1) clashes.push(`${a.key} × ${b.key}`);
      }
    }
    expect(clashes).toEqual([]);
  });
});

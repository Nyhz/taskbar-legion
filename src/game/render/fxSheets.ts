// Where the pages of the effects' atlas, the heroes' skins and the lit panes are. Like every PNG of the game they are inlined as data: URIs by
// the build (vite.config.ts) — the packaged desktop app cannot decode images served over tauri://.

const SHEETS = import.meta.glob<string>('../../assets/strip/fx/*.png', { query: '?url', import: 'default', eager: true });

function find(name: string): string | undefined {
  const suffix = `/${name}.png`;
  const path = Object.keys(SHEETS).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : SHEETS[path];
}

/** Page `page` of the atlas the effects are cut from (render/fxData FX_PAGES of them). */
export function fxPageUrl(page: number): string | undefined {
  return find(`fx_${page}`);
}

/** The atlas of a figure's own panes, lit (the Unmaker's mirrors), or undefined if it has none. */
export function paneSheetUrl(figure: string): string | undefined {
  return find(`panes_${figure}`);
}

/** The atlas of a hero's figure in a skin, or undefined if that hero has no such skin. */
export function skinSheetUrl(hero: string, skin: string): string | undefined {
  return find(`skin_${hero}_${skin}`);
}

// Where the effects' atlas and the heroes' skins are. Like every PNG of the game they are inlined as data: URIs by
// the build (vite.config.ts) — the packaged desktop app cannot decode images served over tauri://.

const SHEETS = import.meta.glob<string>('../../assets/strip/fx/*.png', { query: '?url', import: 'default', eager: true });

function find(name: string): string | undefined {
  const suffix = `/${name}.png`;
  const path = Object.keys(SHEETS).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : SHEETS[path];
}

/** The one atlas every effect is cut from. */
export function fxAtlasUrl(): string | undefined {
  return find('fx');
}

/** The atlas of a hero's figure in a skin, or undefined if that hero has no such skin. */
export function skinSheetUrl(hero: string, skin: string): string | undefined {
  return find(`skin_${hero}_${skin}`);
}

// Where the figures' atlases are (no Pixi here: the React idle sprite reads the heroes' too). Like every PNG of
// the game they are inlined as data: URIs by the build (vite.config.ts) — the packaged desktop app cannot decode
// images served over tauri://. The three heroes are part of the main bundle; each creature is its own small chunk,
// fetched when its world is entered (figureTextures.ts).

const HEROES = import.meta.glob<string>('../../assets/strip/figs/{knight,ranger,priest}.png', {
  query: '?url',
  import: 'default',
  eager: true,
});
const CREATURES = import.meta.glob<string>(
  ['../../assets/strip/figs/*.png', '!../../assets/strip/figs/{knight,ranger,priest}.png'],
  { query: '?url', import: 'default' },
);

function find<T>(table: Record<string, T>, key: string): T | undefined {
  const suffix = `/${key}.png`;
  const path = Object.keys(table).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : table[path];
}

/** The atlas of a hero's figure (by class key), or undefined for a class with no figure. */
export function heroSheetUrl(classKey: string): string | undefined {
  return find(HEROES, classKey);
}

/** Loads the URL of a creature's atlas, or undefined if there is no such creature. */
export function creatureSheetLoader(key: string): (() => Promise<string>) | undefined {
  return find(CREATURES, key);
}

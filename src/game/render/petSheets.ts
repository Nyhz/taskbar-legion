// Where the companions' atlases are. Like every PNG of the game they are inlined as data: URIs by the build
// (vite.config.ts); each pet is its own small chunk, fetched when that pet is chosen to go with the party.

const PETS = import.meta.glob<string>('../../assets/strip/pets/*.png', { query: '?url', import: 'default' });

/** Loads the URL of a pet's atlas, or undefined if that pet has no figure. */
export function petSheetLoader(key: string): (() => Promise<string>) | undefined {
  const suffix = `/${key}.png`;
  const path = Object.keys(PETS).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : PETS[path];
}

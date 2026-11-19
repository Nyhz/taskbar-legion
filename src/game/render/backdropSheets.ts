import type { BackdropGrade } from './stripBackdropData';

// Where the backdrop sheets are (no Pixi here: the title's reel draws them on a plain canvas too). Each sheet
// (src/assets/strip/wNN_<grade>.png) is a world's parallax layers stacked top to bottom, and its own small chunk,
// fetched when needed; like every PNG of the game it is inlined as a data: URI by the build (vite.config.ts) — the
// packaged desktop app cannot decode images served over tauri://.

const SHEETS = import.meta.glob<string>('../../assets/strip/w*_*.png', { query: '?url', import: 'default' });

/** Loads the URL of a world's backdrop sheet in a grade, or undefined if there is no such sheet. */
export function backdropSheetLoader(key: string, grade: BackdropGrade): (() => Promise<string>) | undefined {
  const suffix = `/${key}_${grade}.png`;
  const path = Object.keys(SHEETS).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : SHEETS[path];
}

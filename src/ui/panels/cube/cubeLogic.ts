import { isGem, type InvEntry, type ItemInstance } from '@/sim/items';
import { CUBE_INPUT_COUNT } from '@/sim/cube';

// What may be loaded into the Cube and how the "fill" keys choose — the rules of the old Cube panel, kept as
// they were. Pure (no React, no store): unit-tested.

export type CubeMode = 'synthesize' | 'melt' | 'transfigure';
export const CUBE_MODES: readonly CubeMode[] = ['synthesize', 'melt', 'transfigure'];

/** Both pieces (T0–8) and gems (T1–8) stop synthesising at tier 8. */
export const isSynthable = (e: InvEntry): boolean => e.tier < 8;

const kindOf = (e: InvEntry): 'gem' | 'item' => (isGem(e) ? 'gem' : 'item');

/** One batch is one KIND (pieces or gems) of one rarity: may `e` join what is loaded (its first entry)? */
export function sameBatch(first: InvEntry | undefined, e: InvEntry): boolean {
  return first === undefined || (e.tier === first.tier && kindOf(e) === kindOf(first));
}

/** Synthesis: click an entry of the pool — out if it was loaded; in if it fits the batch and there is room. */
export function toggleSynth(selected: readonly string[], pool: readonly InvEntry[], e: InvEntry): string[] {
  if (selected.includes(e.id)) return selected.filter((id) => id !== e.id);
  const first = pool.find((p) => p.id === selected[0]);
  if (!sameBatch(first, e) || selected.length >= CUBE_INPUT_COUNT) return [...selected];
  return [...selected, e.id];
}

/** Synthesis "fill": nine of the kind + rarity there is most of, in pool order (the bag comes first in the
 *  pool, so it is drained before the stash). Null when no group reaches nine. */
export function fillSynth(pool: readonly InvEntry[]): string[] | null {
  const groups = new Map<string, string[]>();
  for (const e of pool) {
    const key = `${kindOf(e)}${e.tier}`;
    const list = groups.get(key) ?? [];
    list.push(e.id);
    groups.set(key, list);
  }
  let best: string[] | null = null;
  for (const list of groups.values()) {
    if (list.length >= CUBE_INPUT_COUNT && (best === null || list.length > best.length)) best = list;
  }
  return best === null ? null : best.slice(0, CUBE_INPUT_COUNT);
}

/** Melting: click a piece — out if it was loaded, in while there is room (any rarities together). */
export function toggleMelt(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id);
  return selected.length >= CUBE_INPUT_COUNT ? [...selected] : [...selected, id];
}

/** Melting "fill": the nine pieces worth least — lowest rarity first, then lowest item level. */
export function fillMelt(items: readonly ItemInstance[]): string[] {
  return [...items]
    .sort((a, b) => a.tier - b.tier || a.ilvl - b.ilvl)
    .slice(0, CUBE_INPUT_COUNT)
    .map((i) => i.id);
}

/** One page of a list: what shows, how many pages there are, and the page clamped into range. */
export function pageOf<T>(
  list: readonly T[],
  page: number,
  perPage: number,
): { shown: T[]; pages: number; page: number } {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const at = Math.max(0, Math.min(page, pages - 1));
  return { shown: list.slice(at * perPage, (at + 1) * perPage), pages, page: at };
}

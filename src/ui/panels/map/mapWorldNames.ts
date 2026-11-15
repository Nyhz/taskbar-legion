// Art of the map's worlds. Their NAMES come from data (src/data/worlds.ts) through `worldName` in @/i18n.

/** Art stem of a world's thumbnail (`map_w07`), its night version when not reached, or its boss's door. */
export function worldArt(local: number, kind: 'day' | 'night' | 'boss'): string {
  const nn = String(Math.max(1, Math.min(10, Math.round(local)))).padStart(2, '0');
  return kind === 'boss' ? `map_boss_w${nn}` : kind === 'night' ? `map_w${nn}_off` : `map_w${nn}`;
}

import type { TextKey } from '@/i18n';

// The ten worlds' names. They are the redesign's names (docs/redesign/lab/data/wNN.json) and are not in src/data
// yet, so they live in the map's texts, keyed by the world's number within its difficulty (1–10).
const WORLD_NAME: Readonly<Record<number, TextKey>> = {
  1: 'map.world1',
  2: 'map.world2',
  3: 'map.world3',
  4: 'map.world4',
  5: 'map.world5',
  6: 'map.world6',
  7: 'map.world7',
  8: 'map.world8',
  9: 'map.world9',
  10: 'map.world10',
};

/** Text key of world `local` (1–10); an out-of-range number falls back to the first (never throws). */
export function worldNameKey(local: number): TextKey {
  return WORLD_NAME[local] ?? 'map.world1';
}

/** Art stem of a world's thumbnail (`map_w07`), its night version when not reached, or its boss's door. */
export function worldArt(local: number, kind: 'day' | 'night' | 'boss'): string {
  const nn = String(Math.max(1, Math.min(10, Math.round(local)))).padStart(2, '0');
  return kind === 'boss' ? `map_boss_w${nn}` : kind === 'night' ? `map_w${nn}_off` : `map_w${nn}`;
}

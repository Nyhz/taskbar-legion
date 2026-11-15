import file from '@/assets/strip/pets/pets.json';
import type { FigureMeta } from './figureData';

// The strip's COMPANIONS as data (no Pixi here — pure): every pet's atlas layout and clips, the same shape as a
// fighter's. Written by the asset pipeline (`sh tools/assets/run.sh export-pets` → src/assets/strip/pets/); a
// pet's `root` column and `ground` row are the point under its feet. Every pet of data/pets.ts has a figure (a
// test holds that); one that somehow had none would simply not be drawn in the strip.

interface PetFile {
  pets: Record<string, FigureMeta>;
}

const DATA = file as unknown as PetFile;

/** No atlas of a pet may be wider or taller than this, in pixels: half of the smallest texture limit a GPU the
 *  game runs on can have (8192), so a pet's sheet loads everywhere. The exporter refuses to write a larger one. */
export const PET_ATLAS_MAX = 4096;

/** A pet's atlas size in pixels: one row per clip, `cols` cells wide. */
export function petAtlasSize(meta: FigureMeta): { width: number; height: number } {
  let rows = 0;
  for (const anim of Object.values(meta.anims)) rows = Math.max(rows, anim.row + Math.ceil(anim.n / meta.cols));
  return { width: meta.w * meta.cols, height: meta.h * rows };
}

/** The pets that have a figure for the strip. */
export const PET_FIGURES: readonly string[] = Object.keys(DATA.pets);

export function petMeta(key: string): FigureMeta | undefined {
  return DATA.pets[key];
}

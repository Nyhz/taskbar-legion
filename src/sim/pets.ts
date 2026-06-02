import type { Rng } from './rng';
import { PET_KEYS, petDef } from '@/data/pets';

// Rare pet drop rolls on kills (NOT from chests — pets.ts). Owning grants the
// bonus permanently; selected pet is cosmetic. Drop chance is extremely low.

/** Roll for a pet drop from a single kill. Returns a newly-dropped (unowned) key
 *  or null. Iterates deterministically; the first matching unowned hit wins. */
export function rollPetDrop(
  source: 'enemy' | 'boss',
  ownedKeys: readonly string[],
  rng: Rng,
): string | null {
  for (const key of PET_KEYS) {
    const def = petDef(key);
    const matches = def.dropSource === 'both' || def.dropSource === source;
    if (!matches) continue;
    if (ownedKeys.includes(key)) {
      // Still consume a roll so ownership doesn't shift the RNG stream for others.
      rng.next();
      continue;
    }
    if (rng.chance(def.baseDropChance)) return key;
  }
  return null;
}

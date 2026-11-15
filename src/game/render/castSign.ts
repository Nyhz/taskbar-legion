import { tryAbilityDef } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { ULTIMATES } from '@/data/ultimates';
import { abilityArtStem, ultimateArtStem } from '@/ui/abilityArt';

// Which pixel sign rises over a hero when it casts (no Pixi here — pure, unit-tested). The signs are the
// interface's own (ui/abilityArt names the art stem of each ability and ultimate), so the strip and the
// panels show the same picture for the same ability. Total: any key the simulation can put in a 'cast'
// event — a hero ability, an ultimate, a trigger's marker, a boss special, a key from an old save — gets a
// stem or `null` (nothing is drawn); it never throws.

function isUltimate(key: string): boolean {
  return Object.values(ULTIMATES).some((u) => u.key === key);
}

function isHeroAbility(key: string): boolean {
  return CLASS_KEYS.some((c) => key.startsWith(`${c}_`)) && tryAbilityDef(key) !== undefined;
}

/** Art stem (src/assets/ui) of the sign of a cast, or null when the cast has none: enemies and bosses have
 *  no signs, and an unknown key shows nothing rather than another ability's picture. */
export function castSignStem(abilityKey: string): string | null {
  if (isUltimate(abilityKey)) return ultimateArtStem(abilityKey);
  if (isHeroAbility(abilityKey)) return abilityArtStem(abilityKey);
  return null;
}

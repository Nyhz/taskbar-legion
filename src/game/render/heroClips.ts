// Which animation of a hero's figure plays for what the simulation says the hero did (no Pixi here — pure,
// unit-tested). The clips are the ones the redesign drew for each class; the abilities are today's
// (data/abilities.ts). An ability with no clip of its own falls back to the class's `otherwise` clip.

export const ATTACK_CLIP = 'attack';
export const HURT_CLIP = 'hurt';
export const BLOCK_CLIP = 'block';

interface ClassClips {
  /** Ability key → clip. */
  abilities: Readonly<Record<string, string>>;
  /** Any other ability of the class. */
  otherwise: string;
}

const CLASS_CLIPS: Readonly<Record<string, ClassClips>> = {
  knight: {
    abilities: {
      knight_debilitate: 'cleave', // Debilitating Cleave
      knight_guard: BLOCK_CLIP, // Stone Skin
      knight_bulwark: BLOCK_CLIP, // Bulwark
      knight_laststand: BLOCK_CLIP, // Last Stand (ultimate): he braces behind the shield
      knight_battlecry: 'shout', // Battle Cry
      knight_bloodlust: 'shout', // Bloodlust: a roar that whips him up, not a blow
      knight_holdtheline: 'shout', // Hold the Line: he rallies the party
    },
    otherwise: ATTACK_CLIP,
  },
  ranger: {
    abilities: {
      ranger_multishot: 'volley', // Raining Arrows
      ranger_fast_fire: 'quick', // Rapid Fire
    },
    otherwise: ATTACK_CLIP, // Aimed Shot, Explosive Arrow, Caltrops, Mark of the Hunter
  },
  priest: {
    abilities: {},
    otherwise: 'cast', // every heal, buff, shield and Holy Nova; her basic attack is `attack`
  },
};

/** The clip a hero plays for an ability (cast or landing a hit with it); `attack` for an unknown class. */
export function heroAbilityClip(classKey: string, abilityKey: string): string {
  const clips = CLASS_CLIPS[classKey];
  if (clips === undefined) return ATTACK_CLIP;
  return clips.abilities[abilityKey] ?? clips.otherwise;
}

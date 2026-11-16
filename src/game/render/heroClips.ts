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
      knight_guard: 'harden', // Stone Skin: he sets himself square as the stone takes him
      knight_bulwark: 'plant', // Bulwark: the shield driven into the ground ahead of him
      knight_laststand: 'plant', // Last Stand (ultimate): he plants himself and will not fall
      knight_battlecry: 'shout', // Battle Cry
      knight_bloodlust: 'roar', // Bloodlust: arms back, head up — rage, not a rallying cry
      knight_holdtheline: 'plant', // Hold the Line: where his shield goes down, the line is
      knight_riposte: 'riposte', // Riposte: a thrust straight off the parry
    },
    otherwise: ATTACK_CLIP,
  },
  ranger: {
    abilities: {
      ranger_multishot: 'volley', // Raining Arrows
      ranger_fast_fire: 'haste', // Rapid Fire: a fistful of arrows out of the quiver and down to the string
      ranger_aimedshot: 'aimed', // Aimed Shot: feet set wide, the bow brought down onto the mark, the longest hold
      ranger_weakspot: 'quick', // Weak Spot: a snap shot at the opening
      ranger_tarflask: 'lob', // Tar Flask: thrown overhand, high and long
      ranger_frozentrap: 'sow', // Caltrops: sown underhand in one low sweep
      ranger_mark: 'point', // Mark of the Hunter: his arm levelled at the quarry
    },
    otherwise: ATTACK_CLIP, // Explosive Arrow
  },
  priest: {
    abilities: {
      priest_mend: 'mend', // Mend: she tends — the lantern held out low to the hurt one, her head bowed over it
      priest_holyshield: 'ward', // Holy Shield: the open book thrust out at arm's length, like a hand raised to halt
      priest_nova: 'nova', // Holy Nova: the staff lifted over her head in both hands and driven into the ground
      priest_smite: 'smite', // Smite: the staff brought over and down at the enemy like a gavel
      priest_healing_light: 'infuse', // Healing Light: read out of the book held high, then given with a sweep of the arm
      priest_enrage: 'exalt', // Battle Enrage (ultimate): a step forward, the staff thrown up ahead of the party like a standard
    },
    otherwise: 'cast', // Sanctuary, Circle of Healing: up on her toes, the lantern raised over everyone (her basic attacks are `attack`, `attack2`, `attack3`)
  },
};

/** The clip a hero plays for an ability (cast or landing a hit with it); `attack` for an unknown class. */
export function heroAbilityClip(classKey: string, abilityKey: string): string {
  const clips = CLASS_CLIPS[classKey];
  if (clips === undefined) return ATTACK_CLIP;
  return clips.abilities[abilityKey] ?? clips.otherwise;
}

/** The basic-attack clips a figure has: `attack` and whatever variants were drawn for it (`attack2`, `attack3`…),
 *  in that order. Never empty for a figure that can attack. */
export function attackClips(anims: Readonly<Record<string, unknown>>): string[] {
  const out = anims[ATTACK_CLIP] === undefined ? [] : [ATTACK_CLIP];
  for (let n = 2; anims[`${ATTACK_CLIP}${n}`] !== undefined; n++) out.push(`${ATTACK_CLIP}${n}`);
  return out;
}

/** Which basic-attack clip plays next: any of them but the one just played, chosen by `roll` (0 ≤ roll < 1) —
 *  so the swings vary and never repeat back to back. With one clip there is nothing to choose. */
export function pickAttackClip(clips: readonly string[], last: string | undefined, roll: number): string {
  const others = clips.filter((c) => c !== last);
  const pool = others.length > 0 ? others : clips;
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor(roll * pool.length)));
  return pool[i] ?? ATTACK_CLIP;
}

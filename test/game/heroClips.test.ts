import { describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { figureMeta } from '@/game/render/figureData';
import { ATTACK_CLIP, BLOCK_CLIP, HURT_CLIP, heroAbilityClip } from '@/game/render/heroClips';

describe('heroAbilityClip', () => {
  it('maps the Knight\'s abilities to his clips', () => {
    expect(heroAbilityClip('knight', 'knight_debilitate')).toBe('cleave');
    expect(heroAbilityClip('knight', 'knight_guard')).toBe('harden');
    expect(heroAbilityClip('knight', 'knight_bulwark')).toBe('plant');
    expect(heroAbilityClip('knight', 'knight_battlecry')).toBe('shout');
    expect(heroAbilityClip('knight', 'knight_bloodlust')).toBe('roar');
    expect(heroAbilityClip('knight', 'knight_holdtheline')).toBe('plant');
    expect(heroAbilityClip('knight', 'knight_riposte')).toBe('riposte');
    expect(heroAbilityClip('knight', 'knight_laststand')).toBe('plant');
  });

  it('maps the Ranger\'s abilities to her clips, attack for the rest', () => {
    expect(heroAbilityClip('ranger', 'ranger_multishot')).toBe('volley');
    expect(heroAbilityClip('ranger', 'ranger_fast_fire')).toBe('haste');
    expect(heroAbilityClip('ranger', 'ranger_weakspot')).toBe('quick');
    expect(heroAbilityClip('ranger', 'ranger_tarflask')).toBe('lob');
    expect(heroAbilityClip('ranger', 'ranger_frozentrap')).toBe('sow');
    expect(heroAbilityClip('ranger', 'ranger_aimedshot')).toBe('aimed');
    expect(heroAbilityClip('ranger', 'ranger_mark')).toBe('point');
    expect(heroAbilityClip('ranger', 'ranger_focus')).toBe('attack');
  });

  it('gives the Priest a gesture of her own for each spell: a heal, a shield, a nova, a smite and the ultimate are not one move', () => {
    const clips = {
      priest_mend: 'mend', priest_holyshield: 'ward', priest_nova: 'nova', priest_smite: 'smite', priest_powerinfusion: 'infuse',
      priest_enrage: 'exalt', priest_sanctuary: 'cast',
    };
    for (const [key, clip] of Object.entries(clips)) expect(heroAbilityClip('priest', key), key).toBe(clip);
    expect(new Set(Object.values(clips)).size).toBe(Object.keys(clips).length);
  });

  it('falls back to the basic attack for an unknown class or a renamed ability', () => {
    expect(heroAbilityClip('mage', 'mage_fireball')).toBe(ATTACK_CLIP);
    expect(heroAbilityClip('knight', 'knight_from_an_old_save')).toBe(ATTACK_CLIP);
  });

  it('only names clips the class\'s figure really has, for every ability in the data', () => {
    for (const classKey of CLASS_KEYS) {
      const anims = figureMeta(classKey)?.anims ?? {};
      expect(anims[ATTACK_CLIP]).toBeDefined();
      expect(anims[HURT_CLIP]).toBeDefined();
      for (const key of Object.keys(ABILITIES).filter((k) => k.startsWith(`${classKey}_`))) {
        const clip = heroAbilityClip(classKey, key);
        expect(anims[clip], `${key} → ${clip}`).toBeDefined();
      }
    }
    expect(figureMeta('knight')?.anims[BLOCK_CLIP]).toBeDefined();
  });
});

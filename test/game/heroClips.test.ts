import { describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { figureMeta } from '@/game/render/figureData';
import { ATTACK_CLIP, BLOCK_CLIP, HURT_CLIP, heroAbilityClip } from '@/game/render/heroClips';

describe('heroAbilityClip', () => {
  it('maps the Knight\'s abilities to his clips', () => {
    expect(heroAbilityClip('knight', 'knight_debilitate')).toBe('cleave');
    expect(heroAbilityClip('knight', 'knight_guard')).toBe('block');
    expect(heroAbilityClip('knight', 'knight_bulwark')).toBe('block');
    expect(heroAbilityClip('knight', 'knight_battlecry')).toBe('shout');
    expect(heroAbilityClip('knight', 'knight_bloodlust')).toBe('shout');
    expect(heroAbilityClip('knight', 'knight_holdtheline')).toBe('shout');
    expect(heroAbilityClip('knight', 'knight_riposte')).toBe('cleave');
  });

  it('maps the Ranger\'s abilities to her clips, attack for the rest', () => {
    expect(heroAbilityClip('ranger', 'ranger_multishot')).toBe('volley');
    expect(heroAbilityClip('ranger', 'ranger_fast_fire')).toBe('quick');
    expect(heroAbilityClip('ranger', 'ranger_weakspot')).toBe('quick');
    expect(heroAbilityClip('ranger', 'ranger_tarflask')).toBe('volley');
    for (const key of ['ranger_aimedshot', 'ranger_focus', 'ranger_frozentrap', 'ranger_mark']) {
      expect(heroAbilityClip('ranger', key)).toBe('attack');
    }
  });

  it('has the Priest cast every ability', () => {
    for (const key of ['priest_mend', 'priest_powerinfusion', 'priest_holyshield', 'priest_nova', 'priest_enrage', 'priest_sanctuary', 'priest_smite']) {
      expect(heroAbilityClip('priest', key)).toBe('cast');
    }
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

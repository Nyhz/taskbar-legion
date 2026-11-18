import { describe, expect, it } from 'vitest';
import { allowed, ambienceOf, limitsOf, pickTake } from '@/audio/soundRules';
import { DEFAULT_SOUND_PREFS, parseSoundPrefs } from '@/audio/soundPrefs';
import { castSound, deathSound, hitSound } from '@/game/stripSounds';
import type { Combatant } from '@/sim/world';
import manifest from '@/assets/audio/manifest.json';

describe('sound rules', () => {
  it('plays the sounds of every blow unless they are switched off', () => {
    expect(allowed('hit', 'combat', true)).toBe(true);
    expect(allowed('hit', 'combat', false)).toBe(false);
    expect(allowed('ab_priest_mend', 'ability', false)).toBe(false);
  });

  it('always plays the big moments and the interface', () => {
    expect(allowed('level_up', 'progress', false)).toBe(true);
    expect(allowed('boss_down', 'boss', false)).toBe(true);
    expect(allowed('ui_click', 'interface', false)).toBe(true);
    expect(allowed('hero_down', 'combat', false)).toBe(true);
  });

  it('never repeats the take just played when there are others', () => {
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickTake(3, 1, r)).not.toBe(1);
      expect(pickTake(3, 1, r)).toBeLessThan(3);
    }
    expect(pickTake(1, 0, 0.7)).toBe(0);
  });

  it('keeps combat sounds sparse', () => {
    expect(limitsOf('combat').voices).toBeLessThanOrEqual(3);
    expect(limitsOf('combat').gapMs).toBeGreaterThan(0);
  });

  it("plays each world's ambience, and its Torment version in Torment", () => {
    expect(ambienceOf(1)).toBe('amb_w1');
    expect(ambienceOf(10)).toBe('amb_w1');
    expect(ambienceOf(11)).toBe('amb_w2');
    expect(ambienceOf(195)).toBe('amb_w10');
    expect(ambienceOf(401)).toBe('amb_w1_torment');
    expect(ambienceOf(500)).toBe('amb_w10_torment');
  });
});

describe('sound settings', () => {
  it('fall back to the quiet defaults on anything broken', () => {
    expect(parseSoundPrefs(null)).toEqual(DEFAULT_SOUND_PREFS);
    expect(parseSoundPrefs({ sfx: 7, combat: 'loud', muted: 'yes' })).toEqual({ ...DEFAULT_SOUND_PREFS, sfx: 1 });
    expect(DEFAULT_SOUND_PREFS.combat).toBe(true);
    expect(parseSoundPrefs({ combat: 'attention' }).combat).toBe(true); // an older build's setting
    expect(parseSoundPrefs({ combat: 'off' }).combat).toBe(false);
  });
});

describe('strip sounds', () => {
  const hero = { id: 'h', side: 'hero', maxHp: 100, alive: true } as unknown as Combatant;
  const foe = (extra: Partial<Combatant>): Combatant => ({ id: 'e', side: 'enemy', maxHp: 50, alive: true, ...extra }) as unknown as Combatant;

  it('name the cast of an ability, an ultimate and a foe', () => {
    expect(castSound('priest_mend', true)).toBe('ab_priest_mend');
    expect(castSound('knight_laststand', true)).toBe('ult_knight_laststand');
    expect(castSound('enemy_smash_tremor', false)).toBe('enemy_smash');
    expect(castSound('boss_roots', false)).toBe('boss_roots');
  });

  it('name a blow and a death', () => {
    expect(hitSound({ type: 'damage', targetId: 'h', amount: 40 }, hero)).toBe('hero_hurt');
    expect(hitSound({ type: 'damage', targetId: 'e', amount: 5, crit: true }, foe({}))).toBe('crit_hit');
    expect(hitSound({ type: 'damage', targetId: 'h', amount: 5, blocked: true }, hero)).toBe('block');
    expect(deathSound(foe({ isElite: true }))).toBe('elite_die');
    expect(deathSound(foe({ isBoss: true }))).toBe('boss_down');
    expect(deathSound(hero)).toBe('hero_down');
  });

  it('only ask for sounds the manifest has, once the catalogue is complete', () => {
    const ids = new Set(Object.keys(manifest));
    for (const id of ['hit', 'crit_hit', 'enemy_die', 'knight_swing', 'ranger_shot', 'ui_click', 'amb_w1']) expect(ids.has(id)).toBe(true);
  });
});

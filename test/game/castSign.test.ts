import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { TALENT_TREES } from '@/data/talents';
import { ULTIMATES, ultimateTriggers } from '@/data/ultimates';
import { castSignStem } from '@/game/render/castSign';
import { castFx } from '@/game/render/fx';
import { figureMeta } from '@/game/render/figureData';
import { heroAbilityClip } from '@/game/render/heroClips';

const UI_ART = join(__dirname, '../../src/assets/ui');

/** Every `marker` string anywhere inside a piece of data (a trigger can sit in an ability, a talent node's
 *  patch or an ultimate): these are the keys a 'cast' event can carry besides ability keys. */
function markersIn(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) markersIn(v, out);
  else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'marker' && typeof v === 'string') out.add(v);
      else markersIn(v, out);
    }
  }
  return out;
}

const heroAbilityKeys = Object.keys(ABILITIES).filter((k) => CLASS_KEYS.some((c) => k.startsWith(`${c}_`)));
const ultimateKeys = Object.values(ULTIMATES).map((u) => u.key);
const markerKeys = [...markersIn([ABILITIES, TALENT_TREES, Object.values(ULTIMATES).map((u) => ultimateTriggers(u))])];
/** Everything the simulation can put in a 'cast' event today, plus keys it cannot (an old save, a typo). */
const everyCastKey = [...Object.keys(ABILITIES), ...ultimateKeys, ...markerKeys, 'knight_from_an_old_save', 'not_a_key', ''];

describe('castSignStem', () => {
  it('gives every hero ability and ultimate a sign whose art exists', () => {
    expect(heroAbilityKeys.length).toBeGreaterThanOrEqual(21);
    for (const key of [...heroAbilityKeys, ...ultimateKeys]) {
      const stem = castSignStem(key);
      expect(stem, key).not.toBeNull();
      expect(existsSync(join(UI_ART, `${stem}.png`)), `${key} → ${stem}.png`).toBe(true);
    }
  });

  it('gives the six branch abilities a sign', () => {
    for (const key of ['knight_holdtheline', 'knight_riposte', 'ranger_weakspot', 'ranger_tarflask', 'priest_sanctuary', 'priest_smite']) {
      expect(ABILITIES[key], key).toBeDefined();
      expect(castSignStem(key), key).not.toBeNull();
    }
  });

  it('shows nothing for enemies, bosses and keys the data does not know', () => {
    const enemyKeys = Object.keys(ABILITIES).filter((k) => !heroAbilityKeys.includes(k));
    expect(enemyKeys.length).toBeGreaterThan(0);
    for (const key of [...enemyKeys, 'knight_from_an_old_save', 'not_a_key', '']) expect(castSignStem(key), key).toBeNull();
  });
});

describe('a cast event of any key', () => {
  it('never throws in the strip\'s lookups, and every trigger marker is drawable', () => {
    expect(markerKeys).toContain('ranger_mark');
    for (const key of everyCastKey) {
      expect(() => castFx(key), key).not.toThrow();
      expect(typeof castFx(key).color).toBe('number');
    }
  });

  it('plays a clip the caster\'s figure really has, whatever the key', () => {
    for (const classKey of CLASS_KEYS) {
      const anims = figureMeta(classKey)?.anims ?? {};
      for (const key of everyCastKey) {
        const clip = heroAbilityClip(classKey, key);
        expect(anims[clip], `${classKey} casting ${key} → ${clip}`).toBeDefined();
      }
    }
  });
});

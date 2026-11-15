import { afterEach, describe, expect, it } from 'vitest';
import { getLanguage, setLanguage } from '@/i18n';
import { supportFacts, traitFacts, allTraits } from '@/sim/foeFacts';
import { SUPPORT_AURA_KEYS } from '@/data/enemies';
import { auraLine, kindName, supportLine, traitLine } from '@/ui/panels/map/foeWords';

// The words of the map's difficulty tooltip (enemy traits, the support's auras), in both languages, with the
// data's numbers. (The effect chips' tooltip: test/ui/effectTipWords.test.ts.)

const start = getLanguage();
afterEach(() => setLanguage(start));

describe('enemy traits and auras in words', () => {
  it('every trait has a line of its own in English and in Spanish, with its numbers', () => {
    for (const lang of ['en', 'es'] as const) {
      setLanguage(lang);
      const lines = traitFacts(4).map(traitLine);
      expect(lines).toHaveLength(allTraits().length);
      expect(new Set(lines).size).toBe(lines.length);
      for (const line of lines) expect(line).not.toMatch(/[{}]|undefined|NaN/);
    }
    setLanguage('en');
    const en = Object.fromEntries(traitFacts(4).map((f) => [f.trait, traitLine(f)]));
    expect(en['rage']).toBe('Rage: attacks 40 % faster under 50 % life.');
    expect(en['charge']).toBe('Charge: its first blow hits ×2.');
    expect(en['tremor']).toBe('Tremor: its area blow slows heroes 20 % for 2.5 s.');
    setLanguage('es');
    const es = Object.fromEntries(traitFacts(4).map((f) => [f.trait, traitLine(f)]));
    expect(es['charge']).toBe('Embestida: su primer golpe pega ×2.');
    expect(es['tremor']).toBe('Temblor: su golpe en área ralentiza a los héroes un 20 % durante 2,5 s.');
    expect(kindName('beast')).toBe('Bestia');
    expect(kindName('support')).toBe('Apoyo');
  });

  it("every aura has a line with the difficulty's number; the support line says how many it carries", () => {
    setLanguage('es');
    const torment = supportFacts(4);
    const lines = torment.values.map((v) => auraLine(v.key, v.value));
    expect(lines).toEqual([
      'Aguante: recibe un 25 % menos de daño',
      'Furia: ataca un 25 % más rápido',
      'Vigor: regenera un 3 % de vida por segundo',
      'Égida: entra con un escudo del 25 %',
      'Saña: hace un 20 % más de daño',
    ]);
    expect(auraLine('vigor', supportFacts(2).values.find((v) => v.key === 'vigor')?.value ?? 0)).toBe('Vigor: regenera un 2,5 % de vida por segundo');
    expect(supportLine(supportFacts(0))).toBe('Su oleada tiene 1 de estas auras, al azar, hasta que muere:');
    expect(supportLine(supportFacts(2))).toBe('Su oleada tiene 3 de estas auras, al azar, hasta que muere:');
    expect(supportLine(torment)).toBe('Su oleada tiene las 5 auras hasta que muere:');
    setLanguage('en');
    expect(SUPPORT_AURA_KEYS.map((k) => auraLine(k, 20).split(':')[0])).toEqual(['Toughness', 'Fury', 'Vigor', 'Aegis', 'Malice']);
    expect(supportLine(supportFacts(1))).toBe('Its wave has 2 of these auras, at random, until it dies:');
  });
});

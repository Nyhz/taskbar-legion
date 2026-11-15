import { afterEach, describe, expect, it } from 'vitest';
import { fillTokens, getLanguage, isLang, setLanguage, subscribeLanguage, systemLanguage, t } from '@/i18n/core';
import { chestName, dataText, difficultyName, statLabel, techDescription, tierName } from '@/i18n/names';

const initial = getLanguage();

afterEach(() => setLanguage(initial));

describe('language core', () => {
  it('starts in a valid language without a browser', () => {
    expect(isLang(initial)).toBe(true);
    expect(isLang(systemLanguage())).toBe(true);
  });

  it('t() follows the language and fills tokens', () => {
    setLanguage('en');
    expect(t('options.language')).toBe('Language');
    expect(t('options.exportFailed', { message: 'disk full' })).toBe('Export failed: disk full');
    setLanguage('es');
    expect(t('options.language')).toBe('Idioma');
    expect(t('options.exportFailed', { message: 'disk full' })).toBe('No se ha podido exportar: disk full');
  });

  it('leaves an unknown token as written', () => {
    expect(fillTokens('{a} of {b}', { a: 3 })).toBe('3 of {b}');
  });

  it('tells subscribers once per real change', () => {
    setLanguage('en');
    let calls = 0;
    const stop = subscribeLanguage(() => {
      calls += 1;
    });
    setLanguage('en');
    setLanguage('es');
    setLanguage('es');
    stop();
    setLanguage('en');
    expect(calls).toBe(1);
  });
});

describe('names of data things', () => {
  it('are English as data wrote them, Spanish from the dictionaries', () => {
    setLanguage('en');
    expect(statLabel('attackDamage')).toBe('Attack Damage');
    expect(tierName(3)).toBe('Epic');
    expect(difficultyName('hell')).toBe('Hell');
    expect(chestName('stageBoss')).toBe('Stage-boss chest');
    setLanguage('es');
    expect(statLabel('attackDamage')).toBe('Daño de ataque');
    expect(tierName(3)).toBe('Épico');
    expect(difficultyName('hell')).toBe('Infierno');
    expect(techDescription('eco_gold')).toBe('+2,5 % de oro por baja');
    expect(chestName('stageBoss')).toBe('Cofre de jefe de etapa');
  });

  it('fall back to the English when a text has no translation', () => {
    setLanguage('es');
    expect(dataText('stats', 'not-a-stat', 'Something New')).toBe('Something New');
  });
});

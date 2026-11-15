import { afterEach, describe, expect, it } from 'vitest';
import { getLanguage, setLanguage } from '@/i18n';
import { EFFECTS } from '@/data/effects';
import { BOSS_EFFECTS } from '@/data/bossEffects';
import { effectLines, effectTipEntries, hasOwnLine } from '@/ui/overlay/effectTipWords';

// The tooltip of an effect chip (ui/overlay/StripEffectTip): every effect that can show as a chip says what it
// does, in English and in Spanish, with the fighter's own numbers.

const start = getLanguage();
afterEach(() => setLanguage(start));

/** The effects that can show as a chip: timed, and not an absorb shield (that is a slice of the life bar). */
const VISIBLE = Object.values(EFFECTS).filter((d) => d.durationMs > 0 && d.kind.type !== 'shield').map((d) => d.key);

/** Effects that are allowed to show their name alone, and why. Keep it empty: a new effect belongs in
 *  effectTipWords (OWN_LINES, or a line for its kind) with its texts in i18n `hud.fx…`, EN + ES. */
const NAME_ONLY: Readonly<Record<string, string>> = {};

describe('every visible effect has a line', () => {
  it('lists the effects that would show their name alone — none', () => {
    const missing = VISIBLE.filter((key) => effectLines(key).length === 0 && NAME_ONLY[key] === undefined);
    expect(missing, 'effects with no tooltip line: word them in src/ui/overlay/effectTipWords.ts (+ i18n hud.fx…, EN and ES)').toEqual([]);
    for (const key of Object.keys(NAME_ONLY)) expect(VISIBLE, `${key} is excused but no longer exists`).toContain(key);
  });

  it("what a boss's kit lays has a sentence of its OWN (where it came from, whether Purify lifts it), not just its kind's", () => {
    const generic = Object.keys(BOSS_EFFECTS).filter((key) => VISIBLE.includes(key) && !hasOwnLine(key) && NAME_ONLY[key] === undefined);
    expect(generic, 'boss effects without their own line: add them to OWN_LINES in src/ui/overlay/effectTipWords.ts (+ i18n hud.fx…, EN and ES)').toEqual([]);
  });

  it('the lines are whole in both languages: no hole, no stray token', () => {
    for (const lang of ['en', 'es'] as const) {
      setLanguage(lang);
      for (const key of VISIBLE) {
        for (const line of effectLines(key)) {
          expect(line, `${lang} ${key}`).not.toMatch(/[{}]|undefined|NaN/);
          expect(line.length, `${lang} ${key}: ${line}`).toBeLessThanOrEqual(150);
        }
      }
    }
  });

  it('an effect nobody has worded shows its name alone, and nothing breaks', () => {
    expect(effectTipEntries([{ key: 'not_an_effect' }])).toEqual([{ name: 'not_an_effect', lines: [] }]);
  });
});

describe('what the lines say', () => {
  it('Tremor: why the hero is slow, and that Purify leaves it alone', () => {
    setLanguage('en');
    expect(effectTipEntries([{ key: 'debuff_tremor', value: -20, stacks: 1, totalMs: 2500 }])).toEqual([
      { name: 'Tremor', lines: ["A brute's blow shook the ground: attacks 20 % slower for a moment. Purify leaves it alone."] },
    ]);
    setLanguage('es');
    const [entry] = effectTipEntries([{ key: 'debuff_tremor' }]);
    expect(entry?.name).toBe('Temblor');
    expect(entry?.lines[0]).toBe('El golpe de un bruto ha sacudido el suelo: ataca un 20 % más lento un momento. Purificar no lo quita.');
  });

  it('a buff of two stats is ONE entry and one sentence, with the numbers it has on the hero (its rank), not the base ones', () => {
    setLanguage('en');
    const cry = effectTipEntries([
      { key: 'buff_battlecry_ad', value: 23, stacks: 1, totalMs: 8000 },
      { key: 'buff_battlecry_crit', value: 7, stacks: 1, totalMs: 8000 },
    ]);
    expect(cry).toEqual([{ name: 'Battle Cry', lines: ['Attack Damage +23 % and Crit Chance +7 % for 8 s.'] }]);
    setLanguage('es');
    const es = effectTipEntries([{ key: 'buff_fast_fire', value: 45, stacks: 1, totalMs: 8000 }]);
    expect(es[0]?.lines).toEqual(['Velocidad de ataque +45 % durante 8 s.']);
    // A slow is a stat going down.
    expect(effectTipEntries([{ key: 'debuff_cripple' }])[0]?.lines).toEqual(['Velocidad de ataque −20 % durante 6 s.']);
  });

  it('damage and healing over time give what they do per second, stacks counted', () => {
    setLanguage('en');
    expect(effectTipEntries([{ key: 'fx_dot', value: 40, stacks: 1, totalMs: 5000 }])[0]?.lines).toEqual(['Takes 40 damage a second for 5 s.']);
    expect(effectTipEntries([{ key: 'fx_hot', value: 12.5, stacks: 1, totalMs: 4000 }])[0]?.lines).toEqual(['Heals 13 life a second for 4 s.']);
    expect(effectTipEntries([{ key: 'debuff_venom', value: 30, stacks: 3, totalMs: 4000 }])[0]?.lines).toEqual([
      "Venom from the boss's hits: 90 damage a second, up to 5 layers; it fades 4 s after the last hit. Purify removes it.",
    ]);
    setLanguage('es');
    expect(effectTipEntries([{ key: 'debuff_spores', value: 8, stacks: 2, totalMs: 20000 }])[0]?.lines).toEqual([
      'Esporas de las nubes del jefe: 16 de daño por segundo, hasta 5 capas. Cualquier cura directa, o Purificar, las limpia.',
    ]);
  });

  it('what a boss lays on a hero says whether Purify lifts it', () => {
    setLanguage('es');
    const line = (key: string, value?: number): string => effectTipEntries([{ key, ...(value === undefined ? {} : { value }) }])[0]?.lines[0] ?? '';
    expect(line('debuff_mortal_wound')).toBe('El golpe de un jefe ha dejado una herida profunda: las curas que recibe rinden un 25 % menos durante 8 s. Purificar la quita.');
    expect(line('debuff_rooted')).toBe('Raíces que atan: sin ataques ni habilidades durante 5 s. Purificar las arranca al instante.');
    expect(line('debuff_guilt', 2.5)).toBe('Carga con la culpa: pierde un 2,5 % de su vida por cada 1 % que pierde el jefe, durante 8 s. Purificar la quita.');
    expect(line('debuff_gilded')).toBe('Las recargas de sus habilidades se detienen durante 6 s. Purificar lo quita.');
  });

  it('marks, weakenings and what lasts the whole fight', () => {
    setLanguage('en');
    const line = (key: string, value?: number, stacks?: number): string =>
      effectTipEntries([{ key, ...(value === undefined ? {} : { value }), ...(stacks === undefined ? {} : { stacks }) }])[0]?.lines.join(' | ') ?? '';
    expect(line('fx_mark', 20)).toBe('Marked: takes 20 % more damage from everyone until it dies.');
    expect(line('debuff_weakspot', 9)).toBe('Takes 9 % more damage for 6 s.');
    expect(line('debuff_weaken')).toBe('Deals 15 % less damage for 6 s.');
    expect(line('fx_invuln')).toBe('Takes no damage for 6 s.');
    expect(line('buff_boss_frenzy', 5, 4)).toBe('Attack speed +20 % and growing (stacks: 4).');
    expect(line('buff_boss_tremor')).toBe('The ground shakes under it: its area blow comes every 6 s.');
    expect(line('buff_boss_shell', 123456)).toBe('While the shell holds, the boss takes less from every hit. 123K damage left to break it.');
    // Two effects of one name and different kinds: one entry, a line each (Vengeance weakens and slows).
    const vengeance = effectTipEntries([{ key: 'debuff_vengeance_weaken' }, { key: 'debuff_vengeance_slow' }]);
    expect(vengeance).toEqual([{ name: 'Vengeance', lines: ['Attack Speed −30 % for 6 s.', 'Deals 30 % less damage for 6 s.'] }]);
  });
});

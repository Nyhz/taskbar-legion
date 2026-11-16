import { describe, it, expect, afterEach } from 'vitest';
import { bossMarks } from '@/ui/hud/bossMarks';
import { BOSS_AFFIX, BOSS_AFFIX_KEYS, MECHANIC, WORLD_BOSS_MECHANIC } from '@/data/bossKit';
import { effectDef } from '@/data/effects';
import { globalStageOf } from '@/data/difficulties';
import { setLanguage } from '@/i18n';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The marks after the boss's name on the HUD (ui/hud/bossMarks.ts): one per affix and mechanic, each with a sign
// that exists and a tooltip whose numbers are the data's.

afterEach(() => setLanguage('en'));

const art = (stem: string): boolean => existsSync(resolve(__dirname, '../../src/assets/ui', `${stem}.png`));

describe('boss marks', () => {
  it('every affix and every mechanic has a sign, a name and a line, in English and in Spanish', () => {
    for (const lang of ['en', 'es'] as const) {
      setLanguage(lang);
      const affixes = bossMarks({ affixes: BOSS_AFFIX_KEYS, bossRank: 'stage' }, 150);
      expect(affixes.map((m) => m.key)).toEqual([...BOSS_AFFIX_KEYS]);
      const mechanics = Object.keys(MECHANIC).flatMap((key) => bossMarks({ affixes: [], mechanic: key, bossRank: 'world' }, 10));
      expect(mechanics).toHaveLength(new Set(Object.values(WORLD_BOSS_MECHANIC)).size);
      for (const m of [...affixes, ...mechanics]) {
        expect(art(m.sign), m.sign).toBe(true);
        expect(m.name.length).toBeGreaterThan(2);
        expect(m.help).not.toMatch(/[{}]/); // every token filled
      }
    }
    setLanguage('es');
    expect(bossMarks({ affixes: BOSS_AFFIX_KEYS }, 150).map((m) => m.name)).toEqual(['Acorazado', 'Vampírico', 'Frenético', 'Sísmico', 'Venenoso', 'Certero', 'Herida mortal']);
  });

  it('the mechanic comes first, then the affixes; unknown keys are left out', () => {
    const marks = bossMarks({ affixes: ['venomous', 'nope'], mechanic: 'roots', bossRank: 'world' }, globalStageOf(4, 2, 10));
    expect(marks.map((m) => `${m.kind}:${m.key}`)).toEqual(['mechanic:roots', 'affix:venomous']);
    expect(bossMarks({ affixes: [] }, 5)).toEqual([]);
    expect(bossMarks({}, 5)).toEqual([]);
  });

  it('the numbers are the data\'s, at the stage\'s difficulty and the boss\'s rank', () => {
    const help = (boss: Parameters<typeof bossMarks>[0], S: number): string => bossMarks(boss, S)[0]?.help ?? '';
    expect(help({ affixes: ['vampiric'], bossRank: 'stage' }, 150)).toContain('3 %');
    expect(help({ affixes: ['mortalWound'], bossRank: 'stage' }, 150)).toContain('150 % of its hit');
    expect(help({ affixes: ['mortalWound'], bossRank: 'world' }, 250)).toContain('250 % of its hit');
    expect(help({ mechanic: 'guilt' }, 40)).toContain('loses 1.5 % of their own'); // Normal
    expect(help({ mechanic: 'guilt' }, 140)).toContain('loses 1.75 % of their own'); // Hell
    expect(help({ mechanic: 'guilt' }, 440)).toContain('loses 2.5 % of their own'); // Torment
    expect(help({ mechanic: 'undertow' }, 60)).toContain('breaks off');
    expect(help({ mechanic: 'spores' }, 70)).toContain('0.2 % of their life per second for each layer, up to 5 layers');
    expect(help({ mechanic: 'redBlade' }, 180)).toContain('burns for 6 s, dealing each 80 % of its hit');
    expect(help({ mechanic: 'scales' }, 190)).toContain('Every 15 s');
    expect(help({ mechanic: 'mirror' }, 100)).toContain('at 25 % of its strength');
    expect(help({ mechanic: 'mirror' }, 500)).toContain('at 45 % of its strength');
    // Espejos has three parts — the reflection, the six mirrors, the dark reflection — one short line each, and
    // a counter of the mirrors lit beside its sign.
    const mirrors = (S: number, stacks?: number) => bossMarks({ mechanic: 'mirror', effects: stacks === undefined ? [] : [{ defKey: 'buff_mirror_panes', stacks, remainingMs: 1000 }] }, S)[0];
    expect(mirrors(100)?.more).toEqual([
      'Each reflection lights a mirror (+5 % damage). With all 6 lit it breaks them over the party: 120 % of its hit.',
      'One mirror in 2 lets out a dark reflection of that hero (8 s).',
    ]);
    expect(mirrors(500)?.more?.[0]).toContain('(+10 % damage)');
    expect(mirrors(500)?.more?.[0]).toContain('220 % of its hit');
    expect(mirrors(100)?.count).toBe('0/6');
    expect(mirrors(100, 4)?.count).toBe('4/6');
    expect(bossMarks({ mechanic: 'flock' }, 10)[0]?.count).toBeUndefined();
    expect(help({ mechanic: 'gildedSilence' }, 150)).toContain('stand still for 6 s');
    expect(help({ mechanic: 'undertow' }, 60)).toContain('50 % of its hit');
    expect(help({ affixes: ['frenzied'] }, 150)).toContain(`up to ${effectDef(BOSS_AFFIX.frenzied.effectKey).maxStacks} times`);
    expect(effectDef(BOSS_AFFIX.frenzied.effectKey).maxStacks).toBe(BOSS_AFFIX.frenzied.maxStacks);
    expect(help({ mechanic: 'flock' }, 10)).toContain('2 crows'); // Normal
    expect(help({ mechanic: 'flock' }, 410)).toContain('4 crows'); // Torment
    expect(help({ mechanic: 'roots' }, 20)).toContain('Every 18 s');
    expect(help({ mechanic: 'roots' }, 120)).toContain('Every 15 s');
    expect(help({ mechanic: 'chainBolt' }, 130)).toContain('50 %');
  });

  it('a world boss that wields the Crushing Blow says what to brace for, under what it hits with (round 7)', () => {
    const S = globalStageOf(3, 5, 10);
    const marks = bossMarks({ magicShare: 0.6, crushHit: 1000, bossRank: 'world' }, S);
    expect(marks[0]?.key).toBe('damage');
    expect(marks[0]?.more?.[0]).toContain('Every 24 s it winds up its Charged Strike (2 s)');
    expect(marks[0]?.more?.[0]).toContain('150 %'); // Eternal: 1.5 × an average Knight's life
    expect(marks[0]?.more?.[0]).toContain('54 %'); // the shock: 0.45 × 0.6 / 0.5
    expect(bossMarks({ magicShare: 0.6 }, S)[0]?.more).toBeUndefined(); // a stage boss: no such blow
    setLanguage('es');
    expect(bossMarks({ magicShare: 0.6, crushHit: 1000 }, S)[0]?.more?.[0]).toContain('Golpe cargado');
  });
});

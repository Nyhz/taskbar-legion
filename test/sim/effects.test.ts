import { describe, it, expect } from 'vitest';
import {
  applyEffect,
  tickEffectDurations,
  effectStatMods,
  isSilenced,
} from '@/sim/effects';
import { aggregate } from '@/sim/stats';
import { effectDef, type ActiveEffect, type EffectDef } from '@/data/effects';

describe('effects', () => {
  it('Fuego Rápido raises attack speed +50% for 8s, then reverts', () => {
    const effects: ActiveEffect[] = [];
    applyEffect(effects, effectDef('buff_fast_fire'), 'ranger', 50);
    const buffed = aggregate({ attackSpeed: 1.0 }, effectStatMods(effects));
    expect(buffed.attackSpeed).toBeCloseTo(1.5, 5);

    tickEffectDurations(effects, 7900);
    expect(effectStatMods(effects).length).toBe(1); // still active at 7.9s
    tickEffectDurations(effects, 200); // total 8.1s > 8s
    expect(effects.length).toBe(0);
    expect(aggregate({ attackSpeed: 1.0 }, effectStatMods(effects)).attackSpeed).toBe(1.0);
  });

  it('silence is detected (blocks casts)', () => {
    const effects: ActiveEffect[] = [];
    expect(isSilenced(effects)).toBe(false);
    applyEffect(effects, effectDef('debuff_silence'), 'enemy', 0);
    expect(isSilenced(effects)).toBe(true);
  });

  it('refresh stack rule keeps a single entry and resets duration', () => {
    const effects: ActiveEffect[] = [];
    applyEffect(effects, effectDef('buff_fast_fire'), 'a', 50);
    tickEffectDurations(effects, 4000);
    applyEffect(effects, effectDef('buff_fast_fire'), 'a', 50);
    expect(effects.length).toBe(1);
    expect(effects[0]?.remainingMs).toBe(effectDef('buff_fast_fire').durationMs);
  });

  it('independent stack rule stacks up to maxStacks', () => {
    const effects: ActiveEffect[] = [];
    for (let i = 0; i < 7; i++) applyEffect(effects, effectDef('debuff_expose'), 'r', -20);
    const exposes = effects.filter((e) => e.defKey === 'debuff_expose');
    expect(exposes.length).toBe(effectDef('debuff_expose').maxStacks); // capped at 5
    // total stat mod = sum across entries
    const mods = effectStatMods(effects).filter((m) => m.key === 'armor');
    expect(mods.length).toBe(5);
  });

  it('extend stack rule accumulates duration', () => {
    const def: EffectDef = {
      key: 'test_extend', name: 'T', icon: 't',
      kind: { type: 'tag', tag: 't' }, durationMs: 1000, maxStacks: 1, stackRule: 'extend', beneficial: true,
    };
    const effects: ActiveEffect[] = [];
    applyEffect(effects, def, 'x', 0);
    applyEffect(effects, def, 'x', 0);
    expect(effects.length).toBe(1);
    expect(effects[0]?.remainingMs).toBe(2000);
  });
});

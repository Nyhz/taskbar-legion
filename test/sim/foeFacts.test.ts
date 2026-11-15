import { describe, it, expect } from 'vitest';
import { SUPPORT_AURA_COUNT, SUPPORT_AURA_KEYS, TRAIT_TUNING, auraValue } from '@/data/enemies';
import { effectDef } from '@/data/effects';
import { allTraits, supportFacts, traitFacts } from '@/sim/foeFacts';

// The facts the map's difficulty tooltip words (ui/panels/map/MapFoes): read from data/enemies.ts, never typed twice.

describe('what the enemies of a difficulty do', () => {
  it('Normal has no traits; each difficulty keeps the ones before it and Eternal and Torment have them all', () => {
    expect(traitFacts(0)).toEqual([]);
    const names = (d: number): string[] => traitFacts(d).map((f) => `${f.role}.${f.trait}`);
    expect(names(1)).toEqual(['beast.rage', 'soldier.guard']);
    expect(names(2)).toEqual(['beast.rage', 'beast.charge', 'soldier.guard', 'soldier.lastBreath', 'shooter.chargedShot', 'brute.unstoppable']);
    expect(names(3)).toEqual(['beast.rage', 'beast.charge', 'soldier.guard', 'soldier.lastBreath', 'shooter.chargedShot', 'shooter.focusFire', 'brute.unstoppable', 'brute.tremor']);
    expect(names(4)).toEqual(names(3));
    expect(new Set(traitFacts(4).map((f) => f.trait))).toEqual(new Set(allTraits()));
  });

  it('carries the numbers of the data', () => {
    const of = (trait: string) => traitFacts(4).find((f) => f.trait === trait);
    expect(of('rage')).toMatchObject({ pct: TRAIT_TUNING.rage.attackSpeedPct, hp: 50 });
    expect(of('charge')).toMatchObject({ mult: TRAIT_TUNING.charge.mult });
    expect(of('lastBreath')).toMatchObject({ pct: TRAIT_TUNING.lastBreath.attackSpeedPct, seconds: 3 });
    expect(of('chargedShot')).toMatchObject({ every: TRAIT_TUNING.chargedShot.every, mult: TRAIT_TUNING.chargedShot.mult });
    const slow = effectDef(TRAIT_TUNING.tremor.effect);
    expect(of('tremor')).toMatchObject({ pct: 20, seconds: slow.durationMs / 1000 });
  });

  it("the support's auras: how many, from which world, and each one's strength there", () => {
    for (let d = 0; d < 5; d++) {
      const facts = supportFacts(d);
      expect(facts.auras).toBe(SUPPORT_AURA_COUNT[d]);
      expect(facts.values.map((v) => v.key)).toEqual([...SUPPORT_AURA_KEYS]);
      for (const { key, value } of facts.values) expect(value).toBe(auraValue(key, d));
      expect(facts.fromWorld).toBe(d === 0 ? 3 : undefined); // Normal: from its third world; later, from the first
    }
  });
});

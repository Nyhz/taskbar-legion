import { describe, it, expect } from 'vitest';
import { castReadyAbilities, tickVolleys } from '@/sim/abilities';
import { abilityDef } from '@/data/abilities';
import { RANGE } from '@/data/field';
import type { Combatant, CombatEvent } from '@/sim/world';
import { anyMoment, base, quietRng, unit } from './_kit';

// An ability that lands in WAVES (data/abilities `volleys`; 2026-11-19, user: Raining Arrows in three waves of a
// third each): its effects resolve on the cast and then every `everyMs`, each wave on whoever stands in the wave then.

const multishot = anyMoment(abilityDef('ranger_multishot'));
const ranger = (): Combatant =>
  unit({ id: 'r', side: 'hero', classKey: 'ranger', x: 0, range: 160, shotReach: 340, baseStats: base({ attackDamage: 100, critChance: 0 }), abilities: [{ def: multishot, rank: 1 }] });
const foe = (id: string, x: number): Combatant =>
  unit({ id, side: 'enemy', hp: 1e6, maxHp: 1e6, x, range: RANGE.melee + 5, moveSpeed: 0, enemyDamage: 0, enemyAttackSpeed: 1, engaged: true });
const lost = (e: Combatant): number => e.maxHp - e.hp;

describe('an ability that lands in waves', () => {
  it('Raining Arrows: three waves, a third of the old single volley each, every 450 ms', () => {
    expect(multishot.volleys).toEqual({ count: 3, everyMs: 450 });
    const r = ranger();
    const wave = [foe('a', 120), foe('b', 140), foe('c', 160)];
    const events: CombatEvent[] = [];
    expect(castReadyAbilities(r, [r], wave, 30, quietRng(), events)).toEqual(['ranger_multishot']);
    const first = lost(wave[0] as Combatant);
    expect(first).toBeGreaterThan(0);
    expect(r.volleys).toHaveLength(1);

    tickVolleys(r, [r], wave, 30, quietRng(), events, 449);
    expect(lost(wave[0] as Combatant)).toBe(first); // not yet
    tickVolleys(r, [r], wave, 30, quietRng(), events, 1);
    expect(lost(wave[0] as Combatant)).toBeCloseTo(first * 2, 6);
    tickVolleys(r, [r], wave, 30, quietRng(), events, 450);
    for (const e of wave) expect(lost(e)).toBeCloseTo(first * 3, 6);
    expect(r.volleys).toHaveLength(0);
    // One cue per later wave, for the strip to show it.
    expect(events.filter((e) => e.type === 'cue' && e.cue === 'volley')).toHaveLength(2);
    // The three together are what the single volley dealt (1.2× attack at rank 1, before the target's armour).
    const single = { ...multishot, volleys: undefined, power: { ...multishot.power, coeff: 1.2, coeffPerRank: 0.4 } };
    const r2 = unit({ ...ranger(), abilities: [{ def: single as typeof multishot, rank: 1 }] });
    const lone = foe('z', 120);
    castReadyAbilities(r2, [r2], [lone, foe('y', 130), foe('x', 140)], 30, quietRng(), []);
    expect(first * 3).toBeCloseTo(lost(lone), 6);
  });

  it('a later wave lands on whoever is in the wave then, and none after its caster falls', () => {
    const r = ranger();
    const wave = [foe('a', 120), foe('b', 140), foe('c', 160)];
    castReadyAbilities(r, [r], wave, 30, quietRng(), []);
    const late = foe('late', 180); // came up after the cast
    wave.push(late);
    tickVolleys(r, [r], wave, 30, quietRng(), [], 450);
    expect(lost(late)).toBeGreaterThan(0);
    const before = lost(late);
    r.alive = false;
    tickVolleys(r, [r], wave, 30, quietRng(), [], 450);
    expect(lost(late)).toBe(before);
    expect(r.volleys).toEqual([]);
  });
});

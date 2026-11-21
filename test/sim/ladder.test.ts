// The wall ladder (round 22, 2026-11-21; user: «debería ser tan sencillo como que el primer boss tenga 100 de vida, el
// segundo 120, luego 140… e ir escalando cada vez más … asegurando que el equipamiento que se tira en esa zona cumple
// los requisitos para matar al boss sin unas horas exageradas»). Two halves:
//   · here — every world boss has strictly MORE LIFE than the one before, seams included, and from Inferno on (the
//     fitted curve) no world adds more than WALL_STEP_MAX over the one before;
//   · `npm run probe` — the gear that drops in a zone kills its boss in reasonable hours.
// It replaces round 13's rule, which held each wall's life as a % of a FIXED reference party in the zone's realistic
// ceiling strictly rising: that ceiling blends T7 → T8 straight across Torment, so its damage grows ×2.6 over Torment
// 1–5 and the rule asked walls to leap there although the players do not (test/sim/probe/referenceAsk stays as a
// report: `scripts/reference-ladder.ts`).
import { describe, expect, it } from 'vitest';
import { zoneBossHp } from '@/data/stageScaling';

const NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment'];
const label = (w: number): string => `${NAMES[Math.floor((w - 1) / 10)] ?? '?'} ${((w - 1) % 10) + 1}`;
const life = (w: number): number => zoneBossHp(w * 10);
/** The largest world-to-world rise of a wall's life on the fitted curve (Inferno 1 → Torment 10). */
const WALL_STEP_MAX = 1.4;

describe('the wall ladder (world boss life)', () => {
  it('every world boss has more life than the one before, seams included', () => {
    const dips: string[] = [];
    for (let w = 2; w <= 50; w++) if (!(life(w) > life(w - 1))) dips.push(`${label(w)} ${life(w)} ≤ ${label(w - 1)} ${life(w - 1)}`);
    expect(dips).toEqual([]);
  });

  it(`from Inferno on, no wall rises more than ×${WALL_STEP_MAX} over the one before`, () => {
    const leaps: string[] = [];
    for (let w = 22; w <= 50; w++) {
      const step = life(w) / life(w - 1);
      if (step > WALL_STEP_MAX) leaps.push(`${label(w)} ×${step.toFixed(2)}`);
    }
    expect(leaps).toEqual([]);
  });
});

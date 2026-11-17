// The wall ladder (round 13, 2026-11-17; user: «grupo de referencia fijo»): every one of the 50 walls asks STRICTLY more
// of the fixed reference party (test/sim/probe/referenceAsk) than the wall before it, across the difficulty seams too.
// The asks are recorded (test/sim/probe/referenceAskTable.ts, rewritten by `RL_WRITE=1 npx vite-node
// scripts/reference-ladder.ts`) because measuring all 50 takes minutes; one wall is re-measured here so a change to the
// walls or to hero power that leaves the table stale fails.
import { describe, expect, it } from 'vitest';
import { REFERENCE_ASK } from './probe/referenceAskTable';
import { referenceAsk } from './probe/referenceAsk';

const NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment'];
const label = (w: number): string => `${NAMES[Math.floor((w - 1) / 10)] ?? '?'} ${((w - 1) % 10) + 1}`;

describe('the wall ladder (fixed reference party)', () => {
  it('records all 50 walls', () => {
    expect(REFERENCE_ASK).toHaveLength(50);
  });

  it('every wall asks strictly more than the one before, seams included', () => {
    const dips: string[] = [];
    for (let w = 2; w <= 50; w++) {
      const prev = REFERENCE_ASK[w - 2] ?? Number.POSITIVE_INFINITY;
      const ask = REFERENCE_ASK[w - 1] ?? Number.NEGATIVE_INFINITY;
      if (!(ask > prev)) dips.push(`${label(w)} ${ask} ≤ ${label(w - 1)} ${prev}`);
    }
    expect(dips).toEqual([]);
  });

  it('the recorded table is current (Normal 10 re-measured)', () => {
    const recorded = REFERENCE_ASK[9] ?? 0;
    expect(referenceAsk(100)).toBeCloseTo(recorded, 1);
  }, 60_000);
});

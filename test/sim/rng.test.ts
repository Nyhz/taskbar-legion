import { describe, it, expect } from 'vitest';
import { makeRng, makeRngFromState } from '@/sim/rng';

describe('rng (mulberry32)', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0,1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('restores from serialized state mid-stream', () => {
    const r = makeRng(99);
    for (let i = 0; i < 10; i++) r.next();
    const state = r.state();
    const expectedNext = r.next();
    const restored = makeRngFromState(state);
    expect(restored.next()).toBe(expectedNext);
  });
});

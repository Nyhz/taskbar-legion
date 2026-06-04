import { describe, it, expect } from 'vitest';
import { makeRng, makeRngFromState, makeRng64, deriveSeed64 } from '@/sim/rng';

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

describe('rng (splitmix64 loot layer)', () => {
  it('makeRng64 is deterministic for the same seed and stays in [0,1)', () => {
    const a = makeRng64(0xdeadbeefn);
    const b = makeRng64(0xdeadbeefn);
    const seqA = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(seqA);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('deriveSeed64 is stable per (base,index) and scatters consecutive indices', () => {
    expect(deriveSeed64(123, 5)).toBe(deriveSeed64(123, 5)); // reproducible
    // Consecutive indices must not produce near-identical seeds (no linear correlation).
    const seeds = Array.from({ length: 64 }, (_, i) => deriveSeed64(123, i));
    expect(new Set(seeds.map(String)).size).toBe(seeds.length); // all distinct
  });

  it('a different base seed yields a different stream', () => {
    expect(deriveSeed64(1, 0)).not.toBe(deriveSeed64(2, 0));
  });
});

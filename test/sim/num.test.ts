import { describe, it, expect } from 'vitest';
import { format, round2, add, mul, pow } from '@/sim/num';

describe('num formatter', () => {
  it('formats small numbers plainly', () => {
    expect(format(0)).toBe('0');
    expect(format(42)).toBe('42');
    expect(format(999)).toBe('999');
  });

  it('uses named suffixes', () => {
    expect(format(1240)).toBe('1.24K');
    expect(format(3_400_000)).toBe('3.40M');
    expect(format(9_100_000_000)).toBe('9.10B');
    expect(format(2.7e12)).toBe('2.70T');
  });

  it('falls back to scientific beyond named suffixes', () => {
    expect(format(1.2e45)).toMatch(/^1\.20e45$/);
  });

  it('handles infinity and negatives', () => {
    expect(format(Infinity)).toBe('∞');
    expect(format(-2000)).toBe('-2.00K');
  });

  it('round2 stabilizes floats', () => {
    expect(round2(1.23456)).toBe(1.23);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('arithmetic seam is plain math (v1)', () => {
    expect(add(2, 3)).toBe(5);
    expect(mul(2, 3)).toBe(6);
    expect(pow(2, 10)).toBe(1024);
  });
});

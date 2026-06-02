// The ONLY randomness source in the sim (SPEC §1 golden rule #2). mulberry32 is a
// fast, seedable PRNG with a single 32-bit state word, so it serializes into the
// save and restores byte-for-byte. NEVER use Math.random()/Date.now() in sim/.

export interface Rng {
  next(): number; // [0,1)
  int(maxExclusive: number): number; // [0, max)
  range(min: number, max: number): number; // [min, max)
  chance(p: number): boolean; // true with probability p
  pick<T>(items: readonly T[]): T;
  state(): number; // serializable current state
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    range: (min, max) => min + next() * (max - min),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    state: () => s >>> 0,
  };
  return rng;
}

/** Restore an Rng from a previously-serialized state word. */
export function makeRngFromState(state: number): Rng {
  return makeRng(state);
}

/** Derive a stable child seed from a base seed + a salt (for sub-streams). */
export function deriveSeed(base: number, salt: number): number {
  let h = (base ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

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

// ── 64-bit (BigInt) layer for LOOT derivation ─────────────────────────────────
// Combat stays on the fast 32-bit mulberry32 above (hot path, called every tick). Loot
// opening is a COLD path — a handful of draws per chest — so it can afford BigInt for a
// wider, higher-quality stream: splitmix64 (64-bit state, period 2^64, strong avalanche).
// Used by the counter-based loot derivation in sim/chests.ts.

const SM64_GAMMA = 0x9e3779b97f4a7c15n;
const SM64_MASK = 0xffffffffffffffffn;

/** splitmix64 finaliser — strong 64-bit avalanche mix of one state word. */
function smMix(z0: bigint): bigint {
  let z = z0 & SM64_MASK;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & SM64_MASK;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & SM64_MASK;
  return (z ^ (z >> 31n)) & SM64_MASK;
}

/** Derive a stable 64-bit loot seed from a base seed + a monotonic draw index. Hash the
 *  base, fold in the index, mix again — so consecutive indices scatter (no linear
 *  correlation) and the Nth-ever draw is directly reproducible without replaying a stream. */
export function deriveSeed64(base: number, index: number): bigint {
  const baseHash = smMix(BigInt(base >>> 0));
  return smMix((baseHash + BigInt(index)) & SM64_MASK);
}

/** A 64-bit-state splitmix64 PRNG exposing the same Rng interface as mulberry32. Its state
 *  is NOT serialized (loot derives a fresh one per chest from a persisted counter), so
 *  state() returns a best-effort low word for interface parity only. */
export function makeRng64(seed: bigint): Rng {
  let s = seed & SM64_MASK;
  const next = (): number => {
    s = (s + SM64_GAMMA) & SM64_MASK;
    const z = smMix(s);
    return Number(z >> 11n) / 2 ** 53; // top 53 bits → [0,1)
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
    state: () => Number(s & 0xffffffffn) >>> 0,
  };
  return rng;
}

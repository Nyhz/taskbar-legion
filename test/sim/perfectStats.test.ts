import { describe, it, expect } from 'vitest';
import { composeItem, rollStatValue, perfectStatValue, type ItemOrigin } from '@/sim/loot';
import { transfigureRoll } from '@/sim/cube';
import { makeRng } from '@/sim/rng';
import { itemPerfectCount, hasPerfect, type ItemInstance } from '@/sim/items';
import { tierDef, type ItemTier } from '@/data/tiers';
import { PERFECT_STAT_BONUS } from '@/data/lootTables';
import { TRANSFIGURE_PERFECT_CHANCE } from '@/data/cube';

const origin = (rollSeed: number, S = 60): ItemOrigin => ({
  rollSeed,
  stageIndex: S,
  chestType: 'normal',
  generatorVersion: 1,
});

// Build a knight item with a fixed perfect chance (0 ⇒ never, 1 ⇒ all substats perfect).
function knightItem(tier: ItemTier, seed: number, perfectChance: number): ItemInstance {
  return composeItem('helmet', tier, origin(seed), makeRng(seed), undefined, undefined, undefined, perfectChance);
}

describe('perfectStatValue', () => {
  it('is the highest normal roll lifted by PERFECT_STAT_BONUS (flat + percent)', () => {
    const mult = tierDef(8).statMultiplier;
    const ilvl = 60;
    // An rng pinned to the TOP of every band ⇒ rollStatValue returns the normal ceiling.
    const maxRng = { ...makeRng(1), range: (_min: number, max: number): number => max };
    for (const key of ['health', 'attackDamage', 'critChance', 'critDamage'] as const) {
      const perfect = perfectStatValue(key, mult, ilvl);
      const ceil = rollStatValue(key, mult, ilvl, maxRng);
      expect(perfect).toBeCloseTo(ceil * (1 + PERFECT_STAT_BONUS), 1);
      expect(perfect).toBeGreaterThan(ceil); // strictly above the normal max
    }
  });

  it('is deterministic (no rng) — same inputs ⇒ same value', () => {
    expect(perfectStatValue('health', 2.3, 45)).toBe(perfectStatValue('health', 2.3, 45));
  });
});

describe('perfect-stat generation pass', () => {
  it('chance 0 ⇒ no perfect stats', () => {
    for (let seed = 0; seed < 200; seed++) {
      const it = knightItem(8, seed, 0);
      expect(hasPerfect(it)).toBe(false);
      expect(it.stats.every((s) => s.perfect === undefined)).toBe(true);
    }
  });

  it('chance 1 ⇒ every inherent substat is perfect (and only substats)', () => {
    const it = knightItem(8, 7, 1);
    expect(it.stats.length).toBe(tierDef(8).extraStats); // 4
    expect(itemPerfectCount(it)).toBe(it.stats.length);
    for (const s of it.stats) {
      expect(s.perfect).toBe(true);
      expect(s.value).toBe(perfectStatValue(s.key, tierDef(8).statMultiplier, it.ilvl));
    }
    // The base affix is NEVER perfect.
    expect(it.baseAffix.every((b) => b.perfect === undefined)).toBe(true);
  });

  it('perfect count never exceeds the number of substats (T4=2, T8=4)', () => {
    for (const tier of [4, 8] as const) {
      for (let seed = 0; seed < 100; seed++) {
        const it = knightItem(tier, seed, 1);
        expect(itemPerfectCount(it)).toBeLessThanOrEqual(tierDef(tier).extraStats);
      }
    }
  });

  it('T0 has no substats ⇒ can never be perfect even at chance 1', () => {
    const it = knightItem(0, 3, 1);
    expect(it.stats.length).toBe(0);
    expect(hasPerfect(it)).toBe(false);
  });

  it('is deterministic — same origin + chance ⇒ identical item', () => {
    expect(knightItem(7, 42, 0.5)).toEqual(knightItem(7, 42, 0.5));
  });

  it('a perfect substat outvalues any normal roll of the same key/ilvl/tier', () => {
    const it = knightItem(8, 7, 1);
    const mult = tierDef(8).statMultiplier;
    for (const s of it.stats) {
      // 50 normal rolls of the same key — the perfect value beats them all.
      for (let r = 0; r < 50; r++) {
        expect(s.value).toBeGreaterThan(rollStatValue(s.key, mult, it.ilvl, makeRng(r)) - 1e-9);
      }
    }
  });
});

describe('transfigure perfect roll', () => {
  it('a transfigured affix can come out perfect, and when it does it uses perfectStatValue', () => {
    // Scan seeds until we hit a transfigure that rolls perfect; assert its value + flag.
    let sawPerfect = false;
    let sawNormal = false;
    for (let seed = 0; seed < 400 && !(sawPerfect && sawNormal); seed++) {
      const item = knightItem(8, seed, 0); // no generation-time perfects to muddy the check
      const rolled = transfigureRoll(item, 0);
      if (rolled === null) continue;
      const mult = tierDef(8).statMultiplier;
      if (rolled.perfect === true) {
        sawPerfect = true;
        expect(rolled.value).toBe(perfectStatValue(rolled.key, mult, item.ilvl));
      } else {
        sawNormal = true;
        // A normal transfigure value is always below the perfect ceiling for that key.
        expect(rolled.value).toBeLessThan(perfectStatValue(rolled.key, mult, item.ilvl));
      }
    }
    expect(sawPerfect).toBe(true); // 15% over 400 seeds — overwhelmingly likely
    expect(sawNormal).toBe(true);
  });

  it('TRANSFIGURE_PERFECT_CHANCE is a sane probability', () => {
    expect(TRANSFIGURE_PERFECT_CHANCE).toBeGreaterThan(0);
    expect(TRANSFIGURE_PERFECT_CHANCE).toBeLessThan(1);
  });
});

describe('synth lifts the perfect rate', () => {
  it('synthesized items are perfect more often than base-rate items (over many seeds)', () => {
    // Compare the per-roll chance via the generation pass directly: base 5% vs synth 10%.
    const countPerfect = (chance: number): number => {
      let n = 0;
      for (let seed = 0; seed < 3000; seed++) if (hasPerfect(knightItem(5, seed, chance))) n++;
      return n;
    };
    expect(countPerfect(0.1)).toBeGreaterThan(countPerfect(0.05));
  });
});

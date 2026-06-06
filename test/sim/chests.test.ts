import { describe, it, expect } from 'vitest';
import { openChest, openAll, tryAccrueChest } from '@/sim/chests';
import { rollTier } from '@/sim/loot';
import { getBonuses } from '@/sim/bonuses';
import { createWorld } from '@/sim/Simulation';
import { makeRng } from '@/sim/rng';
import { worldBossStageOf } from '@/data/difficulties';
import { godHero } from './_helpers';

const bonuses = getBonuses({}, []);

function meanTier(type: 'normal' | 'stageBoss' | 'zoneBoss', S: number, n: number): number {
  const rng = makeRng(123);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const r = openChest(type, S, rng, bonuses);
    for (const item of r.items) {
      sum += item.tier;
      count++;
    }
  }
  return sum / count;
}

describe('chests', () => {
  it('item tier is independent of chest type (only gem CHANCE differs)', () => {
    // DIFFICULTY.md §4: every chest type rolls items from the SAME per-difficulty table;
    // chest type only changes the gem chance (×1/×2/×4), never the item tier. So mean item
    // tier is ~equal across types (the differing gem roll only perturbs the rng stream).
    const normal = meanTier('normal', 60, 1500);
    const stage = meanTier('stageBoss', 60, 1500);
    const zone = meanTier('zoneBoss', 60, 1500);
    expect(Math.abs(stage - normal)).toBeLessThan(0.05);
    expect(Math.abs(zone - normal)).toBeLessThan(0.05);
  });

  it('gem tier distribution matches the ITEM tier table per difficulty (T0 folds into T1)', () => {
    // A gem's tier rolls off the SAME per-difficulty tierWeights as gear. Gems can't be T0
    // (GemTier 1–8), so the item table's T0 share folds into T1; every tier T≥2 must match the
    // item rate. Histogram many gems vs many gear pieces at a Hell stage (155 = Hell 6-5).
    const S = 155;
    const N = 60000;
    const gemH = Array(9).fill(0) as number[];
    const itemH = Array(9).fill(0) as number[];
    const rng = makeRng(31);
    for (let i = 0; i < N; i++) {
      const g = Math.max(1, rollTier(S, rng, 0)); // gem: full table, T0→T1
      gemH[g] = (gemH[g] ?? 0) + 1;
      const it = rollTier(S, rng, 0); // a standard (armor/weapon) item: full table
      itemH[it] = (itemH[it] ?? 0) + 1;
    }
    expect(gemH[0]).toBe(0); // never a T0 gem
    // T≥2 rates match within sampling noise; T1 (gem) ≈ item T0 + T1 (the fold).
    for (let t = 2; t <= 5; t++) {
      expect(Math.abs((gemH[t] ?? 0) - (itemH[t] ?? 0)) / N).toBeLessThan(0.01);
    }
    expect(Math.abs((gemH[1] ?? 0) - ((itemH[0] ?? 0) + (itemH[1] ?? 0))) / N).toBeLessThan(0.01);
  });

  it('world-boss keys drop ONLY from stage-boss chests, credited to the zone (~50%)', () => {
    const S = 135; // Hell 4-5 → its zone's world boss is Hell 4-10 (global 140)
    const bossStage = worldBossStageOf(S);
    expect(bossStage).toBe(140);

    const keyRate = (type: 'normal' | 'stageBoss' | 'zoneBoss'): number => {
      const rng = makeRng(99);
      let keys = 0;
      for (let i = 0; i < 4000; i++) keys += openChest(type, S, rng, bonuses).keys[bossStage] ?? 0;
      return keys / 4000;
    };
    expect(keyRate('normal')).toBe(0); // only stage-boss chests carry keys
    expect(keyRate('zoneBoss')).toBe(0);
    expect(keyRate('stageBoss')).toBeGreaterThan(0.45); // ~0.5 (STAGE_KEY_DROP_CHANCE)
    expect(keyRate('stageBoss')).toBeLessThan(0.55);

    // The key is credited to the world-boss of the chest's OWN zone, never another.
    const rng = makeRng(7);
    for (let i = 0; i < 50; i++) {
      const keys = openChest('stageBoss', S, rng, bonuses).keys;
      for (const k of Object.keys(keys)) expect(Number(k)).toBe(bossStage);
    }
  });

  it('per-type storage caps stop accrual (no overflow)', () => {
    const world = createWorld(1, [godHero()]);
    world.chests = [{ type: 'normal', dropStage: 1, count: 6 }]; // at capacity (no bonus)
    const rng = makeRng(5);
    for (let i = 0; i < 5000; i++) tryAccrueChest(world, 'normal', rng, bonuses);
    expect(world.chests.find((c) => c.type === 'normal')?.count).toBe(6);
  });

  it('opening frees storage and yields exactly one gear piece per chest', () => {
    const world = createWorld(2, [godHero()]);
    world.chests = [{ type: 'normal', dropStage: 30, count: 3 }];
    const result = openAll(world, { seed: 7, n: 0 }, bonuses);
    expect(result.items.length).toBe(3); // every chest always yields its gear piece
    expect(world.chests.find((c) => c.type === 'normal')).toBeUndefined();
  });

  it('a gem is EXTRA loot — it never replaces the gear piece', () => {
    // High gem chance via a big gemDropMult → many opens roll a gem; assert the gear is
    // still always there AND that some chests yield BOTH a gear piece and a gem.
    const greedy = getBonuses({ chest_gem_1: 6, chest_gem_2: 8 }, []);
    const rng = makeRng(42);
    let sawGem = false;
    let sawBoth = false;
    for (let i = 0; i < 500; i++) {
      const r = openChest('normal', 30, rng, greedy);
      expect(r.items.length).toBe(1); // gear ALWAYS drops, regardless of the gem roll
      expect(r.gems.length).toBeLessThanOrEqual(1);
      if (r.gems.length > 0) sawGem = true;
      if (r.items.length > 0 && r.gems.length > 0) sawBoth = true;
    }
    expect(sawGem).toBe(true);
    expect(sawBoth).toBe(true); // gem + gear from the same chest is now possible
  });

  it('boss/zone chests roll the extra gem more often than normal chests', () => {
    // gemChance is normal < stageBoss < zoneBoss; over many opens the gem rate tracks it.
    const gemRate = (type: 'normal' | 'stageBoss' | 'zoneBoss'): number => {
      const rng = makeRng(99);
      let gems = 0;
      for (let i = 0; i < 4000; i++) gems += openChest(type, 30, rng, bonuses).gems.length;
      return gems / 4000;
    };
    expect(gemRate('stageBoss')).toBeGreaterThan(gemRate('normal'));
    expect(gemRate('zoneBoss')).toBeGreaterThan(gemRate('stageBoss'));
  });

  it('counter-based draw: advances n by chests opened, and (seed,n) is reproducible', () => {
    const build = (): ReturnType<typeof createWorld> => {
      const w = createWorld(1, [godHero()]);
      w.chests = [{ type: 'normal', dropStage: 30, count: 5 }];
      return w;
    };
    // The draw cursor advances by exactly the number of chests opened (5).
    const draw = { seed: 4242, n: 10 };
    const first = openAll(build(), draw, bonuses);
    expect(draw.n).toBe(15);
    expect(first.items.length).toBe(5);
    // Replaying the SAME (seed, starting n) reproduces byte-identical loot (stats/tiers).
    const replay = openAll(build(), { seed: 4242, n: 10 }, bonuses);
    expect(replay.items.map((i) => ({ tier: i.tier, ilvl: i.ilvl, slot: i.slot }))).toEqual(
      first.items.map((i) => ({ tier: i.tier, ilvl: i.ilvl, slot: i.slot })),
    );
    // A different starting index draws different loot (the stream moved on).
    const moved = openAll(build(), { seed: 4242, n: 99 }, bonuses);
    expect(moved.items.map((i) => i.ilvl)).not.toEqual(first.items.map((i) => i.ilvl));
  });

  it('openAll rolls each stack at its own DROP stage (loot tier follows the chest, not the player)', () => {
    const meanFromStack = (dropStage: number): number => {
      const world = createWorld(1, [godHero()]); // current stage 1 in BOTH cases
      world.chests = [{ type: 'normal', dropStage, count: 3000 }];
      const r = openAll(world, { seed: 7, n: 0 }, bonuses);
      const tiers = r.items.map((it) => it.tier as number);
      return tiers.reduce((a, b) => a + b, 0) / tiers.length;
    };
    // Same "current" stage, only the chest's drop stage differs → deeper drop ⇒ higher
    // tiers (the world-depth rarity curve). The per-world lift is gentle and tier unlocks
    // are pushed out (T4+ from world 12), so compare a far-apart pair (world 1 vs world 50)
    // where the depth signal clearly beats the single-seed sampling noise.
    expect(meanFromStack(491)).toBeGreaterThan(meanFromStack(3) + 0.3); // ~1.15 vs ~0.38
  });
});

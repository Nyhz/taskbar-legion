// Tier-rarity verification (run: `npx vite-node scripts/sim-rarity.ts`).
// Reads the LIVE game data (TIERS + RARITY_DEPTH_P + TIER_CHEST_FACTOR) and replays the
// rollTier weighting to confirm the in-game distribution matches the approved target.
import { TIERS } from '../src/data/tiers';
import { RARITY_DEPTH_P, TIER_CHEST_FACTOR } from '../src/data/lootTables';
import { worldFirstStage } from '../src/data/stageScaling';

function dist(world: number, chestFactor: number): number[] {
  const S = worldFirstStage(world);
  const r = Math.pow(Math.max(1, world) / 100, RARITY_DEPTH_P) * chestFactor;
  const w: number[] = [];
  let tot = 0;
  for (const d of TIERS) {
    const x = S >= d.unlockStage ? d.dropWeight * Math.pow(r, d.tier) : 0;
    w[d.tier] = x;
    tot += x;
  }
  return w.map((x) => x / tot);
}

const pct = (p: number): string => (p <= 0 ? '·' : p >= 0.001 ? (p * 100).toFixed(p < 0.1 ? 2 : 1) + '%' : (p * 100).toFixed(3) + '%');

for (const [label, cf] of [['NORMAL', TIER_CHEST_FACTOR.normal], ['STAGE-BOSS', TIER_CHEST_FACTOR.stageBoss], ['ZONE-BOSS', TIER_CHEST_FACTOR.zoneBoss]] as [string, number][]) {
  console.log(`\n=== ${label} chest (cf=${cf}, p=${RARITY_DEPTH_P}) ===`);
  console.log('world\tT0\tT1\tT2\tT3\tT4\tT5\tT6\tT7\tT8');
  for (const W of [1, 10, 12, 14, 16, 18, 20, 50, 100, 150, 200]) {
    console.log(`${W}\t` + dist(W, cf).map(pct).join('\t'));
  }
  for (const W of [100, 200]) {
    const d = dist(W, cf);
    const oneIn = (t: number): string => ((d[t] ?? 0) > 0 ? `1/${Math.round(1 / (d[t] ?? 1))}` : '—');
    console.log(`  world ${W}: T5 ${oneIn(5)}, T6 ${oneIn(6)}, T7 ${oneIn(7)}, T8 ${oneIn(8)}`);
  }
}

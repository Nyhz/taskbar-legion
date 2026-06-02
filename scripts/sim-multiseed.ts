/**
 * Multi-seed validation (run: `npx vite-node scripts/sim-multiseed.ts`).
 * One pass over {gear model × seed}, averaged to cut single-seed RNG noise. For the GOOD
 * model it also records reach-times for the TIMELINE (sanity-check ~1-year W100); across
 * models it shows the GEAR GRADIENT (do tiers matter now that their multipliers are wider).
 * Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';
import { worldOf } from '../src/data/stageScaling';

const SEEDS = [7, 1, 2024];
const STALL_TICKS = 24 * 3600 * 10; // 24 sim-hours no advance ⇒ walled
const MAX_TICKS = 12 * 1e6; // ~14 sim-days budget per run

function fmtT(s: number): string {
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

function play(seed: number, maxEquipTier: number): { world: number; reach: Map<number, number> } {
  const r = new GreedyRunner({ seed, openChests: true, maxEquipTier });
  let maxStage = 1;
  let lastAdvance = 0;
  const reach = new Map<number, number>();
  for (let i = 0; i < MAX_TICKS; i++) {
    r.run(1);
    if (r.stage > maxStage) {
      maxStage = r.stage;
      lastAdvance = r.sim.world.tick;
      const w = worldOf(maxStage);
      if (!reach.has(w)) reach.set(w, r.simSeconds);
    }
    if (r.sim.world.tick - lastAdvance > STALL_TICKS) break;
  }
  return { world: worldOf(maxStage), reach };
}

console.log(`=== MULTI-SEED validation (mean of ${SEEDS.length} seeds, ${fmtT(MAX_TICKS / 10)} budget) ===\n`);
console.log('GEAR GRADIENT — mean world reached by gear quality (do tiers matter?):');
let goodRuns: ReturnType<typeof play>[] = [];
for (const [label, cap] of [['NAKED', -1], ['LOW  (T0-2)', 2], ['MID  (T0-4)', 4], ['GOOD (T0-7)', 7]] as [string, number][]) {
  const rs = SEEDS.map((s) => play(s, cap));
  if (cap === 7) goodRuns = rs;
  console.log(`  ${label}: mean ~W${mean(rs.map((r) => r.world)).toFixed(0).padStart(3)}   (seeds: ${rs.map((r) => 'W' + r.world).join(', ')})`);
}

console.log('\nTIMELINE (good gear) — mean time to reach milestone worlds:');
for (const W of [10, 20, 30, 40, 50]) {
  const ts = goodRuns.map((r) => r.reach.get(W)).filter((t): t is number => t !== undefined);
  if (ts.length === 0) { console.log(`  W${W}: (not reached in budget)`); continue; }
  console.log(`  W${W.toString().padStart(2)}: mean ${fmtT(mean(ts)).padStart(7)}  (${ts.length}/${SEEDS.length} seeds)`);
}
console.log('\n=== done ===');

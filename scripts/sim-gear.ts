/**
 * Gear-influence probe (run: `npx vite-node scripts/sim-gear.ts`).
 * Runs the same greedy under three GEAR QUALITY models (via the harness maxEquipTier cap)
 * and reports how far each gets before stalling — to see how much gear actually matters:
 *   • NAKED  — never equips anything (cap −1)
 *   • LOW    — only low tiers (cap T2): a player several tiers behind the good drops
 *   • GOOD   — up to T7 (cap 7): near-best gear, just not chasing the 1/1000 T8
 * Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';
import { worldOf, stageInWorld } from '../src/data/stageScaling';

const STALL_TICKS = 24 * 3600 * 10; // 24 sim-hours no advance ⇒ truly walled
const MAX_TICKS = 18 * 1e6; // ~21 sim-days budget per model

function fmtT(s: number): string {
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(2)}d`;
}

function run(label: string, maxEquipTier: number): void {
  const r = new GreedyRunner({ seed: 7, openChests: true, maxEquipTier });
  let maxStage = 1;
  let lastAdvance = 0;
  for (let i = 0; i < MAX_TICKS; i++) {
    r.run(1);
    if (r.stage > maxStage) { maxStage = r.stage; lastAdvance = r.sim.world.tick; }
    if (r.sim.world.tick - lastAdvance > STALL_TICKS) break; // walled
    if (worldOf(maxStage) >= 120) break; // far enough
  }
  const w = worldOf(maxStage);
  console.log(
    `${label.padEnd(6)} | walls at world ${String(w).padStart(3)} (${w}-${stageInWorld(maxStage)}) ` +
    `| ${fmtT(r.simSeconds).padStart(8)} | maxLvl ${Math.max(...r.heroLevels)} | gear: ${tierHisto(r.equippedTiers)}`,
  );
}

function tierHisto(tiers: number[]): string {
  if (tiers.length === 0) return '(naked)';
  const c = new Array(9).fill(0) as number[];
  for (const t of tiers) c[t] = (c[t] ?? 0) + 1;
  return c.map((n, t) => (n > 0 ? `T${t}×${n}` : null)).filter(Boolean).join(' ');
}

console.log('=== GEAR-INFLUENCE probe (how far does each gear quality reach?) ===\n');
console.log('model  | wall point                  | time     | level    | equipped tiers');
console.log('-------+-----------------------------+----------+----------+----------------');
run('NAKED', -1);
run('LOW', 2);
run('GOOD', 7);
console.log('\n=== done ===');

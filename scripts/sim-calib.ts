/**
 * Income & progression calibration (run: `npx vite-node scripts/sim-calib.ts`).
 * Gear is now DECOUPLED from level (no equip gate) and WAVES_PER_STAGE=20. Drives the
 * greedy and logs, per world first-reached: sim-time, cumulative XP & gold earned, and
 * the recent stage-clear time. This is the income(t)/world(t) data used to derive the new
 * level curve (cumulative XP is independent of whatever level curve we later pick).
 * Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';
import { worldOf, worldFirstStage, stageInWorld, phi, xpPerKill, goldPerKill } from '../src/data/stageScaling';

const MAX_TICKS = 35 * 1e6;
const STALL_TICKS = 12 * 3600 * 10; // 12 sim-hours no advance ⇒ stuck

function fmtT(s: number): string {
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(2)}d`;
}
function fmtN(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 1e3) return n.toFixed(0);
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`;
  if (n < 1e12) return `${(n / 1e9).toFixed(1)}B`;
  return n.toExponential(1);
}

function main(): void {
  console.log('=== Taskbar Legion — income/progression calibration (gate REMOVED, 20 waves) ===\n');
  const r = new GreedyRunner({ seed: 7, openChests: true });
  let maxStage = 1;
  let lastAdvance = 0;
  let prevWorldTime = 0;
  let prevWorldXp = 0;

  console.log('world | global |  sim-time | Δt/world | stage-clear | cumXP earned | XP/sec | cum gold | maxLvl | wipes');
  console.log('------+--------+-----------+----------+-------------+--------------+--------+----------+--------+------');

  for (let i = 0; i < MAX_TICKS; i++) {
    r.run(1);
    if (r.stage > maxStage) {
      const crossed = worldOf(r.stage) > worldOf(maxStage);
      maxStage = r.stage;
      lastAdvance = r.sim.world.tick;
      if (crossed && stageInWorld(maxStage) === 1) {
        const w = worldOf(maxStage);
        const t = r.simSeconds;
        const dT = t - prevWorldTime;
        const dXp = r.xpEarnedTotal - prevWorldXp;
        console.log(
          `${String(w).padStart(5)} | ${String(maxStage).padStart(6)} | ${fmtT(t).padStart(9)} | ${fmtT(dT).padStart(8)} | ${(dT / 10).toFixed(1).padStart(9)}s | ${fmtN(r.xpEarnedTotal).padStart(12)} | ${fmtN(dXp / Math.max(1, dT)).padStart(6)} | ${fmtN(r.goldEarnedTotal).padStart(8)} | ${String(Math.max(...r.heroLevels)).padStart(6)} | ${r.sim.world.wipes}`,
        );
        prevWorldTime = t;
        prevWorldXp = r.xpEarnedTotal;
      }
    }
    if (r.sim.world.tick - lastAdvance > STALL_TICKS) {
      console.log(`\n  STALLED at world ${worldOf(maxStage)} (global ${maxStage} = ${worldOf(maxStage)}-${stageInWorld(maxStage)}) after ${fmtT(r.simSeconds)}`);
      break;
    }
  }

  console.log(`\nFinal: world ${worldOf(r.stage)} (global ${r.stage}), maxLvl ${Math.max(...r.heroLevels)}, ${fmtT(r.simSeconds)}, wipes ${r.sim.world.wipes}`);
  console.log('\n— analytic income reference (per-stage, xpMult=1) —');
  console.log('world | global | Φ(stage) | xp/kill | ~xp/stage(110 kills) | gold/kill');
  for (const w of [1, 3, 5, 10, 15, 20]) {
    const gs = worldFirstStage(w);
    console.log(`${String(w).padStart(5)} | ${String(gs).padStart(6)} | ${fmtN(phi(gs)).padStart(8)} | ${fmtN(xpPerKill(gs)).padStart(7)} | ${fmtN(xpPerKill(gs) * 110).padStart(20)} | ${fmtN(goldPerKill(gs))}`);
  }
  console.log('\n=== done ===');
}

main();

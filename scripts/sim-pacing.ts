/**
 * Pacing oracle (run: `npx vite-node scripts/sim-pacing.ts`).
 * Drives the greedy agent and samples ACTIVE-PLAY pacing at stage milestones:
 * cumulative sim-time, hero levels, cumulative gold EARNED, the tech-frontier gold
 * cost, and the live gold/xp tech multipliers (so we can see the curve WITH bonuses
 * accumulating). This is the active-play UPPER BOUND on speed (immediate chest open,
 * always-best equip); a real idler is slower. Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';
import { TECH_NODES, nodeCost } from '../src/data/techTree';
import { totalExpToReach, expectedLevel } from '../src/data/stageScaling';

const MILESTONES = [1, 5, 10, 12, 15, 20, 30, 40, 50, 60];

function fmtTime(s: number): string {
  if (s < 90) return `${s.toFixed(0)}s`;
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

function fmtNum(n: number): string {
  if (n < 1000) return n.toFixed(0);
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`;
  if (n < 1e12) return `${(n / 1e9).toFixed(1)}B`;
  return n.toExponential(2);
}

/** Costs of every prereq-met, unbought tech node (ignoring gold) — the menu of
 *  upgrades available to the player right now. */
function availableCosts(ranks: Record<string, number>): number[] {
  const out: number[] = [];
  for (const node of TECH_NODES) {
    const rank = ranks[node.key] ?? 0;
    if (rank >= node.maxRanks) continue;
    out.push(nodeCost(node, rank));
  }
  return out;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function main(): void {
  console.log('=== Taskbar Legion — ACTIVE-PLAY pacing oracle ===');
  console.log('(greedy: opens chests immediately, always equips best, spends all gold/points)\n');

  const r = new GreedyRunner({ seed: 7, openChests: true });
  const seen = new Set<number>();

  console.log('stage |    sim-time | levels        | lvl(exp) | party | gold earned | gold× | xp×  | save-for-upgrade');
  console.log('------+-------------+---------------+----------+-------+-------------+-------+------+-----------------');

  // Step in small chunks; sample the first time we cross each milestone stage.
  // Track prev sample to derive a RECENT gold/sec income rate (for save-time).
  let prevGold = 0;
  let prevSec = 0;
  for (let i = 0; i < 4000; i++) {
    r.run(2000);
    for (const m of MILESTONES) {
      if (!seen.has(m) && r.stage >= m) {
        seen.add(m);
        const ranks = r.techRankSummary();
        const dGold = r.goldEarnedTotal - prevGold;
        const dSec = Math.max(1, r.simSeconds - prevSec);
        const goldPerSec = dGold / dSec;
        // "save-for-upgrade": real-time to farm a TYPICAL available tech node at the
        // current income rate. ~seconds = gold floods in; minutes-hours = it gates.
        const saveSec = goldPerSec > 0 ? median(availableCosts(ranks)) / goldPerSec : 0;
        prevGold = r.goldEarnedTotal;
        prevSec = r.simSeconds;
        console.log(
          `${String(m).padStart(5)} | ${fmtTime(r.simSeconds).padStart(11)} | ${r.heroLevels.join('/').padEnd(13)} | ${String(expectedLevel(m)).padStart(8)} | ${String(r.partySize).padStart(5)} | ${fmtNum(r.goldEarnedTotal).padStart(11)} | ${r.goldMult.toFixed(2).padStart(5)} | ${r.xpMult.toFixed(2).padStart(4)} | ${fmtTime(saveSec)}`,
        );
      }
    }
    if (r.stage >= MILESTONES[MILESTONES.length - 1]!) break;
  }
  console.log(`\nParty grew to size 2/3 at stages: ${r.partyGrowthStages.join(', ') || '(stayed solo)'}`);

  console.log('\nXP curve sanity (totalExpToReach):');
  for (const L of [5, 10, 20, 36, 50]) {
    console.log(`  L${L}: ${fmtNum(totalExpToReach(L))} total xp`);
  }
  console.log(`\nFinal: stage ${r.stage}, party ${r.partySize}, levels ${r.heroLevels.join('/')}, ${fmtTime(r.simSeconds)} active play.`);
  console.log('=== done ===');
}

main();

/**
 * World-scale feasibility & economy probe (run: `npx vite-node scripts/sim-worlds.ts`).
 * Drives the UNCAPPED greedy (best-possible gear — the FEASIBILITY UPPER BOUND) and asks:
 * can a party reach WORLD 50 (= global stage 491, "50-1")? Reports time/level/economy at
 * each world milestone, and STALL-DETECTS the hard wall (no new max stage for a long
 * stretch of continuous farming). Diagnoses XP vs required level and gold vs tech cost.
 * Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';
import { TECH_NODES, nodeCost } from '../src/data/techTree';
import { worldFirstStage, worldOf, stageInWorld, expectedLevel, totalExpToReach, goldPerKill, xpPerKill, phi } from '../src/data/stageScaling';

const TARGET_WORLD = 50;
const MILESTONE_WORLDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50];
const STALL_TICKS = 6 * 3600 * 10; // 6 sim-hours of NO new max stage ⇒ declare a hard wall
const MAX_TICKS = 120 * 1e6; // hard wall-clock backstop

function fmtTime(s: number): string {
  if (s < 90) return `${s.toFixed(0)}s`;
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)}h`;
  if (s < 86400 * 800) return `${(s / 86400).toFixed(1)}d`;
  return `${(s / (86400 * 365)).toFixed(1)}y`;
}
function fmtNum(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n.toFixed(0);
  if (n < 1e6) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`;
  if (n < 1e12) return `${(n / 1e9).toFixed(1)}B`;
  if (n < 1e15) return `${(n / 1e12).toFixed(1)}T`;
  return n.toExponential(1);
}
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}
function frontierCost(ranks: Record<string, number>): number {
  const out: number[] = [];
  for (const node of TECH_NODES) {
    const rank = ranks[node.key] ?? 0;
    if (rank >= node.maxRanks) continue;
    out.push(nodeCost(node, rank));
  }
  return median(out);
}

function probe(seed: number): void {
  const r = new GreedyRunner({ seed, openChests: true }); // UNCAPPED: best gear it can find
  const reached = new Map<number, { t: number; lvl: number[]; gold: number; gx: number; xx: number; wipes: number }>();
  let maxStage = 1;
  let lastAdvanceTick = 0;
  let walled = false;

  console.log(`\n════════ seed ${seed} (uncapped / best-gear upper bound) ════════`);
  console.log('world |   global |    sim-time | party lvl  | exp.lvl | gold earned | g× | x× | wipes');
  console.log('------+----------+-------------+------------+---------+-------------+----+----+------');

  const logWorld = (w: number): void => {
    const gs = worldFirstStage(w);
    console.log(
      `${String(w).padStart(5)} | ${String(gs).padStart(8)} | ${fmtTime(r.simSeconds).padStart(11)} | ${r.heroLevels.join('/').padEnd(10)} | ${String(expectedLevel(gs)).padStart(7)} | ${fmtNum(r.goldEarnedTotal).padStart(11)} | ${r.goldMult.toFixed(0).padStart(2)} | ${r.xpMult.toFixed(0).padStart(2)} | ${r.sim.world.wipes}`,
    );
  };

  for (let i = 0; i < MAX_TICKS; i++) {
    r.run(1);
    if (r.stage > maxStage) {
      maxStage = r.stage;
      lastAdvanceTick = r.sim.world.tick;
      const w = worldOf(maxStage);
      // Record the first time we cross into each milestone world.
      if (MILESTONE_WORLDS.includes(w) && !reached.has(w) && maxStage === worldFirstStage(w)) {
        reached.set(w, { t: r.simSeconds, lvl: [...r.heroLevels], gold: r.goldEarnedTotal, gx: r.goldMult, xx: r.xpMult, wipes: r.sim.world.wipes });
        logWorld(w);
      }
    }
    if (worldOf(maxStage) >= TARGET_WORLD) break;
    if (r.sim.world.tick - lastAdvanceTick > STALL_TICKS) { walled = true; break; }
  }

  const gs = r.stage;
  const w = worldOf(gs);
  const lvl = Math.max(...r.heroLevels);
  const siw = stageInWorld(maxStage);
  const keysHere = r.sim.world.zoneKeys[w] ?? 0;
  // Distinguish a ZONE-KEY gate stall (stuck on a W-9, no key to open W-10) from a real
  // combat wall (can't beat the stage/boss even on-level).
  const gateStall = walled && siw === 9 && keysHere === 0;
  const verdict = worldOf(maxStage) >= TARGET_WORLD ? 'REACHED WORLD 50' : gateStall ? 'STUCK AT ZONE-KEY GATE (no key, not a power wall)' : walled ? 'HARD COMBAT WALL' : 'ran out of tick budget';
  console.log(`\n  ${verdict} at world ${w} (global ${maxStage} = ${worldOf(maxStage)}-${siw}) after ${fmtTime(r.simSeconds)} active play.`);
  console.log(`  party level ${r.heroLevels.join('/')} · curve wants ~L${expectedLevel(maxStage)} here · ult unlock = L30 · zone keys held (W${w}): ${keysHere}`);
  console.log(`  total wipes: ${r.sim.world.wipes}`);

  // ── Economy diagnosis at the wall ──
  console.log('\n  — economy at the wall —');
  const need = totalExpToReach(lvl + 1) - totalExpToReach(lvl);
  console.log(`  XP: L${lvl}→L${lvl + 1} needs ${fmtNum(need)} xp; a kill here pays ~${fmtNum(xpPerKill(gs) * r.xpMult)} xp → ~${fmtNum(need / Math.max(1, xpPerKill(gs) * r.xpMult))} kills/level.`);
  const onLevelXp = totalExpToReach(expectedLevel(gs));
  console.log(`  To be "on-curve" (L${expectedLevel(gs)}) here you'd need ${fmtNum(onLevelXp)} TOTAL xp — for reference L60≈2.1e12, L80≈${fmtNum(totalExpToReach(80))}.`);
  const fc = frontierCost(r.techRankSummary());
  console.log(`  Gold: a kill pays ~${fmtNum(goldPerKill(gs) * r.goldMult)}; a typical next tech rank costs ~${fmtNum(fc)} → ~${fmtNum(fc / Math.max(1, goldPerKill(gs) * r.goldMult))} kills/upgrade.`);
}

// Pure-math feasibility: gear power tracks Φ(level) and you must be level ≈ stage−12 to
// stay on-curve (bounded lag). So "can you reach world W?" reduces to "can the XP curve +
// income get you to L≈expectedLevel(worldFirstStage(W))?" This table answers it with no
// simulation — and the XP-curve is exponential, so the kills-needed explodes.
function mathTable(): void {
  console.log('\n════════ pure-math feasibility (gear is level-gated; need L≈stage−12) ════════');
  console.log('world | global |  Φ(stage) | need L | total XP to that L |  xp/kill | kills to be on-curve');
  console.log('------+--------+-----------+--------+--------------------+----------+---------------------');
  const XPMULT = 13; // generous fully-invested xp× from the comment in stageScaling.ts
  for (const W of [1, 5, 10, 15, 20, 30, 40, 50]) {
    const gs = worldFirstStage(W);
    const need = expectedLevel(gs);
    const xp = totalExpToReach(need);
    const perKill = xpPerKill(gs) * XPMULT;
    const kills = xp / Math.max(1, perKill);
    console.log(
      `${String(W).padStart(5)} | ${String(gs).padStart(6)} | ${fmtNum(phi(gs)).padStart(9)} | ${String(need).padStart(6)} | ${fmtNum(xp).padStart(18)} | ${fmtNum(perKill).padStart(8)} | ${fmtNum(kills)}`,
    );
  }
  console.log('(xp/kill already boosted by a generous 13× tech bonus; even a 1000× mult cannot dent a 10^60+ kill count.)');
}

function main(): void {
  console.log('=== Taskbar Legion — WORLD-50 feasibility & economy probe ===');
  console.log('(UNCAPPED greedy = best-case upper bound. WAVES_PER_STAGE is currently 5 [test]; design is 20.)');
  mathTable();
  for (const seed of [7, 1, 2024, 99]) probe(seed);
  console.log('\n=== done ===');
}

main();

/**
 * Zone-boss gate probe (run: `npx vite-node scripts/sim-zoneboss.ts`).
 * The 1-10 (and later W-10) zone boss is the act-ending wall (PROGRESSION §14). This
 * drives the greedy agent and, for EACH zone-boss attempt, records the best boss HP%
 * the party reached, how long it lasted, and win/loss — so we can see whether the gate
 * is a "farm a bit more" gate or an impossible cliff, and at what level/sim-time the
 * greedy finally clears it. Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner, TICK_MS } from '../test/sim/harness';
import { worldOf, stageInWorld } from '../src/data/stageScaling';
import type { Combatant } from '../src/sim/world';

interface Attempt {
  world: number;
  result: 'WIN' | 'LOSS';
  bestPct: number; // lowest boss HP fraction reached (0 = dead)
  seconds: number;
  dps: number; // measured party DPS over the attempt
  levels: number[];
  simSeconds: number;
}

function fmtTime(s: number): string {
  if (s < 90) return `${s.toFixed(0)}s`;
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

function probe(seed: number, stopAfterWorld1Win = true): void {
  const r = new GreedyRunner({ seed, openChests: true });
  const attempts: Attempt[] = [];

  let inBoss = false;
  let bossMaxHp = 0;
  let bestFrac = 1;
  let startTick = 0;
  let stageBefore = r.stage;

  const MAX_TICKS = 60 * 60 * 10 * 8; // 8h sim cap
  for (let i = 0; i < MAX_TICKS; i++) {
    stageBefore = r.stage;
    r.run(1);
    const w = r.sim.world;
    const phaseBoss = w.phase === 'zoneBoss';
    if (phaseBoss && !inBoss) {
      inBoss = true;
      const boss = w.enemies.find((e: Combatant) => e.isBoss);
      bossMaxHp = boss?.maxHp ?? 0;
      bestFrac = 1;
      startTick = w.tick;
    }
    if (phaseBoss) {
      const boss = w.enemies.find((e: Combatant) => e.isBoss);
      if (boss !== undefined) bestFrac = Math.min(bestFrac, boss.hp / Math.max(1, boss.maxHp));
    }
    if (!phaseBoss && inBoss) {
      inBoss = false;
      const seconds = ((w.tick - startTick) * TICK_MS) / 1000;
      const won = r.stage > stageBefore && stageInWorld(stageBefore) === 10; // advanced off the X-10
      attempts.push({
        world: worldOf(stageBefore),
        result: won ? 'WIN' : 'LOSS',
        bestPct: bestFrac,
        seconds,
        dps: seconds > 0 ? (bossMaxHp * (1 - bestFrac)) / seconds : 0,
        levels: r.heroLevels,
        simSeconds: r.simSeconds,
      });
      if (won && worldOf(stageBefore) === 1 && stopAfterWorld1Win) break;
    }
  }

  console.log(`\nseed ${seed}:`);
  if (attempts.length === 0) {
    console.log('  (never reached a zone boss in the sim cap)');
    return;
  }
  console.log('  attempt | world | result |  boss HP reached | dur  | party DPS | levels      | @sim-time');
  console.log('  --------+-------+--------+------------------+------+-----------+-------------+----------');
  attempts.forEach((a, idx) => {
    const reached = `${((1 - a.bestPct) * 100).toFixed(1)}% done (${(a.bestPct * 100).toFixed(0)}% left)`;
    console.log(
      `  ${String(idx + 1).padStart(7)} | ${String(a.world).padStart(5)} | ${a.result.padEnd(6)} | ${reached.padStart(16)} | ${fmtTime(a.seconds).padStart(4)} | ${a.dps.toFixed(0).padStart(9)} | ${a.levels.join('/').padEnd(11)} | ${fmtTime(a.simSeconds)}`,
    );
  });
  const w1 = attempts.filter((a) => a.world === 1);
  const firstWin = w1.find((a) => a.result === 'WIN');
  console.log(
    `  → W1 zone boss: ${w1.length} attempt(s); ${firstWin ? `cleared at levels ${firstWin.levels.join('/')} after ${fmtTime(firstWin.simSeconds)}` : 'NEVER cleared in cap'}.`,
  );
  if (w1.length > 0) {
    const best = Math.max(...w1.filter((a) => a.result === 'LOSS').map((a) => 1 - a.bestPct), 0);
    if (!firstWin || w1.indexOf(firstWin) > 0) console.log(`     best LOSS got it to ${(best * 100).toFixed(1)}% done.`);
  }
}

function main(): void {
  console.log('=== Taskbar Legion — ZONE-BOSS gate probe (the 1-10 wall) ===');
  console.log('(greedy near-BiS party — the OPTIMISTIC case; a real player is weaker)');
  for (const seed of [1, 7, 2024]) probe(seed);
  console.log('\n=== done ===');
}

main();

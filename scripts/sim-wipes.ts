/**
 * Decent-gear wipe & pacing probe (run: `npx vite-node scripts/sim-wipes.ts`).
 * Models a "normal player with decent gear": the greedy agent, but its equip tier is
 * CAPPED at T5 (Mythic) — so it wears mostly green(T1)/blue(T2)/purple(T3) with the
 * occasional T4 (Legendary) / T5 (Mythic), and never lucks into T6–T8 jackpot gear.
 * Reports time-to-reach milestone stages and WIPES PER STAGE on the road to 50-1.
 * Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';

const TARGET = 50; // reach 50-1
const MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50];
const MAX_TICKS = 120 * 3600 * 10; // 120 sim-hours safety cap (10 ticks/sec)

function fmtTime(s: number): string {
  if (s < 90) return `${s.toFixed(0)}s`;
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  if (s < 86400 * 2) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

function tierHisto(tiers: number[]): string {
  const counts = new Array(9).fill(0) as number[];
  for (const t of tiers) counts[t] = (counts[t] ?? 0) + 1;
  const names = ['T0', 'T1·grn', 'T2·blu', 'T3·prp', 'T4·leg', 'T5·myth', 'T6', 'T7', 'T8'];
  return counts.map((c, t) => (c > 0 ? `${names[t]}×${c}` : null)).filter(Boolean).join(' ');
}

function probe(seed: number): void {
  const r = new GreedyRunner({ seed, openChests: true, maxEquipTier: 5 });
  const reachTime = new Map<number, number>();
  const stageWipes = new Map<number, number>();
  let maxReached = 1;

  for (let i = 0; i < MAX_TICKS; i++) {
    const stageBefore = r.stage;
    const wipesBefore = r.sim.world.wipes;
    r.run(1);
    if (r.sim.world.wipes > wipesBefore) {
      stageWipes.set(stageBefore, (stageWipes.get(stageBefore) ?? 0) + (r.sim.world.wipes - wipesBefore));
    }
    if (r.stage > maxReached) {
      maxReached = r.stage;
      if (!reachTime.has(maxReached)) reachTime.set(maxReached, r.simSeconds);
    }
    if (r.stage >= TARGET) break;
  }

  console.log(`\n──────── seed ${seed} ────────`);
  console.log(`reached stage ${maxReached} after ${fmtTime(r.simSeconds)} active play; party ${r.partySize}, levels ${r.heroLevels.join('/')}`);
  console.log(`gear worn: ${tierHisto(r.equippedTiers)}`);
  console.log(`gold× ${r.goldMult.toFixed(2)}  xp× ${r.xpMult.toFixed(2)}  total wipes: ${[...stageWipes.values()].reduce((a, b) => a + b, 0)}`);

  console.log('\n  time to reach:');
  for (const m of MILESTONES) {
    const t = reachTime.get(m);
    console.log(`    stage ${String(m).padStart(2)}-1: ${t === undefined ? '(not reached)' : fmtTime(t)}`);
  }

  console.log('\n  wipes per stage (only stages where the party died):');
  const stages = [...stageWipes.keys()].sort((a, b) => a - b);
  const line = stages.map((s) => `stage ${s}: ${stageWipes.get(s)} wipes`).join(', ');
  console.log(`    ${line || '(no wipes)'}`);
}

function main(): void {
  console.log('=== Taskbar Legion — DECENT-GEAR wipe & pacing probe ===');
  console.log('(greedy agent, equip tier capped at T5 → green/blue/purple + occasional T4/T5)');
  for (const seed of [7, 1, 2024]) probe(seed);
  console.log('\n=== done ===');
}

main();

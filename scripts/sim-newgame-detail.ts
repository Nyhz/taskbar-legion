/**
 * Detailed fresh-start report (run: `npx vite-node scripts/sim-newgame-detail.ts`).
 * Plays a brand-new game (solo L1 Knight, nothing unlocked) and reports, per seed:
 *   - when each STAGE BOSS (1-1, 1-2, …) is first killed (sim-time + wipes so far)
 *   - when party slot 2 / 3 fill (stage, time, wipes)
 *   - total wipes + hours to reach the full-difficulty point (stage 11 = 2-1)
 * Answers: is the opening manageable? are the early bosses killable? how many wipes
 * to a 3-party, and how long? Active-play upper bound (greedy opens chests at once).
 */
import { GreedyRunner, TICK_MS } from '../test/sim/harness';

const sec = (ticks: number): number => (ticks * TICK_MS) / 1000;
const fmt = (s: number): string =>
  s < 90 ? `${s.toFixed(0)}s` : s < 5400 ? `${(s / 60).toFixed(1)}m` : `${(s / 3600).toFixed(2)}h`;

interface BossClear { stage: number; t: number; wipes: number }

function run(seed: number, maxHours: number): {
  clears: BossClear[];
  party: { size: number; stage: number; t: number; wipes: number }[];
  finalStage: number;
  totalWipes: number;
  hoursRun: number;
} {
  const r = new GreedyRunner({ seed, openChests: true });
  const clears: BossClear[] = [];
  const party: { size: number; stage: number; t: number; wipes: number }[] = [];
  const seenClear = new Set<number>();
  let lastParty = 1;
  const maxTicks = Math.round((maxHours * 3600 * 1000) / TICK_MS);

  for (let i = 0; i < maxTicks; i++) {
    const stageBefore = r.stage;
    r.run(1);
    const w = r.sim.world;
    // A stage boss was killed iff we advanced to a HIGHER stage we hadn't cleared.
    if (r.stage > stageBefore && !seenClear.has(stageBefore)) {
      seenClear.add(stageBefore);
      clears.push({ stage: stageBefore, t: sec(w.tick), wipes: w.wipes });
    }
    if (r.partySize > lastParty) {
      party.push({ size: r.partySize, stage: r.stage, t: sec(w.tick), wipes: w.wipes });
      lastParty = r.partySize;
    }
    // Stop once we clear the world-1 ramp and prove a few full-difficulty stages.
    if (r.stage >= 13) return finalize();
  }
  return finalize();

  function finalize() {
    return { clears, party, finalStage: r.stage, totalWipes: r.sim.world.wipes, hoursRun: sec(r.sim.world.tick) / 3600 };
  }
}

function label(stage: number): string {
  const w = Math.floor((stage - 1) / 10) + 1;
  const s = ((stage - 1) % 10) + 1;
  return `${w}-${s}`;
}

function main(): void {
  console.log('=== Taskbar Legion — DETAILED fresh new-game report ===');
  console.log('(solo L1 Knight, nothing unlocked; active-play upper bound)\n');

  for (const seed of [1, 2024, 7, 99]) {
    const res = run(seed, 24);
    console.log(`──────── seed ${seed} ────────`);
    console.log('  Stage-boss first kills (cumulative time · wipes-so-far):');
    for (const c of res.clears) {
      console.log(`    ${label(c.stage).padEnd(5)} boss killed @ ${fmt(c.t).padStart(7)}  (wipes so far: ${c.wipes})`);
    }
    for (const p of res.party) {
      console.log(`  → party grew to ${p.size} at stage ${label(p.stage)} @ ${fmt(p.t)} (wipes: ${p.wipes})`);
    }
    console.log(`  reached stage ${label(res.finalStage)} (${res.finalStage}) in ${res.hoursRun.toFixed(2)}h · TOTAL wipes ${res.totalWipes}\n`);
  }
  console.log('=== done ===');
}

main();

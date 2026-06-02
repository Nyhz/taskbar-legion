/**
 * Fresh-start advance probe (run: `npx vite-node scripts/sim-newgame.ts`).
 * Answers: "can a brand-new game actually get going?" Starts a SOLO level-1 Warrior
 * with no gear / talents / tech (exactly a new save) and plays it forward, reporting
 * full-party WIPES and stage/level progress over the opening. The opening is the
 * fragile window: a gearless warrior must survive 1-1 to earn the first gold/items
 * that bootstrap the whole loop. Test/dev tooling only (sim/ + data/).
 */
import { GreedyRunner } from '../test/sim/harness';

function fmtTime(s: number): string {
  if (s < 90) return `${s.toFixed(0)}s`;
  if (s < 5400) return `${(s / 60).toFixed(1)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

function probe(seed: number): void {
  const r = new GreedyRunner({ seed, openChests: true });
  const TICK_S = 0.1;
  const marks: { t: number; label: string }[] = [];
  let firstClear = -1;
  let wipesAt10m = -1;
  let wipesAt30m = -1;
  const checkpoints = [10 * 60, 30 * 60, 60 * 60, 120 * 60]; // sim-seconds
  let ci = 0;

  const TOTAL_TICKS = 120 * 60 * 10; // 2h sim
  for (let i = 0; i < TOTAL_TICKS; i++) {
    const stageBefore = r.stage;
    r.run(1);
    if (firstClear < 0 && r.stage > stageBefore && stageBefore === 1) firstClear = r.sim.world.tick * TICK_S;
    const tSec = r.sim.world.tick * TICK_S;
    if (ci < checkpoints.length && tSec >= checkpoints[ci]!) {
      marks.push({ t: tSec, label: `@${fmtTime(tSec)}: stage ${r.stage} (1-${r.stage <= 10 ? r.stage : r.stage}), lvl ${r.heroLevels.join('/')}, party ${r.partySize}, wipes ${r.sim.world.wipes}` });
      if (checkpoints[ci] === 600) wipesAt10m = r.sim.world.wipes;
      if (checkpoints[ci] === 1800) wipesAt30m = r.sim.world.wipes;
      ci += 1;
    }
  }

  console.log(`\nseed ${seed}:`);
  console.log(`  first 1-1 clear: ${firstClear < 0 ? 'NEVER (stuck!)' : fmtTime(firstClear)}`);
  console.log(`  wipes in first 10m: ${wipesAt10m}   first 30m: ${wipesAt30m}   total(2h): ${r.sim.world.wipes}`);
  for (const m of marks) console.log(`  ${m.label}`);
  // A deliberately-gated fresh start: a naked L1 warrior is EXPECTED to farm a few
  // waves for gear/levels before its first 1-1 clear. "Advances" = it bootstraps (clears
  // 1-1 within ~1h) and keeps progressing (≥ stage 3 in 2h) rather than being stuck.
  const verdict = firstClear >= 0 && firstClear < 3600 && r.stage >= 3;
  console.log(`  → ${verdict ? 'ADVANCES ✓' : 'STUCK ✗'} (bootstraps 1-1 within ~1h, keeps progressing)`);
}

function main(): void {
  console.log('=== Taskbar Legion — FRESH NEW-GAME advance probe ===');
  console.log('(solo L1 Warrior, no gear/talents/tech — exactly a new save)');
  for (const seed of [1, 7, 2024, 99]) probe(seed);
  console.log('\n=== done ===');
}

main();

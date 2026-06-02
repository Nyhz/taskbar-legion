/**
 * Headless smoke harness (run: `npx vite-node scripts/sim-smoke.ts`).
 * Drives the deterministic sim with the greedy agent for ≥300 stages and prints
 * the balance curves + the PROGRESSION §11 measurements (clear times, frozen B,
 * stage-50 daily T6/T7/T8 drop counts, keys/30min). No Pixi/React imported.
 */
import { GreedyRunner, dropRateProbe, TICK_MS } from '../test/sim/harness';
import { getBonuses } from '../src/sim/bonuses';
import { phi, enemyHp } from '../src/data/stageScaling';

const secs = (ticks: number): number => (ticks * TICK_MS) / 1000;
const pct = (xs: number[], p: number): number => xs.length ? (xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] ?? 0) : 0;

function main(): void {
  console.log('=== Taskbar Legion — sim smoke harness ===\n');

  const r = new GreedyRunner({ seed: 2024, openChests: true });
  r.run(900_000, 240);
  const stageSecs = r.clears.filter((c) => c.stage % 10 !== 9 && c.stage % 10 !== 0).map((c) => secs(c.ticks));
  const waves = r.waveTimes;
  const earlyWaves = waves.slice(0, 80);

  console.log(`Reached stage ${r.stage} · party ${r.partySize} · levels ${r.heroLevels.join('/')}`);
  console.log(`A stage = 20 waves (each +5% → boss). Waves cleared: ${waves.length}`);
  console.log(`  per-WAVE clear:  p50 ${pct(waves, 0.5).toFixed(1)}s  p90 ${pct(waves, 0.9).toFixed(1)}s  p95 ${pct(waves, 0.95).toFixed(1)}s  (early p90 ${pct(earlyWaves, 0.9).toFixed(1)}s)`);
  console.log(`  per-STAGE clear: p50 ${pct(stageSecs, 0.5).toFixed(0)}s  p90 ${pct(stageSecs, 0.9).toFixed(0)}s  (a full 20-wave area)`);

  console.log('\nΦ / enemyHP spot-checks (match §12):');
  for (const S of [10, 50, 100, 200]) {
    console.log(`  S=${S}: Φ=${phi(S).toExponential(2)}  enemyHP=${enemyHp(S).toExponential(2)}`);
  }

  console.log('\nFrozen-gear B (stop equipping at S0; keep leveling/talents/tech):');
  for (const S0 of [80, 200]) {
    const fr = new GreedyRunner({ seed: 500 + S0, openChests: true });
    fr.run(900_000, S0);
    const reached = fr.stage;
    fr.freezeGearAtStage = 0;
    let maxStage = reached;
    for (let i = 0; i < 80_000; i++) {
      fr.run(1);
      maxStage = Math.max(maxStage, fr.stage);
    }
    console.log(`  S0=${S0}: reached ${reached} → frozen max ${maxStage} → B=${maxStage - reached}`);
  }

  console.log('\nStage-50 farming throughput (24h, auto-open base 10min):');
  const b = getBonuses({ auto_open: 1 }, []);
  let t6 = 0, t7 = 0, t8 = 0, keys = 0;
  const N = 12;
  for (let s = 0; s < N; s++) {
    const d = dropRateProbe(50, 24, b, 3000 + s * 11);
    t6 += d.combined[6] ?? 0;
    t7 += d.combined[7] ?? 0;
    t8 += d.combined[8] ?? 0;
    keys += d.keys;
  }
  console.log(`  avg/day: T6=${(t6 / N).toFixed(2)} (target ~2)  T7=${(t7 / N).toFixed(2)} (target ~1)  T8=${(t8 / N).toFixed(2)} (target ~0.5)`);
  console.log(`  keys/30min=${(keys / N / 48).toFixed(2)} (target ~1)`);
  console.log('\n=== done ===');
}

main();

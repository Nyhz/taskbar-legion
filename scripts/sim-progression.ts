/**
 * THE standardized progression probe (run: `npx vite-node scripts/sim-progression.ts`).
 *
 * Simulates an "average player" (KRP party, starts as a solo naked Knight; not very active —
 * captures ~50% of normal chests, ~90%/100% of boss chests via storage overflow; 2h/day active
 * + offline gold/xp) all the way from Normal 1-1 to Torment 10-10, and reports how long it takes
 * — BOTH active playtime (matches "Normal ≈ 4h") and calendar time (matches "Torment ≈ months").
 *
 * Combat is the REAL deterministic sim (no analytic combat); the farming treadmill is integrated
 * analytically so months finish in milliseconds. Pooled across seeds (median) for "average luck".
 * All knobs live in DEFAULT_CONFIG (test/sim/probe/loop.ts) — tech-spend order + capture rates
 * are the big pacing levers. Test/dev tooling only (sim/ + data/).
 */
import { runProbe, DEFAULT_CONFIG, type ProbeResult } from '../test/sim/probe/loop';
import { DIFFICULTY_KEYS, DIFFICULTIES } from '@/data/difficulties';

// Seed count is overridable for fast tuning iterations: `PROBE_SEEDS=1 npm run probe`.
const SEED_COUNT = Math.max(1, Number(process.env.PROBE_SEEDS ?? 5));
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => i + 1);

function fmtHours(h: number): string {
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = h / 24;
  if (d < 30) return `${d.toFixed(1)}d`;
  return `${(d / 30).toFixed(1)}mo`;
}
function fmtDays(d: number): string {
  if (d < 1) return '<1d';
  if (d < 30) return `${d.toFixed(0)}d`;
  return `${(d / 30).toFixed(1)}mo`;
}
function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

const results: ProbeResult[] = SEEDS.map((s) => runProbe(s, DEFAULT_CONFIG));

console.log('\n=== PROGRESSION PROBE — average player, KRP, solo-Knight start ===');
console.log(`config: ${DEFAULT_CONFIG.activeHoursPerDay}h/day active + ${DEFAULT_CONFIG.offlineHoursPerDay}h offline · ` +
  `capture N/S/Z=${DEFAULT_CONFIG.capture.normal}/${DEFAULT_CONFIG.capture.stageBoss}/${DEFAULT_CONFIG.capture.zoneBoss} · seeds=${SEEDS.length}`);

const completed = results.filter((r) => r.completed);
console.log(`completed ${completed.length}/${results.length} seeds` +
  (completed.length < results.length ? ` (stalled seeds reached stage ${results.filter((r) => !r.completed).map((r) => r.stalledAtStage).join(', ')})` : ''));

// Per-difficulty headline: cumulative ACTIVE playtime + CALENDAR time to FINISH each difficulty.
console.log('\n--- time to FINISH each difficulty (cumulative, median across seeds) ---');
console.log('difficulty\tcap\tactive(play)\tcalendar\tΔ vs prev (calendar)');
let prevDays = 0;
for (const key of DIFFICULTY_KEYS) {
  const act = results.map((r) => r.difficultyActiveHours[key]).filter((x): x is number => x !== undefined);
  const day = results.map((r) => r.difficultyCalendarDays[key]).filter((x): x is number => x !== undefined);
  const def = DIFFICULTIES[key];
  if (day.length === 0) {
    console.log(`${def.name}\tT${def.tierCap}\t—\t— (not reached by ${results.length - day.length} seeds)`);
    continue;
  }
  const mDays = median(day);
  const ratio = prevDays > 0 ? `${(mDays / prevDays).toFixed(1)}×` : '—';
  console.log(`${def.name}\tT${def.tierCap}\t${fmtHours(median(act))}\t${fmtDays(mDays)}\t${ratio}`);
  prevDays = mDays;
}

// Per-world-boss wall report (from the median seed by total days).
const mid = [...results].sort((a, b) => a.totalCalendarDays - b.totalCalendarDays)[Math.floor(results.length / 2)];
if (mid !== undefined) {
  console.log(`\n--- world-boss walls (seed ${mid.seed}: ${fmtDays(mid.totalCalendarDays)} calendar, ${mid.totalActiveHours.toFixed(0)}h active) ---`);
  console.log('world\tdiff\tstage\tactive\tcalendar\tdaysOnWorld\twipes\tlvl\ttopTier\tkillSec\tbossMinHP%');
  for (const m of mid.milestones) {
    const stall = m.daysOnWorld >= 30 ? ' ◄STALL' : '';
    console.log([m.world, m.difficulty, m.stage, fmtHours(m.activeHours), fmtDays(m.calendarDays), fmtDays(m.daysOnWorld), m.bossFails, m.partyLevel, `T${m.topTier}`, m.bossKillSec.toFixed(0), m.bossMinHpPct.toFixed(0) + stall].join('\t'));
  }
}

// PER-GATE report (median ACROSS seeds) — the x-10 difficulty walls. Single-seed per-world
// days are pure RNG noise (the shared loot stream reshuffles on any upstream change), so the
// gate day/wipe targets are only meaningful aggregated across seeds.
console.log('\n--- difficulty GATES (x-10): median across seeds ---');
console.log('gate\tworld\tdaysOnWorld\twipes\t(range days)');
for (const gw of [10, 20, 30, 40, 50]) {
  const days = results.map((r) => r.milestones.find((m) => m.world === gw)?.daysOnWorld).filter((x): x is number => x !== undefined);
  const wp = results.map((r) => r.milestones.find((m) => m.world === gw)?.bossFails).filter((x): x is number => x !== undefined);
  if (days.length === 0) { console.log(`W${gw}\t—\tnot reached`); continue; }
  const diffName = DIFFICULTY_KEYS[Math.floor((gw * 10 - 1) / 100)] ?? '?';
  const lo = Math.min(...days), hi = Math.max(...days);
  console.log(`${diffName} ${gw}-10\tW${gw}\t${median(days).toFixed(1)}d\t${median(wp).toFixed(0)}\t(${lo.toFixed(0)}-${hi.toFixed(0)}d)`);
}

// Tech-node + wipe summary (median across seeds).
console.log('\n--- progression summary (median across seeds) ---');
console.log(`tech nodes unlocked: ${median(results.map((r) => r.techNodeCount)).toFixed(0)} distinct · ${median(results.map((r) => r.techTotalRanks)).toFixed(0)} total ranks`);
console.log(`world-boss wall failures (wipes) total: ${median(results.map((r) => r.totalBossFails)).toFixed(0)}`);
// Wipes broken down by difficulty (median seed).
if (mid !== undefined) {
  const byDiff: Record<string, number> = {};
  for (const m of mid.milestones) byDiff[m.difficulty] = (byDiff[m.difficulty] ?? 0) + m.bossFails;
  console.log('wipes by difficulty (median seed): ' + DIFFICULTY_KEYS.map((k) => `${k}=${byDiff[k] ?? 0}`).join(' · '));
  // Worlds where the party stalled ≥30 calendar days.
  const stalls = mid.milestones.filter((m) => m.daysOnWorld >= 30);
  console.log('stalled worlds (≥30d on one world): ' + (stalls.length === 0 ? 'none' : stalls.map((m) => `W${m.world}(${m.difficulty}, ${fmtDays(m.daysOnWorld)}, ${m.bossFails} wipes)`).join(' · ')));
}

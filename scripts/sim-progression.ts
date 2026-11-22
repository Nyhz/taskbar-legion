/**
 * THE standardized progression probe (run: `npx vite-node scripts/sim-progression.ts`).
 *
 * Simulates an "average player" (KRP party, starts as a solo naked Knight; the game open 8h/day
 * as a desktop overlay — captures ~50% of normal chests, ~90%/100% of boss chests via storage
 * overflow — + offline gold/xp) all the way from Normal 1-1 to Torment 10-10, and reports how long
 * it takes. TARGET: about 3 months of calendar time at that rate (see DEFAULT_CONFIG)
 * — BOTH active playtime (matches "Normal ≈ 4h") and calendar time (matches "Torment ≈ months").
 *
 * Combat is the REAL deterministic sim (no analytic combat); the farming treadmill is integrated
 * analytically so months finish in milliseconds. Pooled across seeds (median) for "average luck".
 * All knobs live in DEFAULT_CONFIG (test/sim/probe/loop.ts) — tech-spend order + capture rates
 * are the big pacing levers. Test/dev tooling only (sim/ + data/).
 */
import { MEASURE_PROFILE } from '../test/sim/probe/combat';
import { calibrate } from '../test/sim/probe/fast';
import { runProbe, DEFAULT_CONFIG, type ProbeResult } from '../test/sim/probe/loop';
import { DIFFICULTY_KEYS, DIFFICULTIES } from '@/data/difficulties';
import { WORLD_HOURS_TARGET, DIFFICULTY_HOURS_TARGET } from '../test/sim/probe/targets';

// Seed count is overridable for fast tuning iterations: `PROBE_SEEDS=1 npm run probe`.
const SEED_COUNT = Math.max(1, Number(process.env.PROBE_SEEDS ?? 5));
// `PROBE_SEED_FROM=6` starts at another seed (a check on seeds the walls were not tuned on).
const SEED_FROM = Math.max(1, Number(process.env.PROBE_SEED_FROM ?? 1));
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => i + SEED_FROM);

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

// Partial runs for tuning: `PROBE_STOP=100 npm run probe` stops once that global stage is cleared.
const STOP = Number(process.env.PROBE_STOP ?? 0);
const TRACE = process.env.PROBE_TRACE === '1'; // a line per stage cleared / recruit / wall attempt
const GEAR = process.env.PROBE_GEAR === '1'; // also measure the gear % of the zone at every wall kill (slower)
const FAST = process.env.PROBE_FAST === '1' || process.argv.includes('--fast'); // the fast probe: farms and wall attempts from a calibration (test/sim/probe/fast.ts)
if (FAST) calibrate((line) => console.log(line));
const CONFIG = { ...DEFAULT_CONFIG, ...(FAST ? { fast: true } : {}), ...(GEAR ? { measureGear: true } : {}), ...(STOP > 0 ? { stopAtStage: STOP } : {}), ...(TRACE ? { trace: (line: string) => console.log(line) } : {}) };
const t0 = performance.now();
const results: ProbeResult[] = SEEDS.map((s) => runProbe(s, CONFIG));
if (process.env.PROBE_PROFILE === '1') {
  const total = performance.now() - t0;
  const { farm, boss } = MEASURE_PROFILE;
  console.log(`PROFILE total ${(total / 1000).toFixed(0)} s · farm ${farm.calls} calls ${(farm.ms / 1000).toFixed(0)} s (${(farm.ticks / 1e6).toFixed(2)} M ticks) · boss ${boss.calls} calls ${(boss.ms / 1000).toFixed(0)} s (${(boss.ticks / 1e6).toFixed(2)} M ticks) · rest ${((total - farm.ms - boss.ms) / 1000).toFixed(0)} s`);
}

console.log('\n=== PROGRESSION PROBE — average player, KRP, solo-Knight start ===');
console.log(`config: ${DEFAULT_CONFIG.activeHoursPerDay}h/day active + ${DEFAULT_CONFIG.offlineHoursPerDay}h away (the game counts its cap, 8h) · ` +
  `capture N/S/Z=${DEFAULT_CONFIG.capture.normal}/${DEFAULT_CONFIG.capture.stageBoss}/${DEFAULT_CONFIG.capture.zoneBoss} · seeds=${SEEDS.length}`);

const completed = results.filter((r) => r.completed);
console.log(`completed ${completed.length}/${results.length} seeds` +
  (completed.length < results.length ? ` (stalled seeds reached stage ${results.filter((r) => !r.completed).map((r) => r.stalledAtStage).join(', ')})` : ''));

// Per-difficulty headline: cumulative ACTIVE playtime + CALENDAR time to FINISH each difficulty.
console.log('\n--- time to FINISH each difficulty (cumulative, median across seeds) ---');
console.log('difficulty\tcap\tactive(play)\tcalendar\tΔ vs prev (calendar)\tactive hours: this difficulty / its target');
let prevDays = 0;
let prevActive = 0;
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
  const own = median(act) - prevActive;
  console.log(`${def.name}\tT${def.tierCap}\t${fmtHours(median(act))}\t${fmtDays(mDays)}\t${ratio}\t${own.toFixed(0)} h / ${(DIFFICULTY_HOURS_TARGET[def.index] ?? 0).toFixed(0)} h`);
  prevDays = mDays;
  prevActive = median(act);
}

// What active play produced by the end of each difficulty (median across the seeds that got there): the base
// the pet drop rates and the pet objectives are tuned on (src/data/pets.ts).
console.log('\n--- active play, cumulative at the END of each difficulty (median across seeds) ---');
console.log('difficulty\tkills\tbossKills\tgold\txp/hero\tchestsFound\tcommonOpened');
for (const key of DIFFICULTY_KEYS) {
  const tallies = results.map((r) => r.difficultyTally[key]).filter((x): x is NonNullable<typeof x> => x !== undefined);
  if (tallies.length === 0) { console.log(`${DIFFICULTIES[key].name}\t— (not reached)`); continue; }
  const col = (pick: (t: (typeof tallies)[number]) => number): string => Math.round(median(tallies.map(pick))).toLocaleString('en-US');
  console.log([DIFFICULTIES[key].name, col((t) => t.kills), col((t) => t.bossKills), col((t) => t.gold), col((t) => t.xp), col((t) => t.chestsFound), col((t) => t.normalChestsOpened)].join('\t'));
}
{
  const col = (pick: (r: ProbeResult) => number): string => Math.round(median(results.map(pick))).toLocaleString('en-US');
  console.log(['(run end)', col((r) => r.tally.kills), col((r) => r.tally.bossKills), col((r) => r.tally.gold), col((r) => r.tally.xp), col((r) => r.tally.chestsFound), col((r) => r.tally.normalChestsOpened)].join('\t') + `\t· ${col((r) => r.totalActiveHours)} h active`);
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

// PER-WORLD report pooled across seeds (median of the seeds that cleared the world): active hours on the world,
// how long the party waited at the wall for its first key, hours spent there with no key in hand, and attempts
// (each attempt spends a key; a failed one loses it).
console.log('\n--- every world, median across seeds: active hours · wait for the first key · hours without a key · attempts (range of hours) ---');
console.log('world\tdiff\ttarget\thours(mean)\thours(median)\tfirstKey\tkeyless\tattempts(mean)\tlvl\ttopTier\t(hours range)');
for (let w = 1; w <= 50; w++) {
  const ms = results.map((r) => r.milestones.find((m) => m.world === w)).filter((m): m is NonNullable<typeof m> => m !== undefined);
  if (ms.length === 0) break;
  const hrs = ms.map((m) => m.hoursOnWorld);
  const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log([w, ms[0]?.difficulty, (WORLD_HOURS_TARGET[w - 1] ?? 0).toFixed(1), avg(hrs).toFixed(1), median(hrs).toFixed(1), median(ms.map((m) => m.firstKeyHours)).toFixed(1), median(ms.map((m) => m.keylessHours)).toFixed(1),
    avg(ms.map((m) => m.bossFails + 1)).toFixed(1), median(ms.map((m) => m.partyLevel)).toFixed(0), `T${median(ms.map((m) => m.topTier)).toFixed(0)}`,
    `(${Math.min(...hrs).toFixed(1)}-${Math.max(...hrs).toFixed(1)}, n=${ms.length})`].join('\t'));
}
// WHY each difficulty is as long as it is: what the party wore when each wall fell (median across seeds, then the
// mean over the difficulty's ten walls) — slots filled, pieces of the wall's own world, mean rarity, gems socketed.
console.log('\n--- gear worn when the walls fell, by difficulty (mean of its ten walls; medians across seeds) ---');
console.log('difficulty\tslots/33\tof this world\tof this difficulty\tmean rarity\ttop-rarity pieces\tgems/sockets\tlevel');
for (let d = 0; d < 5; d++) {
  const rowsOf: number[][] = [];
  for (let w = d * 10 + 1; w <= d * 10 + 10; w++) {
    const ms = results.map((r) => r.milestones.find((m) => m.world === w)).filter((m): m is NonNullable<typeof m> => m !== undefined);
    if (ms.length === 0) continue;
    rowsOf.push([median(ms.map((m) => m.gear.slots)), median(ms.map((m) => m.gear.ofThisWorld)), median(ms.map((m) => m.gear.ofThisDifficulty)), median(ms.map((m) => m.gear.meanTier)),
      median(ms.map((m) => m.gear.topTierPieces)), median(ms.map((m) => m.gear.gems)), median(ms.map((m) => m.gear.sockets)), median(ms.map((m) => m.partyLevel))]);
  }
  if (rowsOf.length === 0) continue;
  const avgOf = (k: number): number => rowsOf.reduce((a, r) => a + (r[k] ?? 0), 0) / rowsOf.length;
  console.log([DIFFICULTY_KEYS[d], avgOf(0).toFixed(0), avgOf(1).toFixed(1), avgOf(2).toFixed(1), avgOf(3).toFixed(2), avgOf(4).toFixed(1), `${avgOf(5).toFixed(0)}/${avgOf(6).toFixed(0)}`, avgOf(7).toFixed(0)].join('\t'));
}
// THE WALLS ONE BY ONE: what the party wore when each fell and how the fight went (medians across seeds). With
// PROBE_GEAR=1: its gear % of the zone and the wall's share of the zone set (the gear % that kills at exactly 60 s).
console.log('\n--- each wall when it fell (medians across seeds): the fight and the gear ---');
console.log('world\tdiff\tlevel\tattempts(mean)\tfight s\tmin HP %\tslots/33\tof this world\tof this difficulty\tmean rarity\ttop-rarity pieces\tgems/sockets\tgear % of the zone\twall = % of the zone set');
for (let w = 1; w <= 50; w++) {
  const ms = results.map((r) => r.milestones.find((m) => m.world === w)).filter((m): m is NonNullable<typeof m> => m !== undefined);
  if (ms.length === 0) break;
  const med = (pick: (m: (typeof ms)[number]) => number): number => median(ms.map(pick));
  const opt = (pick: (m: (typeof ms)[number]) => number | undefined): string => {
    const xs = ms.map(pick).filter((x): x is number => x !== undefined);
    return xs.length > 0 ? median(xs).toFixed(0) : '—';
  };
  console.log([w, ms[0]?.difficulty, med((m) => m.partyLevel).toFixed(0), (ms.reduce((a, m) => a + m.bossFails + 1, 0) / ms.length).toFixed(1), med((m) => m.bossFightSec).toFixed(0), med((m) => m.bossMinHpPct).toFixed(0),
    med((m) => m.gear.slots).toFixed(0), med((m) => m.gear.ofThisWorld).toFixed(0), med((m) => m.gear.ofThisDifficulty).toFixed(0), med((m) => m.gear.meanTier).toFixed(2), med((m) => m.gear.topTierPieces).toFixed(0),
    `${med((m) => m.gear.gems).toFixed(0)}/${med((m) => m.gear.sockets).toFixed(0)}`, opt((m) => m.gearPct), opt((m) => m.wallPct)].join('\t'));
}
console.log('seeds, total calendar days: ' + results.map((r) => `${r.seed}:${r.completed ? r.totalCalendarDays : `stalled@${r.stalledAtStage}`}`).join(' · '));

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

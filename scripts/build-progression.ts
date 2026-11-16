/**
 * What the build is worth over a WHOLE run: the probe's average player from Normal 1-1 to Torment 10-10, the same
 * seeds, in three policies at the walls (the party farms in the default build in all three; before each attempt
 * at a world boss it respecs, for free, into):
 *   - default: the probe's build;
 *   - optimal: the build scripts/build-study.ts found best for that wall (STUDY_RESULTS; a wall the study did not
 *     search takes the build of the nearest searched wall of the same world number, else the default);
 *   - random:  a random build per wall and seed (a player who never thinks about it).
 * Run: `npx vite-node scripts/build-progression.ts` with STUDY_RESULTS=<build-study jsonl>, PROG_SEEDS (8),
 * PROG_JOBS (9), PROG_OUT (jsonl), PROG_PETS ('none'), PROG_POLICIES (default,optimal,random), PROG_FIXED (1; 0 = the old
 * probe, whose failed walls rerolled their affixes). Workers: PROG_SHARD=i/N. Test/dev tooling only.
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { runProbe, DEFAULT_CONFIG, type ProbeConfig } from '../test/sim/probe/loop';
import { parseBuildLabel, randomPartyBuild, type PartyBuild } from '../test/sim/probe/builds';
import { CLASS_KEYS } from '@/data/classes';

const RESULTS = process.env.STUDY_RESULTS ?? 'build-study.jsonl';
const SEEDS = Number(process.env.PROG_SEEDS ?? 8);
const JOBS = Number(process.env.PROG_JOBS ?? 9);
const OUT = process.env.PROG_OUT ?? 'build-progression.jsonl';
const PETS = (process.env.PROG_PETS ?? 'none') as 'none' | 'median';
const POLICIES = (process.env.PROG_POLICIES ?? 'default,optimal,random').split(',');
const FIXED = process.env.PROG_FIXED !== '0'; // 0 = the old probe: a failed wall rerolled its affixes

function optimalTable(): Record<number, PartyBuild> {
  const out: Record<number, PartyBuild> = {};
  for (const line of readFileSync(RESULTS, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const r = JSON.parse(line) as { stage?: number; optimal?: Record<string, string> };
    if (r.stage === undefined || r.optimal === undefined) continue;
    const b: Record<string, ReturnType<typeof parseBuildLabel>> = {};
    for (const [c, label] of Object.entries(r.optimal)) b[c] = parseBuildLabel(c, label);
    out[r.stage] = b;
  }
  return out;
}

function nearest(table: Record<number, PartyBuild>, stage: number): PartyBuild | undefined {
  if (table[stage] !== undefined) return table[stage];
  const sameWorld = Object.keys(table).map(Number).filter((s) => (s / 10) % 10 === (stage / 10) % 10);
  sameWorld.sort((a, b) => Math.abs(a - stage) - Math.abs(b - stage));
  const s = sameWorld[0];
  return s === undefined ? undefined : table[s];
}

function job(policy: string, seed: number): void {
  const table = optimalTable();
  const cfg: ProbeConfig = {
    ...DEFAULT_CONFIG,
    pets: PETS,
    fixedRunSeed: FIXED,
    wallBuild: policy === 'optimal' ? (s) => nearest(table, s)
      : policy === 'random' ? (s) => randomPartyBuild(CLASS_KEYS, seed * 1009 + s)
      : undefined,
  };
  const t = Date.now();
  const r = runProbe(seed, cfg);
  appendFileSync(OUT, JSON.stringify({ policy, seed, pets: PETS, fixed: FIXED, completed: r.completed, stalledAt: r.stalledAtStage, hours: r.difficultyActiveHours, total: r.totalActiveHours, fails: r.totalBossFails, days: r.totalCalendarDays, sec: (Date.now() - t) / 1000 }) + '\n');
  process.stdout.write(`${policy} seed ${seed}: ${r.totalActiveHours.toFixed(0)} h, fails ${r.totalBossFails}, ${((Date.now() - t) / 1000).toFixed(0)} s\n`);
}

const shard = process.env.PROG_SHARD;
const jobs: [string, number][] = [];
for (let s = 1; s <= SEEDS; s++) for (const p of POLICIES) jobs.push([p, s]);
if (shard !== undefined) {
  const [i, n] = shard.split('/').map(Number);
  jobs.forEach(([p, s], idx) => { if (idx % (n ?? 1) === (i ?? 0)) job(p, s); });
} else {
  writeFileSync(OUT, '');
  let left = JOBS;
  for (let i = 0; i < JOBS; i++) {
    spawn('npx', ['vite-node', 'scripts/build-progression.ts'], { env: { ...process.env, PROG_SHARD: `${i}/${JOBS}` }, stdio: ['ignore', 'inherit', 'inherit'] })
      .on('exit', () => { left -= 1; if (left === 0) process.stdout.write('all workers done\n'); });
  }
}

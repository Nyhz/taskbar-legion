/**
 * Round 13 — the canonical ladder measure (test/sim/probe/referenceAsk): what every wall asks against the FIXED reference
 * party. Prints the 50 asks, beside the arrive-based ones of a ceiling-pass file when CP_FILE is given (median of its
 * seeds), the distance to the ladder lines (LAD), and FAILS (exit 1) unless every wall asks STRICTLY more than the one
 * before, across the difficulty seams too. RL_WRITE=1 rewrites the recorded table test/sim/probe/referenceAskTable.ts.
 * Env: CP_FILE, LAD (JSON [[lo,hi]×5]), RL_WRITE, RL_SHARD=i/N with RL_OUT (one worker's walls as JSON lines; the
 * report then reads RL_IN, a comma list of those files). Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { referenceAsk } from '../test/sim/probe/referenceAsk';

const NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment'];
const LAD: [number, number][] = JSON.parse(process.env.LAD ?? '[[4,8],[11,19],[32,68],[96,124],[148,164]]');
const shard = process.env.RL_SHARD;
if (shard !== undefined) {
  const [i, n] = shard.split('/').map(Number);
  for (let w = 1; w <= 50; w++) if ((w - 1) % (n ?? 1) === (i ?? 0)) appendFileSync(process.env.RL_OUT ?? 'rl.jsonl', JSON.stringify({ S: w * 10, ask: referenceAsk(w * 10) }) + '\n');
  process.exit(0);
}
const asks: number[] = Array(50).fill(Number.NaN);
if (process.env.RL_IN !== undefined) {
  for (const f of process.env.RL_IN.split(',')) for (const l of readFileSync(f, 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l) as { S: number; ask: number }; asks[r.S / 10 - 1] = r.ask; }
} else for (let w = 1; w <= 50; w++) asks[w - 1] = referenceAsk(w * 10);
const arrive: (number | undefined)[] = Array(50).fill(undefined);
if (process.env.CP_FILE !== undefined) {
  const rows = readFileSync(process.env.CP_FILE, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as { walls: { stage: number; askArrive?: number }[] });
  for (let w = 1; w <= 50; w++) {
    const v = rows.flatMap((r) => r.walls.filter((x) => x.stage === w * 10 && x.askArrive !== undefined).map((x) => x.askArrive as number)).sort((a, b) => a - b);
    if (v.length > 0) arrive[w - 1] = v[Math.floor(v.length / 2)];
  }
}
let ok = true;
console.log('| Wall | Reference ask | Arrive-based ask | Line | Δ to line | Rises |');
console.log('|---|---:|---:|---:|---:|:---:|');
for (let w = 1; w <= 50; w++) {
  const d = Math.floor((w - 1) / 10);
  const k = (w - 1) % 10;
  const [lo, hi] = LAD[d] ?? [0, 0];
  const line = lo + ((hi - lo) * k) / 9;
  const a = asks[w - 1] ?? Number.NaN;
  const rises = w === 1 || a > (asks[w - 2] ?? Number.POSITIVE_INFINITY);
  if (!rises) ok = false;
  console.log(`| ${NAMES[d]} ${k + 1} | ${a.toFixed(2)} | ${arrive[w - 1]?.toFixed(1) ?? '—'} | ${line.toFixed(1)} | ${(a - line >= 0 ? '+' : '') + (a - line).toFixed(1)} | ${rises ? 'yes' : '**NO**'} |`);
}
if (process.env.RL_WRITE === '1') {
  const rows = Array.from({ length: 5 }, (_, d) => '  ' + asks.slice(d * 10, d * 10 + 10).map((x) => Number(x.toPrecision(4))).join(', ') + ',').join('\n');
  writeFileSync('test/sim/probe/referenceAskTable.ts', `// What each wall asks against the fixed reference party (test/sim/probe/referenceAsk), recorded by
// \`RL_WRITE=1 npx vite-node scripts/reference-ladder.ts\` (round 13). test/sim/ladder.test.ts holds it strictly rising and
// spot-checks it against a fresh measure, so a change to the walls or to hero power that leaves it stale fails a test.
/** % of the reference party's 60 s of damage each wall asks, world 1 … 50. */
export const REFERENCE_ASK: readonly number[] = [
${rows}
];
`);
}
if (!ok) {
  console.error('LADDER BROKEN: a wall asks no more than the one before');
  process.exit(1);
}

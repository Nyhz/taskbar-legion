/**
 * The toughness anchors along the game (run: `npx vite-node scripts/measure-anchors.ts`), against the probe's
 * average player: at every world, on arrival (stage X-1) and at the wall (stage X-9), how many basic hits a grunt
 * takes, how long the stage boss lasts, and how long the stage takes to clear. Env: ANCHOR_SEEDS (default 2),
 * ANCHOR_WORLDS (default 50).
 */
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, runParty, runBonuses } from '../test/sim/probe/loop';
import { measureFarm } from '../test/sim/probe/combat';
import { gruntHits, measureStageBoss, GRUNT_HITS, STAGE_BOSS_SEC } from '../test/sim/probe/anchors';

const SEEDS = Array.from({ length: Math.max(1, Number(process.env.ANCHOR_SEEDS ?? 2)) }, (_, i) => i + 1);
const WORLDS = Math.min(50, Number(process.env.ANCHOR_WORLDS ?? 50));
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};
const runs = SEEDS.map((s) => newProbeRun(s, DEFAULT_CONFIG));
console.log(`anchors: a grunt ${GRUNT_HITS.min}–${GRUNT_HITS.max} hits · a stage boss ${STAGE_BOSS_SEC.min}–${STAGE_BOSS_SEC.max} s · seeds ${SEEDS.length} (medians)`);
console.log('world\tat\tlvl\thits\t(knight/ranger/priest)\tboss s\tboss minHP%\tstage clear s\twipes');
const row = (w: number, at: string, S: number): void => {
  const hs = runs.map((r) => gruntHits(runParty(r), S, DEFAULT_CONFIG.measureSeed, runBonuses(r)));
  const bs = runs.map((r) => measureStageBoss(runParty(r), S, DEFAULT_CONFIG.measureSeed, runBonuses(r)));
  const fs = runs.map((r) => measureFarm(runParty(r), S, DEFAULT_CONFIG.measureSeed, runBonuses(r), 3600));
  const cls = (c: string): string => { const v = hs.map((h) => h.byClass[c]).filter((x): x is number => x !== undefined); return v.length ? median(v).toFixed(1) : '–'; };
  console.log([w, at, median(runs.map((r) => runParty(r)[0]?.level ?? 0)), median(hs.map((h) => h.hits)).toFixed(2), `${cls('knight')}/${cls('ranger')}/${cls('priest')}`,
    bs.every((b) => b.win) ? median(bs.map((b) => b.seconds)).toFixed(1) : `>${median(bs.map((b) => b.seconds)).toFixed(0)} (lost)`, (median(bs.map((b) => b.minHpFrac)) * 100).toFixed(0),
    fs.every((f) => f.clearable) ? median(fs.map((f) => f.clearSec)).toFixed(0) : 'X', median(fs.map((f) => f.wipes))].join('\t'));
};
for (let w = 1; w <= WORLDS; w++) {
  const first = (w - 1) * 10 + 1;
  for (const r of runs) advanceProbe(r, { ...DEFAULT_CONFIG, stopAtStage: first - 1 });
  if (w > 1) row(w, 'x-1', first);
  for (const r of runs) advanceProbe(r, { ...DEFAULT_CONFIG, stopAtStage: first + 8 });
  if (runs.some((r) => r.state.frontier < first + 8)) { console.log(`world ${w}: a seed is stuck in the stages`); break; }
  row(w, 'x-9', first + 8);
}

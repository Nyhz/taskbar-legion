/**
 * The coarse measure of the final pacing pass: the probe's average player from Normal 1-1 to Torment 10-10, one
 * process per seed (run each under `taskpolicy -b`). Writes one JSON line per seed to PASS_OUT: hours per
 * difficulty, and per wall the failed attempts, the boss's fight clock at the kill, the party's gear % of the zone
 * (option C reference, test/sim/probe/zoneGear) and the wall's life as a % of the zone set's 60 s of damage.
 * Env: PASS_SEED, PASS_OUT, PASS_TO (last global stage, default 500). Test/dev tooling only.
 */
import { appendFileSync } from 'node:fs';
import { runProbe, DEFAULT_CONFIG } from '../test/sim/probe/loop';

const SEED = Number(process.env.PASS_SEED ?? 1);
const OUT = process.env.PASS_OUT ?? 'pass-measure.jsonl';
const TO = Number(process.env.PASS_TO ?? 500);
const t = Date.now();
const r = runProbe(SEED, { ...DEFAULT_CONFIG, measureGear: true, stopAtStage: TO });
const walls = r.milestones.map((m) => ({
  stage: m.stage, hours: m.hoursOnWorld, fails: m.bossFails, fight: m.bossFightSec, gear: m.gearPct, wall: m.wallPct, level: m.partyLevel, keyless: m.keylessHours,
}));
appendFileSync(OUT, JSON.stringify({ seed: SEED, completed: r.completed, stalledAt: r.stalledAtStage, hours: r.difficultyActiveHours, days: r.totalCalendarDays, fails: r.totalBossFails, walls, sec: (Date.now() - t) / 1000 }) + '\n');
process.stdout.write(`seed ${SEED}: ${r.totalActiveHours.toFixed(0)} h, frontier ${r.completed ? 'done' : r.stalledAtStage}, ${((Date.now() - t) / 1000).toFixed(0)} s\n`);

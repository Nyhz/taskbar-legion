/**
 * The parties the probe's average player has at each world-boss wall, saved to a JSON file so the build study
 * (scripts/build-study.ts) can fight the walls with the real level, talents points, tech and gear of that moment.
 * Run: `npx vite-node scripts/probe-snapshots.ts` (env: SNAP_SEED, SNAP_TO = last global stage, SNAP_OUT = file).
 *
 * For every wall it keeps the party on ARRIVAL (the first time the player stands before it) and the party at the
 * last look before the wall fell (what the player wore when it beat it). Test/dev tooling only.
 */
import { writeFileSync } from 'node:fs';
import { newProbeRun, advanceProbe, probeResult, DEFAULT_CONFIG, type ProbeConfig } from '../test/sim/probe/loop';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';

export interface WallSnapshot {
  stage: number;
  activeHours: number;
  party: HeroConfig[];
  bonuses: Bonuses;
}
export interface SnapshotFile {
  seed: number;
  arrive: Record<number, WallSnapshot>;
  last: Record<number, WallSnapshot>;
}

const SEED = Number(process.env.SNAP_SEED ?? 1);
const TO = Number(process.env.SNAP_TO ?? 500);
const OUT = process.env.SNAP_OUT ?? `snapshots-${SEED}.json`;

const file: SnapshotFile = { seed: SEED, arrive: {}, last: {} };
const run = newProbeRun(SEED);
let lastSave = 0;
const cfg: ProbeConfig = {
  ...DEFAULT_CONFIG,
  stopAtStage: TO,
  observe: (target, party, bonuses) => {
    if (target % 10 !== 0) return;
    const snap: WallSnapshot = { stage: target, activeHours: run.state.activeSec / 3600, party: structuredClone([...party]), bonuses: { ...bonuses } };
    if (file.arrive[target] === undefined) {
      file.arrive[target] = snap;
      process.stdout.write(`wall ${target} reached at ${snap.activeHours.toFixed(1)} h, levels ${party.map((h) => h.level).join('/')}\n`);
    }
    file.last[target] = snap;
    if (Date.now() - lastSave > 20_000) {
      writeFileSync(OUT, JSON.stringify(file));
      lastSave = Date.now();
    }
  },
};
advanceProbe(run, cfg);
writeFileSync(OUT, JSON.stringify(file));
const r = probeResult(run, cfg);
process.stdout.write(`done: frontier ${run.state.frontier}, ${r.totalActiveHours.toFixed(1)} active h, stalled ${r.stalledAtStage ?? 'no'}\n`);
for (const [k, v] of Object.entries(r.difficultyActiveHours)) process.stdout.write(`  ${k}: ${v.toFixed(1)} h\n`);

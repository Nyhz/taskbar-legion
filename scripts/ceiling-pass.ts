/**
 * Round 4b — one seed of the probe's average player (sensible keys, gem swaps, today's drops) from Normal 1-1 to
 * Torment 10-10, then every wall against THE GRADUAL CEILING (test/sim/probe/zoneGear gradualCeilingDamage): what it
 * asks (its life as a % of the ceiling's 60 s of damage) with the heroes on arrival, and the % of the ceiling the
 * party deals on arrival and at the kill. One JSON line per seed to CP_OUT: hours per difficulty, and per wall the
 * failed attempts, hours on it (keyless / holding a key), top-rarity pieces worn, ask and party %.
 * Env: CP_SEED, CP_OUT, CP_SNAP (also write the wall snapshots there), CP_TO (last global stage, default 500), CP_MAXSEC (wall-clock budget, default 1.5 h). Run each seed under `taskpolicy -b`. Dev tooling only.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { newProbeRun, advanceProbe, probeResult, DEFAULT_CONFIG, type ProbeConfig } from '../test/sim/probe/loop';
import { gradualCeilingDamage, wallDamage, ceilingTierRange } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { zoneBossHp } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';

const SEED = Number(process.env.CP_SEED ?? 1);
const OUT = process.env.CP_OUT ?? 'ceiling-pass.jsonl';
const TO = Number(process.env.CP_TO ?? 500);
const MAX_SEC = Number(process.env.CP_MAXSEC ?? 5400); // wall-clock budget for the probe; past it the run stops where it is
const MEASURE_SEED = 4242;

interface Snap { stage: number; activeHours: number; party: HeroConfig[]; bonuses: Bonuses }
const arrive: Record<number, Snap> = {};
const last: Record<number, Snap> = {};
const run = newProbeRun(SEED);
const t0 = Date.now();
const cfg: ProbeConfig = {
  ...DEFAULT_CONFIG,
  stopAtStage: TO,
  observe: (target, party, bonuses) => {
    if ((Date.now() - t0) / 1000 > MAX_SEC) return false;
    if (target % 10 !== 0) return;
    const snap = { stage: target, activeHours: run.state.activeSec / 3600, party: structuredClone([...party]), bonuses: { ...bonuses } };
    if (arrive[target] === undefined) arrive[target] = snap;
    last[target] = snap;
  },
};
advanceProbe(run, cfg);
const r = probeResult(run, cfg);
// The parties at every wall, in scripts/probe-snapshots.ts' format (healer-check, the difficulty-change check).
if (process.env.CP_SNAP !== undefined) writeFileSync(process.env.CP_SNAP, JSON.stringify({ seed: SEED, arrive, last }));
process.stdout.write(`seed ${SEED}: probe ${r.totalActiveHours.toFixed(0)} h in ${((Date.now() - t0) / 1000).toFixed(0)} s — measuring the ceiling\n`);

function measure(snap: Snap, S: number): { ask: number; pct: number } {
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const ceil = gradualCeilingDamage(party, S, snap.bonuses, MEASURE_SEED);
  const dealt = wallDamage(party, S, snap.bonuses, MEASURE_SEED);
  return { ask: ceil > 0 ? (100 * zoneBossHp(S)) / ceil : 0, pct: ceil > 0 ? (100 * dealt) / ceil : 0 };
}

const walls = r.milestones.map((m) => {
  const a = arrive[m.stage];
  const k = last[m.stage];
  const ma = a !== undefined ? measure(a, m.stage) : undefined;
  const mk = k !== undefined ? measure(k, m.stage) : undefined;
  const range = ceilingTierRange(m.stage);
  return {
    stage: m.stage, hours: m.hoursOnWorld, fails: m.bossFails, fight: m.bossFightSec, keyless: m.keylessHours, held: m.heldHours ?? 0,
    topPieces: m.gear.topTierPieces, meanTier: m.gear.meanTier, slots: m.gear.slots, gems: m.gear.gems, sockets: m.gear.sockets,
    ceilFrom: range.from, ceilTo: range.to,
    askArrive: ma?.ask, askKill: mk?.ask, pctArrive: ma?.pct, pctKill: mk?.pct, level: m.partyLevel,
  };
});
appendFileSync(OUT, JSON.stringify({ seed: SEED, frontier: run.state.frontier, gaveUp: run.gaveUp, completed: r.completed, stalledAt: r.stalledAtStage, hours: r.difficultyActiveHours, days: r.totalCalendarDays, fails: r.totalBossFails, walls, sec: (Date.now() - t0) / 1000 }) + '\n');
process.stdout.write(`seed ${SEED}: done, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);

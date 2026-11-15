/**
 * THE GEAR GATE (run: `npx vite-node scripts/measure-gear-gate.ts`) — how much being geared for the zone matters,
 * difficulty by difficulty (user, 2026-11-15: "los requisitos de ir equipado al nivel de la zona deben notarse más
 * cuanto más se avance por las dificultades"). The probe's average player plays the game; at marks along it — the
 * end of each difficulty and the third and sixth world inside each — a copy of the run FREEZES its gear (it keeps
 * levelling, opening chests and finding keys, but equips and sockets nothing new) and plays on for three times
 * what the next three worlds are meant to last. Reported: how many worlds the frozen party still gets through,
 * where it stops (a stage it cannot clear, or a wall it keeps losing to), the attempts it lost there, and how the
 * fight looks at that point (hits per grunt, the stage's clear time, wipes). A curve that steepens, not a rule.
 * Env: GATE_SEEDS (default 2), GATE_LAST (last mark, a global stage; default all).
 */
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, runParty, runBonuses, runActiveHours, type ProbeRun } from '../test/sim/probe/loop';
import { measureFarm } from '../test/sim/probe/combat';
import { gruntHits } from '../test/sim/probe/anchors';
import { WORLD_HOURS_TARGET } from '../test/sim/probe/targets';

const SEEDS = Array.from({ length: Math.max(1, Number(process.env.GATE_SEEDS ?? 2)) }, (_, i) => i + 1);
const NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment'];
const LAST = Number(process.env.GATE_LAST ?? 500);
const MARKS = [30, 60, 100, 130, 160, 200, 230, 260, 300, 330, 360, 400, 430, 460].filter((m) => m <= LAST);
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};
const label = (S: number): string => `${NAMES[Math.floor((S - 1) / 100)] ?? '?'} ${Math.floor(((S - 1) % 100) / 10) + 1}-${((S - 1) % 10) + 1}`;

interface Frozen {
  worlds: number; // whole worlds cleared with the gear frozen
  stoppedAt: number; // the stage it could not get past
  lostAttempts: number; // world-boss attempts lost after the mark
  hits: number; // basic hits of its hardest hitter per grunt, where it stopped
  clearSec: number; // seconds to clear the stage it stopped at (or the last one before the wall); 0 = cannot
  wipes: number; // wipes in that clear
  hours: number; // hours it was given
}

function freeze(run: ProbeRun, mark: number): Frozen {
  const c = structuredClone(run);
  const world = mark / 10; // worlds cleared so far
  const budget = 3 * ((WORLD_HOURS_TARGET[world] ?? 0) + (WORLD_HOURS_TARGET[world + 1] ?? 0) + (WORLD_HOURS_TARGET[world + 2] ?? 0));
  const fails0 = c.totalBossFails;
  advanceProbe(c, { ...DEFAULT_CONFIG, freezeGear: true, stopAtActiveSec: c.state.activeSec + budget * 3600 });
  const next = c.state.frontier + 1;
  const stage = next % 10 === 0 ? next - 1 : next; // at a wall, look at the stage before it
  const m = measureFarm(runParty(c), stage, DEFAULT_CONFIG.measureSeed, runBonuses(c));
  return {
    worlds: Math.floor(c.state.frontier / 10) - world,
    stoppedAt: next,
    lostAttempts: c.totalBossFails - fails0,
    hits: gruntHits(runParty(c), stage, DEFAULT_CONFIG.measureSeed, runBonuses(c)).hits,
    clearSec: m.clearable ? m.clearSec : 0,
    wipes: m.wipes,
    hours: budget,
  };
}

const runs = SEEDS.map((s) => newProbeRun(s, DEFAULT_CONFIG));
console.log(`the gear gate · seeds ${SEEDS.length} (medians) · a frozen party gets three times the hours of the next three worlds`);
console.log('gear frozen after\thours given\tworlds it still clears\tstops at\tattempts lost\thits per grunt there\tthat stage: seconds\twipes');
for (const mark of MARKS) {
  for (const r of runs) advanceProbe(r, { ...DEFAULT_CONFIG, stopAtStage: mark });
  if (runs.some((r) => r.state.frontier < mark)) {
    console.log(`a seed did not reach ${label(mark)} (at ${runs.map((r) => runActiveHours(r).toFixed(0)).join(' / ')} h)`);
    break;
  }
  const f = runs.map((r) => freeze(r, mark));
  const stops = f.map((x) => label(x.stoppedAt)).join(' · ');
  console.log([label(mark), median(f.map((x) => x.hours)).toFixed(0), median(f.map((x) => x.worlds)).toFixed(1), stops, median(f.map((x) => x.lostAttempts)).toFixed(0),
    median(f.map((x) => x.hits)).toFixed(1), f.every((x) => x.clearSec > 0) ? median(f.map((x) => x.clearSec)).toFixed(0) : 'cannot', median(f.map((x) => x.wipes)).toFixed(0)].join('\t'));
}

/**
 * Round 4b — one seed of the probe's average player (sensible keys, gem swaps, today's drops) from Normal 1-1 to
 * Torment 10-10, then every wall against THE GRADUAL CEILING (test/sim/probe/zoneGear gradualCeilingDamage): what it
 * asks (its life as a % of the ceiling's 60 s of damage) with the heroes on arrival, and the % of the ceiling the
 * party deals on arrival and at the kill. One JSON line per seed to CP_OUT: hours per difficulty, and per wall the
 * failed attempts, hours on it (keyless / holding a key), top-rarity pieces worn, ask and party %.
 * Env: CP_SEED, CP_OUT, CP_SNAP (also write the wall snapshots there), CP_TO (last global stage, default 500), CP_MAXSEC (wall-clock budget, default 1.5 h), CP_CHEST_MULT (× chests opened, tooling). Run each seed under `taskpolicy -b`. Dev tooling only.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { newProbeRun, advanceProbe, probeResult, DEFAULT_CONFIG, type ProbeConfig } from '../test/sim/probe/loop';
import { gradualCeilingDamage, wallDamage, ceilingTierRange } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { SURVIVAL_NEED, SCORE_CONTEXT } from '../test/sim/probe/gear';
import type { StatKey } from '@/data/stats';
import { zoneBossHp, MAX_LEVEL } from '@/data/stageScaling';
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
// Tooling (round 6 · B, the levers): CP_CHEST_MULT scales every chest the player opens (× the capture of each type), to
// measure how the hours answer to more chests an hour. The game is not changed.
const CHEST_MULT = Number(process.env.CP_CHEST_MULT ?? 1);
const cap: { first?: { stage: number; hours: number }; all?: { stage: number; hours: number } } = {};
const petsAt: Record<string, { stage: number; hours: number }> = {};
const research: Record<number, { hours: number; ranks: Record<string, number>; xpMult: number; goldMult: number; gold: number; party: number; polishGold: number; polishCount: number; kills: number; chests: number; commonOpened: number }> = {};
const cfg: ProbeConfig = {
  ...DEFAULT_CONFIG,
  capture: { normal: DEFAULT_CONFIG.capture.normal * CHEST_MULT, stageBoss: DEFAULT_CONFIG.capture.stageBoss * CHEST_MULT, zoneBoss: DEFAULT_CONFIG.capture.zoneBoss * CHEST_MULT },
  stopAtStage: TO,
  // CP_IGNORE (tooling): the player values this stat at zero and never sockets its gems (ProbeConfig.ignoreStat).
  ...(process.env.CP_IGNORE !== undefined ? { ignoreStat: process.env.CP_IGNORE as StatKey } : {}),
  // CP_PETS=median (tooling): each pet owned from when half the players would have it. CP_SYNTH=1: also buys
  // Transmuter's Fortune (synth_luck) after the default priority. Round 15, "the well-equipped player".
  ...(process.env.CP_PETS === 'median' ? { pets: 'median' as const } : {}),
  ...(process.env.CP_SYNTH === '1' ? { extraTech: ['synth_luck'] } : {}),
  // CP_SKIP (tooling, round 16): a comma list of tech nodes the player never buys — what each research is worth.
  // CP_POLISH=0 (tooling, round 17): the player never polishes.
  ...(process.env.CP_POLISH === '0' ? { polish: false } : {}),
  ...(process.env.CP_SKIP !== undefined ? { skipTech: process.env.CP_SKIP.split(',') } : {}),
  // CP_AWAY=base,perRank,maxRanks (tooling, round 17): the away share the probe banks instead of the data's.
  ...(process.env.CP_AWAY !== undefined ? { awayYield: (([base, perRank, maxRanks]) => ({ base: base ?? 0.5, perRank: perRank ?? 0.025, maxRanks: maxRanks ?? 20 }))(process.env.CP_AWAY.split(',').map(Number)) } : {}),
  observe: (target, party, bonuses) => {
    if ((Date.now() - t0) / 1000 > MAX_SEC) return false;
    if (target % 10 !== 0) return;
    const snap = { stage: target, activeHours: run.state.activeSec / 3600, party: structuredClone([...party]), bonuses: { ...bonuses } };
    if (arrive[target] === undefined) arrive[target] = snap;
    last[target] = snap;
    // Level pacing (round 15): when the first hero and the whole party reach the cap, and when each pet joined.
    const hours = run.state.activeSec / 3600;
    if (cap.first === undefined && party.some((h) => h.level >= MAX_LEVEL)) cap.first = { stage: target, hours };
    if (cap.all === undefined && party.length > 0 && party.every((h) => h.level >= MAX_LEVEL)) cap.all = { stage: target, hours };
    for (const key of Object.keys(run.state.pets)) if (petsAt[key] === undefined) petsAt[key] = { stage: target, hours };
    // The research at every wall (round 16): the ranks of every node and the multipliers.
    // Gold (round 16, user: «no quiero que tengan millones de oro sin gastar»): held at every wall (spending = the ranks'
    // prices + the recruits, worked out in the report from the ranks).
    research[target] = { hours, ranks: { ...run.state.techRanks }, xpMult: bonuses.xpMult, goldMult: bonuses.goldMult, gold: run.state.gold, party: party.length, polishGold: run.state.polishGold, polishCount: run.state.polishCount, kills: run.state.tally.kills, chests: run.state.tally.chestsFound, commonOpened: run.state.tally.normalChestsOpened };
  },
};
advanceProbe(run, cfg);
const r = probeResult(run, cfg);
// The parties at every wall, in scripts/probe-snapshots.ts' format (healer-check, the difficulty-change check).
if (process.env.CP_SNAP !== undefined) writeFileSync(process.env.CP_SNAP, JSON.stringify({ seed: SEED, arrive, last }));
process.stdout.write(`seed ${SEED}: probe ${r.totalActiveHours.toFixed(0)} h in ${((Date.now() - t0) / 1000).toFixed(0)} s — measuring the ceiling\n`);

// The ceiling set is dressed by the plain role score: the life the probe's heroes learned to ask for at the walls
// (gear.SURVIVAL_NEED, end-of-run values by now) is the probe player's habit, not part of the ceiling.
SURVIVAL_NEED.clear();
SCORE_CONTEXT.ignoreStat = undefined;

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
    stage: m.stage, hours: m.hoursOnWorld, toWall: m.toWallHours, fails: m.bossFails, fight: m.bossFightSec, keyless: m.keylessHours, held: m.heldHours ?? 0,
    topPieces: m.gear.topTierPieces, meanTier: m.gear.meanTier, slots: m.gear.slots, gems: m.gear.gems, sockets: m.gear.sockets,
    ceilFrom: range.from, ceilTo: range.to,
    askArrive: ma?.ask, askKill: mk?.ask, pctArrive: ma?.pct, pctKill: mk?.pct, level: m.partyLevel, cube: m.cube,
  };
});
appendFileSync(OUT, JSON.stringify({ seed: SEED, frontier: run.state.frontier, gaveUp: run.gaveUp, completed: r.completed, stalledAt: r.stalledAtStage, hours: r.difficultyActiveHours, days: r.totalCalendarDays, fails: r.totalBossFails, walls, cap, pets: petsAt, research, synthLuck: run.state.techRanks.synth_luck ?? 0, sec: (Date.now() - t0) / 1000 }) + '\n');
process.stdout.write(`seed ${SEED}: done, ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);

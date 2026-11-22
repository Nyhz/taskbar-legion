/**
 * Round 4 — the walls against "el techo realista" (test/sim/probe/zoneGear zoneCeilingSet). For every wall of a
 * snapshot file (scripts/probe-snapshots.ts) one JSON line: what the wall asks (its life as a % of the ceiling set's
 * 60 s of damage) with the heroes on arrival and at the kill, and the gear % of the ceiling the probe's party wears on
 * arrival and at the kill. Env: STUDY_SNAP, CM_OUT, CM_SHARD=i/N, CM_STAGES=comma list (run under `taskpolicy -b`).
 * Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { ceilingDamage, wallDamage, topTierAt } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { zoneBossHp } from '@/sim/enemyScale';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? 'snapshots.json', 'utf8')) as SnapshotFile;
const OUT = process.env.CM_OUT ?? 'ceiling-measure.jsonl';
const [shard, of] = (process.env.CM_SHARD ?? '0/1').split('/').map(Number);
const only = process.env.CM_STAGES?.split(',').map(Number);
const SEED = 4242;

function measure(snap: WallSnapshot, S: number): { ask: number; pct: number; ceil: number; dealt: number } {
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const ceil = ceilingDamage(party, S, snap.bonuses, SEED);
  const dealt = wallDamage(party, S, snap.bonuses, SEED);
  return { ask: ceil > 0 ? (100 * zoneBossHp(S)) / ceil : 0, pct: ceil > 0 ? (100 * dealt) / ceil : 0, ceil, dealt };
}

Object.keys(file.last).map(Number).sort((a, b) => a - b).forEach((S, idx) => {
  if (only !== undefined && !only.includes(S)) return;
  if (idx % (of ?? 1) !== (shard ?? 0)) return;
  const arrive = file.arrive[S];
  const last = file.last[S];
  if (arrive === undefined || last === undefined) return;
  const a = measure(arrive, S);
  const k = measure(last, S);
  const row = {
    seed: file.seed, stage: S, top: topTierAt(S - 1), hp: zoneBossHp(S),
    askArrive: a.ask, askKill: k.ask, pctArrive: a.pct, pctKill: k.pct,
    hArrive: arrive.activeHours, hKill: last.activeHours,
    lvlArrive: arrive.party.map((h) => h.level), lvlKill: last.party.map((h) => h.level),
  };
  appendFileSync(OUT, JSON.stringify(row) + '\n');
  process.stdout.write(`${S}: ask ${a.ask.toFixed(0)}/${k.ask.toFixed(0)} % · party ${a.pct.toFixed(0)} → ${k.pct.toFixed(0)} %\n`);
});

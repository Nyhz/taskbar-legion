/**
 * Round 4e — what each wall asks, as a % of the gradual ceiling, from saved wall snapshots (scripts/ceiling-pass.ts
 * CP_SNAP): the wall's life over the ceiling's 60 s of damage with the heroes on arrival, and the party's own % on
 * arrival and at its last look. One JSON line per wall to WA_OUT. Env: SNAPS (comma list), WA_OUT. Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { gradualCeilingDamage, wallDamage } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { SURVIVAL_NEED } from '../test/sim/probe/gear';
import { zoneBossHp } from '@/data/stageScaling';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';

SURVIVAL_NEED.clear();
const OUT = process.env.WA_OUT ?? 'wall-ask.jsonl';
const measure = (snap: WallSnapshot, S: number): { ask: number; pct: number } => {
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const ceil = gradualCeilingDamage(party, S, snap.bonuses, 4242);
  return { ask: ceil > 0 ? (100 * zoneBossHp(S)) / ceil : 0, pct: ceil > 0 ? (100 * wallDamage(party, S, snap.bonuses, 4242)) / ceil : 0 };
};
for (const f of (process.env.SNAPS ?? '').split(',').filter((x) => x.length > 0)) {
  const file = JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile;
  for (const S of Object.keys(file.arrive).map(Number).sort((a, b) => a - b)) {
    const a = file.arrive[S];
    const k = file.last[S];
    if (a === undefined || k === undefined || S % 10 !== 0) continue;
    const ma = measure(a, S);
    const mk = measure(k, S);
    appendFileSync(OUT, JSON.stringify({ seed: file.seed, stage: S, askArrive: ma.ask, pctArrive: ma.pct, pctKill: mk.pct, level: a.party[0]?.level }) + '\n');
  }
}

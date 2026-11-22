/**
 * Which "100 % of the zone" makes the wall ladder true? For each wall of a snapshot file (the probe's party when it
 * beat the wall), the wall's life as a % of the zone set's 60 s of damage, for several definitions of the zone set:
 * the literal mode of the world's drops without gems, and quantiles 0.9 / 0.95 / 0.97 / 0.99 with gems.
 * Env: STUDY_SNAP, VQ_OUT, VQ_SHARD=i/N (run each under `taskpolicy -b`). Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { setZoneReference, zoneSetDamage } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { zoneBossHp } from '@/sim/enemyScale';
import type { SnapshotFile } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? 'snapshots.json', 'utf8')) as SnapshotFile;
const OUT = process.env.VQ_OUT ?? 'vara-quantiles.jsonl';
const [shard, of] = (process.env.VQ_SHARD ?? '0/1').split('/').map(Number);
const DEFS: [string, number | undefined, boolean][] = [['mode', undefined, false], ['q90', 0.9, true], ['q95', 0.95, true], ['q97', 0.97, true], ['q99', 0.99, true]];
Object.keys(file.last).map(Number).sort((a, b) => a - b).forEach((S, idx) => {
  if (idx % (of ?? 1) !== (shard ?? 0)) return;
  const snap = file.last[S];
  if (snap === undefined) return;
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const row: Record<string, number> = { stage: S };
  for (const [name, q, gems] of DEFS) {
    setZoneReference(q, gems);
    const ref = zoneSetDamage(party, S, snap.bonuses, 4242);
    row[name] = ref > 0 ? (100 * zoneBossHp(S)) / ref : 0;
  }
  appendFileSync(OUT, JSON.stringify(row) + '\n');
});

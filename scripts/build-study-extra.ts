/**
 * Two follow-ups to scripts/build-study.ts, from its results: (1) the gear % of the zone of each wall's snapshot
 * party, measured with the corrected zone-gear measure (zoneGear.wallDamage: the boss's real life, topped up), on
 * arrival and at the kill; (2) the farm: one clear of a few stages with the default, the wall's optimal and a few
 * random builds. Run: `npx vite-node scripts/build-study-extra.ts` (STUDY_SNAP, STUDY_RESULTS). Test/dev only.
 */
import { readFileSync } from 'node:fs';
import { gearPercent } from '../test/sim/probe/zoneGear';
import { measureFarm } from '../test/sim/probe/combat';
import { parseBuildLabel, partyWithBuild, randomPartyBuild, PROBE_DEFAULT_BUILD, type PartyBuild } from '../test/sim/probe/builds';
import type { SnapshotFile } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? 'snapshots-1.json', 'utf8')) as SnapshotFile;
const results = readFileSync(process.env.STUDY_RESULTS ?? 'build-study.jsonl', 'utf8').split('\n').filter(Boolean)
  .map((l) => JSON.parse(l) as { stage?: number; optimal?: Record<string, string> }).filter((r) => r.stage !== undefined);
const mode = process.env.EXTRA_MODE ?? 'gear';

if (mode === 'gear') {
  for (const r of results) {
    const S = r.stage ?? 0;
    const out: string[] = [];
    for (const which of ['arrive', 'last'] as const) {
      const snap = file[which][S];
      if (snap === undefined) continue;
      out.push(`${which} ${gearPercent(partyWithBuild(snap.party, PROBE_DEFAULT_BUILD), S, snap.bonuses, 4242).toFixed(0)}%`);
    }
    process.stdout.write(`${S}\t${out.join('\t')}\n`);
  }
} else {
  for (const S of [95, 145, 195, 245, 295, 345, 395, 445, 495]) {
    const wall = S + 5;
    const snap = file.arrive[wall];
    const r = results.find((x) => x.stage === wall);
    if (snap === undefined) continue;
    const opt: Record<string, ReturnType<typeof parseBuildLabel>> = {};
    for (const [c, l] of Object.entries(r?.optimal ?? {})) opt[c] = parseBuildLabel(c, l);
    const classes = snap.party.map((h) => h.classKey);
    const clear = (b: PartyBuild, seed: number): number => measureFarm(partyWithBuild(snap.party, b), S, seed, snap.bonuses, 3600, seed).clearSec;
    const mean = (f: (i: number) => number, n: number): number => { let t = 0; for (let i = 0; i < n; i++) t += f(i); return t / n; };
    const d = mean((i) => clear(PROBE_DEFAULT_BUILD, 31 + i), 4);
    const o = r === undefined ? NaN : mean((i) => clear(opt, 31 + i), 4);
    const rnd = mean((i) => clear(randomPartyBuild(classes, 77 + i), 31 + i), 8);
    process.stdout.write(`farm ${S}\tdefault ${d.toFixed(0)} s\toptimal-of-wall ${o.toFixed(0)} s\trandom ${rnd.toFixed(0)} s\n`);
  }
}

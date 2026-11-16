/**
 * The difficulty-change rule (user, 2026-11-16): the gear a party ends a difficulty with should beat one or two walls
 * of the next one. For each snapshot file (scripts/ceiling-pass.ts CP_SNAP or scripts/probe-snapshots.ts) and each
 * difficulty change, the party as it stood at the last wall of the old difficulty (its last look before the kill) fights
 * the first walls of the new one, in its build for there, over CHECK_SEEDS combat seeds: the win rate per wall.
 * Env: SNAPS (comma list of files), CHECK_SEEDS (8), CHECK_WALLS (3). Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync } from 'node:fs';
import { measureBoss } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import type { SnapshotFile } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0);
const SEEDS = Number(process.env.CHECK_SEEDS ?? 8);
const WALLS = Number(process.env.CHECK_WALLS ?? 3);
const NAMES = ['Normal', 'Infierno', 'Averno', 'Eterno', 'Tormento'];

for (const f of files) {
  const file = JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile;
  for (let d = 1; d < 5; d++) {
    const end = file.last[d * 100];
    if (end === undefined) continue;
    const cells: string[] = [];
    for (let w = 1; w <= WALLS; w++) {
      const S = d * 100 + w * 10;
      const party = partyWithBuild(end.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
      let wins = 0;
      let fight = 0;
      for (let i = 0; i < SEEDS; i++) {
        const r = measureBoss(party, S, 7_000_000 + S * 100 + i, end.bonuses, 300, 7_000_000 + S * 100 + i);
        if (r.win) wins++;
        fight += r.fightSec;
      }
      cells.push(`${NAMES[d]} ${w}: ${wins}/${SEEDS} (${(fight / SEEDS).toFixed(0)} s)`);
    }
    process.stdout.write(`seed ${file.seed} · end of ${NAMES[d - 1]} → ${cells.join(' · ')}\n`);
  }
}

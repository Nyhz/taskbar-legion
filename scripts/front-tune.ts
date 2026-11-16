/**
 * Round 5 — how hard must a boss lean on the front hero for a Knight's defences to decide a wall? For sample walls of
 * a snapshot file, the party in its build (from Inferno PROBE_GOOD_BUILD: Debilitating Cleave + Battle Cry) and the
 * same with a Knight who carries no defence (Battle Cry + Bloodlust), each over CHECK_SEEDS combat seeds, with the
 * front pressure of data/bossKit BOSS_FRONT_PRESSURE scaled by each factor of FACTORS (from Inferno on).
 * Env: STUDY_SNAP, CHECK_WALLS, CHECK_SEEDS (8), FACTORS (comma list), FT_OUT. Run under `taskpolicy -b`. Dev tooling.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { measureBoss } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_GOOD_BUILD, type ClassBuild } from '../test/sim/probe/builds';
import { BOSS_FRONT_PRESSURE } from '@/data/bossKit';
import type { SnapshotFile } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? '', 'utf8')) as SnapshotFile;
const WALLS = (process.env.CHECK_WALLS ?? '250,280,350,380,450,480').split(',').map(Number);
const SEEDS = Number(process.env.CHECK_SEEDS ?? 8);
const FACTORS = (process.env.FACTORS ?? '1,2,3').split(',').map(Number);
const OUT = process.env.FT_OUT ?? 'front-tune.jsonl';
const KNIGHT_OFF: ClassBuild = { abilities: ['knight_battlecry', 'knight_bloodlust'], branch: 'scourge' };
const base = { stage: [...BOSS_FRONT_PRESSURE.stage], world: [...BOSS_FRONT_PRESSURE.world] };
const table = BOSS_FRONT_PRESSURE as unknown as { stage: number[]; world: number[] };

for (const f of FACTORS) {
  for (let d = 2; d < 5; d++) {
    table.world[d] = (base.world[d] ?? 1) * f;
    table.stage[d] = (base.stage[d] ?? 1) * f;
  }
  for (const S of WALLS) {
    const snap = file.last[S];
    if (snap === undefined) continue;
    const rate = (p: ReturnType<typeof partyWithBuild>): number => {
      let w = 0;
      for (let i = 0; i < SEEDS; i++) if (measureBoss(p, S, 6_000_000 + S * 100 + i, snap.bonuses, 300, 6_000_000 + S * 100 + i).win) w++;
      return w / SEEDS;
    };
    const own = rate(partyWithBuild(snap.party, PROBE_GOOD_BUILD));
    const off = rate(partyWithBuild(snap.party, { ...PROBE_GOOD_BUILD, knight: KNIGHT_OFF }));
    appendFileSync(OUT, JSON.stringify({ factor: f, stage: S, own, off }) + '\n');
    process.stdout.write(`×${f} ${S}: own ${own} · off ${off}\n`);
  }
}

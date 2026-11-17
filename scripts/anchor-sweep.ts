/**
 * Round 6 — the boss-hit anchor against the game's rules. For sample walls of a snapshot file, the world boss's hit
 * table (data/stageScaling ZONE_BOSS_HIT_TUNE) scaled by each factor of FACTORS: the win rate over CHECK_SEEDS combat
 * seeds of the party in its build (from Inferno PROBE_GOOD_BUILD: Debilitating Cleave + Battle Cry), of the same with a
 * Knight who carries no defence (Battle Cry + Bloodlust), and of the same with a Priest who carries no heal (Holy Nova
 * + Holy Shield); and the lowest life the Knight reaches in its own build.
 * Env: STUDY_SNAP, CHECK_WALLS, CHECK_SEEDS (8), FACTORS (comma list), AS_OUT. Run under `taskpolicy -b`. Dev tooling.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { measureBoss } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD, type ClassBuild, type PartyBuild } from '../test/sim/probe/builds';
import { ZONE_BOSS_HIT_TUNE } from '@/data/stageScaling';
import type { SnapshotFile } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? '', 'utf8')) as SnapshotFile;
const WALLS = (process.env.CHECK_WALLS ?? '130,180,250,280,350,450,480').split(',').map(Number);
const SEEDS = Number(process.env.CHECK_SEEDS ?? 8);
const FACTORS = (process.env.FACTORS ?? '1').split(',').map(Number);
const OUT = process.env.AS_OUT ?? 'anchor-sweep.jsonl';
const KNIGHT_OFF: ClassBuild = { abilities: ['knight_battlecry', 'knight_bloodlust'], branch: 'scourge' };
const PRIEST_DPS: ClassBuild = { abilities: ['priest_nova'], branch: 'zeal', exact: true, avoid: ['priest_mod_radiant_nova'] }; // no heal-equivalent (round 11)
const base = [...ZONE_BOSS_HIT_TUNE];

for (const f of FACTORS) {
  base.forEach((v, i) => { ZONE_BOSS_HIT_TUNE[i] = v * f; });
  for (const S of WALLS) {
    const snap = file.last[S];
    if (snap === undefined) continue;
    const own: PartyBuild = S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD;
    const rate = (b: PartyBuild): { win: number; knightMin: number } => {
      let w = 0;
      let low = 1;
      for (let i = 0; i < SEEDS; i++) {
        const r = measureBoss(partyWithBuild(snap.party, b), S, 6_100_000 + S * 100 + i, snap.bonuses, 300, 6_100_000 + S * 100 + i);
        if (r.win) w++;
        if (r.deathSec?.knight !== undefined) low = 0;
        else low = Math.min(low, r.minHpFrac);
      }
      return { win: w / SEEDS, knightMin: low };
    };
    const a = rate(own);
    const off = rate({ ...own, knight: KNIGHT_OFF });
    const dps = rate({ ...own, priest: PRIEST_DPS });
    appendFileSync(OUT, JSON.stringify({ factor: f, stage: S, own: a.win, off: off.win, noHeal: dps.win, knightDied: a.knightMin === 0, offKnightDied: off.knightMin === 0 }) + '\n');
    process.stdout.write(`×${f} ${S}: own ${a.win} · knight off ${off.win} · priest no heals ${dps.win}\n`);
  }
}

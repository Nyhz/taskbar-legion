/**
 * The game rules at the walls, in REAL fights with the walls as they are: for each wall of a snapshot file
 * (scripts/probe-snapshots.ts, the probe's party when it beat the wall), the win rate of
 *   - the party in its own build (Normal–Hell: the default; from Inferno: PROBE_GOOD_BUILD),
 *   - the same with a Priest who carries no heal (Holy Nova + Holy Shield) — at its gear and at ≥150 % of the zone,
 *   - the same with a Knight who carries no defence (Battle Cry + Bloodlust), and its wall margin against the
 *     defensive Knight (largest life multiple beaten in 75 % of the seeds).
 * Env: STUDY_SNAP, CHECK_WALLS, CHECK_SEEDS (8), CHECK_OUT, CHECK_JOBS (5); workers CHECK_SHARD=i/N. Dev tooling.
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { measureBoss } from '../test/sim/probe/combat';
import { gearPercent, withZoneChests } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD, type ClassBuild, type PartyBuild } from '../test/sim/probe/builds';
import { ZONE_BOSS_HP_OVERRIDE, worldOf } from '@/data/stageScaling';
import { zoneBossHp } from '@/sim/enemyScale';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';
import type { HeroConfig } from '@/sim/loadout';

const SNAP = process.env.STUDY_SNAP ?? 'snapshots-1.json';
const OUT = process.env.CHECK_OUT ?? 'healer-check.jsonl';
const SEEDS = Number(process.env.CHECK_SEEDS ?? 8);
const JOBS = Number(process.env.CHECK_JOBS ?? 5);
const PRIEST_DPS: ClassBuild = { abilities: ['priest_nova'], branch: 'zeal', exact: true, avoid: ['priest_mod_radiant_nova'] }; // no heal-equivalent (round 11)
const KNIGHT_OFF: ClassBuild = { abilities: ['knight_battlecry', 'knight_bloodlust'], branch: 'scourge' };

function rate(party: readonly HeroConfig[], snap: WallSnapshot, b: PartyBuild, m = 1): number {
  const W = worldOf(snap.stage);
  const pinned = ZONE_BOSS_HP_OVERRIDE[W];
  delete ZONE_BOSS_HP_OVERRIDE[W];
  const base = zoneBossHp(snap.stage);
  ZONE_BOSS_HP_OVERRIDE[W] = base * m;
  try {
    let w = 0;
    for (let i = 0; i < SEEDS; i++) if (measureBoss(partyWithBuild(party, b), snap.stage, 9_000_000 + snap.stage * 100 + i, snap.bonuses, 300, 9_000_000 + snap.stage * 100 + i).win) w++;
    return w / SEEDS;
  } finally {
    if (pinned === undefined) delete ZONE_BOSS_HP_OVERRIDE[W];
    else ZONE_BOSS_HP_OVERRIDE[W] = pinned;
  }
}

function margin(party: readonly HeroConfig[], snap: WallSnapshot, b: PartyBuild): number {
  let lo = 1 / 8;
  let hi = 8;
  if (rate(party, snap, b) >= 0.75) lo = 1;
  else hi = 1;
  for (let k = 0; k < 5; k++) {
    const mid = Math.sqrt(lo * hi);
    if (rate(party, snap, b, mid) >= 0.75) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

function over150(snap: WallSnapshot, own: PartyBuild): { party: HeroConfig[]; pct: number } {
  const base = partyWithBuild(snap.party, own);
  const pctOf = (p: HeroConfig[]): number => gearPercent(partyWithBuild(p, PROBE_DEFAULT_BUILD), snap.stage, snap.bonuses, 960 + snap.stage);
  let best = { party: base, pct: pctOf(base) };
  if (best.pct >= 150) return best;
  for (const k of [0, 10, 20, 30, 40, 60, 80, 100]) {
    for (const c of [60, 240]) {
      const p = withZoneChests(base, Math.min(500, Math.ceil((snap.stage + k) / 10) * 10), snap.bonuses, c, 90_210 + 31 * k + c);
      const pct = pctOf(p);
      if (pct > best.pct) best = { party: p, pct };
      if (pct >= 150) return best;
    }
  }
  return best;
}

function wall(snap: WallSnapshot): Record<string, unknown> {
  const own: PartyBuild = snap.stage > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD;
  const dps: PartyBuild = { ...own, priest: PRIEST_DPS };
  const off: PartyBuild = { ...own, knight: KNIGHT_OFF };
  const o = over150(snap, own);
  const res: Record<string, unknown> = {
    stage: snap.stage,
    own: rate(snap.party, snap, own),
    dps: rate(snap.party, snap, dps),
    over: o.pct,
    ownOver: rate(o.party, snap, own),
    dpsOver: rate(o.party, snap, dps),
  };
  if (snap.stage > 200) {
    res.off = rate(snap.party, snap, off);
    res.marginOwn = margin(snap.party, snap, own);
    res.marginOff = margin(snap.party, snap, off);
  }
  return res;
}

const shard = process.env.CHECK_SHARD;
if (shard !== undefined) {
  const [i, n] = shard.split('/').map(Number);
  const file = JSON.parse(readFileSync(SNAP, 'utf8')) as SnapshotFile;
  const walls = (process.env.CHECK_WALLS ?? Object.keys(file.last).join(',')).split(',').map(Number);
  walls.forEach((S, idx) => {
    if (idx % (n ?? 1) !== (i ?? 0)) return;
    const snap = file.last[S];
    if (snap !== undefined) appendFileSync(OUT, JSON.stringify(wall(snap)) + '\n');
  });
} else {
  writeFileSync(OUT, '');
  let left = JOBS;
  for (let i = 0; i < JOBS; i++) {
    spawn('taskpolicy', ['-b', 'npx', 'vite-node', 'scripts/healer-check.ts'], { env: { ...process.env, CHECK_SHARD: `${i}/${JOBS}` }, stdio: ['ignore', 'inherit', 'inherit'] })
      .on('exit', () => { left -= 1; if (left === 0) process.stdout.write('all workers done\n'); });
  }
}

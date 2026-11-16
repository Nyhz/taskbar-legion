/**
 * Round 6 — how much a Priest can heal her tank a second, as a % of his life, when he is pressed hard: the world boss's
 * front hit (data/stageScaling ZONE_BOSS_HIT_TUNE) scaled by FACTOR so the Knight goes down, and the heals he received
 * per second until he fell (or the fight ended) over his maximum life. Sample walls of a snapshot file, its party in
 * its build. Env: STUDY_SNAP, CHECK_WALLS, FACTOR (8), CHECK_SEEDS (3). Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync } from 'node:fs';
import { createWorld, Simulation, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildParty } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { ZONE_BOSS_HIT_TUNE, worldOf } from '@/data/stageScaling';
import type { SnapshotFile } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? '', 'utf8')) as SnapshotFile;
const WALLS = (process.env.CHECK_WALLS ?? '130,180,250,280,350,450,480').split(',').map(Number);
const FACTOR = Number(process.env.FACTOR ?? 8);
const SEEDS = Number(process.env.CHECK_SEEDS ?? 3);
ZONE_BOSS_HIT_TUNE.forEach((v, i) => { ZONE_BOSS_HIT_TUNE[i] = v * FACTOR; });

for (const S of WALLS) {
  const snap = file.last[S];
  if (snap === undefined) continue;
  const caps: number[] = [];
  for (let i = 0; i < SEEDS; i++) {
    const world = createWorld(5_000 + S * 10 + i, buildParty(partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD)));
    world.maxClearedStage = S - 1;
    world.globalStageIndex = S - 1;
    const sim = new Simulation(world);
    sim.enterZoneBoss(worldOf(S));
    const ctx: TickContext = { bonuses: snap.bonuses, ownedPetKeys: [], retryStage: true };
    const knight = world.heroes.find((h) => h.classKey === 'knight');
    if (knight === undefined) continue;
    let healed = 0;
    let fightMs = 0;
    for (let ms = 0; ms < 90_000; ms += TICK_MS) {
      for (const ev of sim.tick(ctx)) if (ev.type === 'heal' && ev.targetId === knight.id) healed += ev.amount ?? 0;
      const boss = world.enemies.find((e) => e.isBoss === true);
      if ((boss?.fightMs ?? 0) > 0) fightMs += TICK_MS;
      if (!knight.alive || boss === undefined || !boss.alive) break;
    }
    caps.push((100 * healed) / Math.max(1, fightMs / 1000) / knight.maxHp);
  }
  caps.sort((a, b) => a - b);
  process.stdout.write(`${S}: heals on the Knight ${caps.map((c) => c.toFixed(1)).join(' / ')} % of his life a second\n`);
}

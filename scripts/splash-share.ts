/**
 * Round 8 — what the world boss's area blow takes off each hero BEHIND the front one today, as a share of his life per
 * blow (the splash, after his own armour / magic resist), at each wall of snapshot files (the probe's party as it stood
 * at its last look at the wall). Median per wall over the files and a couple of combat seeds. Prints one line per wall.
 * Env: SNAPS (comma list), CHECK_WALLS (comma list; default every wall from Inferno), SEEDS (2). Dev tooling only.
 */
import { readFileSync } from 'node:fs';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildParty } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { worldOf } from '@/data/stageScaling';
import { worldBossAbilityKeys } from '@/data/abilities';
import type { SnapshotFile } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0).map((f) => JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile);
const WALLS = (process.env.CHECK_WALLS ?? Array.from({ length: 30 }, (_, i) => 210 + i * 10).join(',')).split(',').map(Number);
const SEEDS = Number(process.env.SEEDS ?? 2);
const BLOW = new Set(worldBossAbilityKeys());
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length === 0 ? NaN : s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2; };

for (const S of WALLS) {
  const shares: number[] = [];
  for (const f of files) {
    const snap = f.last[S];
    if (snap === undefined) continue;
    const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
    for (let i = 0; i < SEEDS; i++) {
      const seed = 9_100_000 + S * 10 + i;
      const world = createWorld(seed, buildParty(party));
      world.maxClearedStage = S - 1;
      world.globalStageIndex = S - 1;
      const sim = new Simulation(world);
      if (!sim.enterZoneBoss(worldOf(S))) continue;
      const ctx: TickContext = { bonuses: snap.bonuses, ownedPetKeys: [], retryStage: true };
      const knight = world.heroes.find((h) => h.classKey === 'knight');
      for (let t = 0; t < 70_000 / TICK_MS; t++) {
        for (const ev of sim.tick(ctx)) {
          if (ev.type !== 'damage' || ev.splash !== true || ev.abilityKey === undefined || !BLOW.has(ev.abilityKey)) continue;
          const h = world.heroes.find((x) => x.id === ev.targetId);
          if (h === undefined || h === knight || h.maxHp <= 0) continue;
          shares.push((ev.amount ?? 0) / h.maxHp);
        }
        if (world.phase !== 'zoneBoss') break;
      }
    }
  }
  process.stdout.write(`${S}\t${(100 * median(shares)).toFixed(1)}\t${shares.length}\n`);
}

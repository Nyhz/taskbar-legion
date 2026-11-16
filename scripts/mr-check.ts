/**
 * Round 5 — what magic resist is worth now that every boss hits with a fixed physical/magic mix and every support
 * enchants its wave's weapons. For sample walls of a snapshot file (scripts/ceiling-pass.ts CP_SNAP), the party as it
 * stood at its last look at the wall, with its gear as it is and with every magic-resist roll taken off its gear
 * (base affixes and substats; a Diamond, which gives armour too, stays): the wall's win rate over CHECK_SEEDS combat
 * seeds, and the farm of the world's X-9 (clear time, wipes) over FARM_SEEDS seeds.
 * Env: SNAPS (comma list), CHECK_WALLS (comma list of global stages), CHECK_SEEDS (8), FARM_SEEDS (2), MR_OUT.
 * Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { measureBoss, measureFarm } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { bossMagicShare } from '@/data/bossKit';
import type { HeroConfig } from '@/sim/loadout';
import type { ItemInstance } from '@/sim/items';
import type { SnapshotFile } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0);
const WALLS = (process.env.CHECK_WALLS ?? '150,250,350,450').split(',').map(Number);
const SEEDS = Number(process.env.CHECK_SEEDS ?? 8);
const FARM_SEEDS = Number(process.env.FARM_SEEDS ?? 2);
const OUT = process.env.MR_OUT ?? 'mr-check.jsonl';

function withoutMr(party: readonly HeroConfig[]): HeroConfig[] {
  const strip = (it: ItemInstance): ItemInstance => ({
    ...it,
    baseAffix: it.baseAffix.filter((a) => a.key !== 'magicResist'),
    stats: it.stats.filter((a) => a.key !== 'magicResist'),
  });
  return party.map((h) => ({
    ...h,
    equipment: Object.fromEntries(Object.entries(h.equipment).map(([slot, it]) => [slot, it === undefined ? it : strip(it)])),
  }));
}

for (const f of files) {
  const file = JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile;
  for (const S of WALLS) {
    const snap = file.last[S];
    if (snap === undefined) continue;
    const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
    const bare = withoutMr(party);
    const wins = (p: HeroConfig[]): number => {
      let w = 0;
      for (let i = 0; i < SEEDS; i++) if (measureBoss(p, S, 8_000_000 + S * 100 + i, snap.bonuses, 300, 8_000_000 + S * 100 + i).win) w++;
      return w / SEEDS;
    };
    const farm = (p: HeroConfig[]): { sec: number; wipes: number; cleared: number } => {
      let sec = 0;
      let wipes = 0;
      let cleared = 0;
      for (let i = 0; i < FARM_SEEDS; i++) {
        const r = measureFarm(p, S - 1, 8_500_000 + S * 100 + i, snap.bonuses, 1800, 8_500_000 + S * 100 + i);
        sec += r.clearSec;
        wipes += r.wipes;
        if (r.clearable) cleared++;
      }
      return { sec: sec / FARM_SEEDS, wipes: wipes / FARM_SEEDS, cleared };
    };
    const line = { seed: file.seed, stage: S, magicShare: bossMagicShare(S, 'world'), win: wins(party), winNoMr: wins(bare), farm: farm(party), farmNoMr: farm(bare) };
    appendFileSync(OUT, JSON.stringify(line) + '\n');
    process.stdout.write(`${S}: win ${line.win} → ${line.winNoMr}; farm ${line.farm.sec.toFixed(0)} s / ${line.farm.wipes} wipes → ${line.farmNoMr.sec.toFixed(0)} s / ${line.farmNoMr.wipes}\n`);
  }
}

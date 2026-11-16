/**
 * Round 4d — what the probe's average player finds and keeps while it farms a world (test/sim/probe/loop lootWatch).
 * One seed from Normal 1-1 until it ends or stalls; per world: chests opened, items by rarity, the world's top rarity
 * dropped / equipped / passed over, the item level of what drops against the ceiling's, top-rarity gems dropped and
 * socketed. For the walls in FA_WALLS it also keeps the last FA_SAMPLE top-rarity pieces the party passed over (with
 * the party as it stood) and fights the wall with each one put on — as dropped (empty sockets) and with the gems of the
 * piece it replaces moved over — to see whether the probe's equip rule (heroScore) turns down real upgrades.
 * Env: FA_SEED, FA_OUT, FA_WALLS, FA_SAMPLE (12), FA_MAXSEC. Run under `taskpolicy -b`. Dev tooling only.
 */
import { appendFileSync } from 'node:fs';
import { newProbeRun, advanceProbe, DEFAULT_CONFIG, lootWatch, type ProbeConfig } from '../test/sim/probe/loop';
import { wallDamage, topTierAt } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { worldBossStageOf } from '@/data/difficulties';
import { expectedLevel } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { ItemInstance } from '@/sim/items';
import type { Bonuses } from '@/sim/bonuses';

const SEED = Number(process.env.FA_SEED ?? 1);
const OUT = process.env.FA_OUT ?? 'farm-audit.jsonl';
const WALLS = (process.env.FA_WALLS ?? '250,330,380,440,450,480').split(',').map(Number);
const SAMPLE = Number(process.env.FA_SAMPLE ?? 12);
const MAX_SEC = Number(process.env.FA_MAXSEC ?? 5400);

interface WorldTally {
  chests: Record<string, number>; tiers: number[]; ilvlSum: number; ilvlN: number; ilvlAtCeil: number;
  top: number; topEquipped: number; second: number; secondEquipped: number; gemsTop: number; gemsTopSocketed: number; gemsAll: number;
}
const worlds: Record<number, WorldTally> = {};
interface Rejected { item: ItemInstance; party: HeroConfig[]; bonuses?: Bonuses }
const rejected: Record<number, Rejected[]> = {};
let lastBonuses: Bonuses | undefined;

const equippedIds = (party: readonly HeroConfig[]): Set<string> => new Set(party.flatMap((h) => Object.values(h.equipment).map((i) => i?.id ?? '')));
const socketedGems = (party: readonly HeroConfig[]): Set<unknown> => new Set(party.flatMap((h) => Object.values(h.equipment).flatMap((i) => (i?.sockets ?? []).map((s) => s.gem))));

lootWatch.fn = (dropStage, type, loot, party) => {
  const wall = worldBossStageOf(dropStage);
  const top = topTierAt(dropStage);
  const t = (worlds[wall] ??= { chests: {}, tiers: Array(9).fill(0), ilvlSum: 0, ilvlN: 0, ilvlAtCeil: expectedLevel(dropStage), top: 0, topEquipped: 0, second: 0, secondEquipped: 0, gemsTop: 0, gemsTopSocketed: 0, gemsAll: 0 });
  t.chests[type] = (t.chests[type] ?? 0) + loot.items.length;
  const worn = equippedIds(party);
  for (const it of loot.items) {
    t.tiers[it.tier] = (t.tiers[it.tier] ?? 0) + 1;
    t.ilvlSum += it.ilvl;
    t.ilvlN += 1;
    if (it.tier === top) {
      t.top += 1;
      if (worn.has(it.id)) t.topEquipped += 1;
      else if (WALLS.includes(wall)) {
        const list = (rejected[wall] ??= []);
        list.push({ item: it, party: structuredClone([...party]), bonuses: lastBonuses });
        if (list.length > SAMPLE) list.shift();
      }
    } else if (it.tier === top - 1) {
      t.second += 1;
      if (worn.has(it.id)) t.secondEquipped += 1;
    }
  }
  const set = socketedGems(party);
  for (const g of loot.gems) {
    t.gemsAll += 1;
    if (g.tier === Math.max(1, top)) {
      t.gemsTop += 1;
      if (set.has(g)) t.gemsTopSocketed += 1;
    }
  }
};

const t0 = Date.now();
const run = newProbeRun(SEED);
const cfg: ProbeConfig = {
  ...DEFAULT_CONFIG,
  observe: (_target, _party, bonuses) => {
    lastBonuses = bonuses;
    return (Date.now() - t0) / 1000 <= MAX_SEC;
  },
};
advanceProbe(run, cfg);
process.stdout.write(`seed ${SEED}: frontier ${run.state.frontier}, ${(run.state.activeSec / 3600).toFixed(0)} h, ${((Date.now() - t0) / 1000).toFixed(0)} s — testing passed-over pieces\n`);

// Fight each wall's passed-over top pieces: as dropped, and with the replaced piece's gems moved over.
const tests: Record<number, { n: number; better: number; betterWithGems: number; gains: number[]; gainsWithGems: number[] }> = {};
for (const S of WALLS) {
  const list = rejected[S] ?? [];
  const res = { n: 0, better: 0, betterWithGems: 0, gains: [] as number[], gainsWithGems: [] as number[] };
  for (const r of list) {
    if (r.bonuses === undefined) continue;
    const build = S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD;
    const base = partyWithBuild(r.party, build);
    const hi = base.findIndex((h) => r.item.classKey === undefined ? true : h.classKey === r.item.classKey);
    if (hi < 0) continue;
    const before = wallDamage(base, S, r.bonuses, 4242);
    const old = base[hi]?.equipment[r.item.slot];
    const swap = (item: ItemInstance): number => {
      const p = base.map((h, i) => (i === hi ? { ...h, equipment: { ...h.equipment, [item.slot]: item } } : h));
      return wallDamage(p, S, r.bonuses as Bonuses, 4242);
    };
    const bare = swap(r.item);
    const moved = old === undefined ? r.item : { ...r.item, sockets: r.item.sockets.map((s, k) => ({ gem: old.sockets[k]?.gem ?? s.gem })) };
    const withGems = swap(moved);
    res.n += 1;
    const g1 = before > 0 ? bare / before - 1 : 0;
    const g2 = before > 0 ? withGems / before - 1 : 0;
    res.gains.push(g1);
    res.gainsWithGems.push(g2);
    if (g1 > 0.01) res.better += 1;
    if (g2 > 0.01) res.betterWithGems += 1;
  }
  tests[S] = res;
}
appendFileSync(OUT, JSON.stringify({ seed: SEED, frontier: run.state.frontier, hours: run.state.activeSec / 3600, worlds, tests }) + '\n');
process.stdout.write(`seed ${SEED}: done ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);

/**
 * Round 4d — why the probe's party stops at 55–65 % of the gradual ceiling. For the walls in GG_WALLS of a snapshot
 * file (the party at its last look before the kill — or, at a wall it never beat, after all its farming), the party's
 * damage in 60 s as a % of the gradual ceiling, changing ONE factor of its gear at a time and then all of them in turn:
 *   ilvl    every piece at the ceiling's item level (same affixes, same rolls);
 *   rarity  every piece at the world's top rarity (same affixes, same rolls; the extra sockets come empty);
 *   rolls   every affix at the middle of its range;
 *   affixes the affix kinds the ceiling set picks for that hero and slot (the piece's own roll quality kept);
 *   gems    every socket filled, every gem at the top rarity (empty ones with the kind that suits the hero best);
 *   pieces  empty slots filled with the ceiling's piece.
 * Env: STUDY_SNAP, GG_WALLS, GG_OUT, GG_SEEDS (3 combat seeds averaged). Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { wallDamage, gradualCeilingDamage, ceilingDamage, ceilingTierRange, topTierAt, zoneCeilingSet, midStatValue } from '../test/sim/probe/zoneGear';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { heroScore } from '../test/sim/probe/gear';
import { expectedLevel, phi, EG_FLAT, GEAR_POWER, pctAffixIlvlMult } from '@/data/stageScaling';
import { STATS, type StatKey } from '@/data/stats';
import { tierDef, type ItemTier } from '@/data/tiers';
import { SLOT_KEYS } from '@/data/itemSlots';
import { GEM_KEYS, type GemTier } from '@/data/gems';
import { generateGem } from '@/sim/gems';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { round2 } from '@/sim/num';
import type { HeroConfig } from '@/sim/loadout';
import type { ItemInstance, AffixRoll } from '@/sim/items';
import type { Bonuses } from '@/sim/bonuses';
import type { SnapshotFile } from './probe-snapshots';

const file = JSON.parse(readFileSync(process.env.STUDY_SNAP ?? 'snap.json', 'utf8')) as SnapshotFile;
const WALLS = (process.env.GG_WALLS ?? '').split(',').filter((x) => x.length > 0).map(Number);
const OUT = process.env.GG_OUT ?? 'gear-gap.jsonl';
const SEEDS = Number(process.env.GG_SEEDS ?? 3);

const scaleOf = (key: StatKey, ilvl: number): number => (STATS[key].kind === 'percent' ? pctAffixIlvlMult(ilvl) : GEAR_POWER * phi(ilvl) ** EG_FLAT);
/** An affix's roll as a fraction of its band's middle (1 = an average roll; a perfect star ≈ 1.15 × max). */
function quality(a: AffixRoll, tier: number, ilvl: number, split: boolean): number {
  const mid = midStatValue(a.key, tierDef(tier as ItemTier).statMultiplier, ilvl) / (split ? 2 : 1);
  return mid > 0 ? a.value / mid : 1;
}
function revalue(a: AffixRoll, fromTier: number, fromIlvl: number, toTier: number, toIlvl: number): AffixRoll {
  const f = (tierDef(toTier as ItemTier).statMultiplier / tierDef(fromTier as ItemTier).statMultiplier) * (scaleOf(a.key, toIlvl) / scaleOf(a.key, fromIlvl));
  return { ...a, value: round2(a.value * f) };
}
type Tx = (party: HeroConfig[], S: number) => HeroConfig[];
const mapItems = (party: HeroConfig[], fn: (it: ItemInstance, hero: HeroConfig) => ItemInstance): HeroConfig[] =>
  party.map((h) => ({ ...h, equipment: Object.fromEntries(Object.entries(h.equipment).map(([k, it]) => [k, it === undefined ? it : fn(it, h)])) }));

const toIlvl: Tx = (party, S) => mapItems(party, (it) => {
  const L = expectedLevel(S - 1);
  return { ...it, ilvl: L, baseAffix: it.baseAffix.map((a) => revalue(a, it.tier, it.ilvl, it.tier, L)), stats: it.stats.map((a) => revalue(a, it.tier, it.ilvl, it.tier, L)) };
});
const toRarity: Tx = (party, S) => mapItems(party, (it) => {
  const T = topTierAt(S - 1);
  if (it.tier >= T) return it;
  const sockets = tierDef(T as ItemTier).sockets;
  return { ...it, tier: T as ItemTier, baseAffix: it.baseAffix.map((a) => revalue(a, it.tier, it.ilvl, T, it.ilvl)), stats: it.stats.map((a) => revalue(a, it.tier, it.ilvl, T, it.ilvl)), sockets: Array.from({ length: sockets }, (_, k) => it.sockets[k] ?? { gem: null }) };
});
const toMidRolls: Tx = (party) => mapItems(party, (it) => {
  const split = it.baseAffix.length > 1;
  const m = tierDef(it.tier).statMultiplier;
  return { ...it, baseAffix: it.baseAffix.map((a) => ({ key: a.key, value: round2(midStatValue(a.key, m, it.ilvl) / (split ? 2 : 1)) })), stats: it.stats.map((a) => ({ key: a.key, value: midStatValue(a.key, m, it.ilvl) })) };
});
const ceilCache = new Map<string, HeroConfig[]>();
const ceilSet = (party: HeroConfig[], S: number): HeroConfig[] => {
  const k = `${S}`;
  if (!ceilCache.has(k)) ceilCache.set(k, zoneCeilingSet(party, S));
  return ceilCache.get(k) as HeroConfig[];
};
const toAffixes: Tx = (party, S) => {
  const ceil = ceilSet(party, S);
  return party.map((h, i) => ({ ...h, equipment: Object.fromEntries(Object.entries(h.equipment).map(([slot, it]) => {
    const c = ceil[i]?.equipment[slot as keyof typeof h.equipment];
    if (it === undefined || c === undefined) return [slot, it];
    const split = it.baseAffix.length > 1;
    const qs = [...it.baseAffix.map((a) => quality(a, it.tier, it.ilvl, split)), ...it.stats.map((a) => quality(a, it.tier, it.ilvl, false))];
    const q = qs.reduce((x, y) => x + y, 0) / Math.max(1, qs.length);
    const m = tierDef(it.tier).statMultiplier;
    const cs = c.baseAffix.length > 1;
    const n = it.stats.length;
    return [slot, { ...it, baseAffix: c.baseAffix.map((a) => ({ key: a.key, value: round2((q * midStatValue(a.key, m, it.ilvl)) / (cs ? 2 : 1)) })), stats: c.stats.slice(0, n).map((a) => ({ key: a.key, value: round2(q * midStatValue(a.key, m, it.ilvl)) })) }];
  })) }));
};
const toGems: Tx = (party, S) => {
  const T = Math.max(1, topTierAt(S - 1)) as GemTier;
  const set = mapItems(party, (it) => ({ ...it, sockets: it.sockets.map((s) => (s.gem === null ? s : { gem: { ...s.gem, tier: T, origin: { ...s.gem.origin, stageIndex: S - 1 } } })) }));
  let seed = 77;
  for (const hero of set) {
    for (const slot of Object.keys(hero.equipment) as (keyof typeof hero.equipment)[]) {
      const item = hero.equipment[slot];
      if (item === undefined) continue;
      for (let s = 0; s < item.sockets.length; s++) {
        const cur = hero.equipment[slot];
        if (cur === undefined || cur.sockets[s]?.gem !== null) continue;
        let best: { gem: ReturnType<typeof generateGem>; score: number } | null = null;
        for (const key of GEM_KEYS) {
          const gem = { ...generateGem({ rollSeed: (seed += 1), stageIndex: S - 1, generatorVersion: GENERATOR_VERSION }, T), key };
          const trial = { ...hero, equipment: { ...hero.equipment, [slot]: { ...cur, sockets: cur.sockets.map((sk, k) => (k === s ? { gem } : sk)) } } };
          const score = heroScore(trial, set);
          if (best === null || score > best.score) best = { gem, score };
        }
        if (best !== null) hero.equipment = { ...hero.equipment, [slot]: { ...cur, sockets: cur.sockets.map((sk, k) => (k === s ? { gem: best!.gem } : sk)) } };
      }
    }
  }
  return set;
};
const toPieces: Tx = (party, S) => {
  const ceil = ceilSet(party, S);
  return party.map((h, i) => {
    const eq = { ...h.equipment };
    for (const slot of SLOT_KEYS) if (eq[slot] === undefined && ceil[i]?.equipment[slot] !== undefined) eq[slot] = ceil[i]?.equipment[slot];
    return { ...h, equipment: eq };
  });
};

const dmg = (p: HeroConfig[], S: number, b: Bonuses): number => {
  let s = 0;
  for (let k = 0; k < SEEDS; k++) s += wallDamage(p, S, b, 4242 + 17 * k);
  return s / SEEDS;
};

for (const S of WALLS) {
  const snap = file.last[S];
  if (snap === undefined) continue;
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const b = snap.bonuses;
  const ceil = gradualCeilingDamage(party, S, b, 4242);
  const plain = ceilingDamage(party, S, b, 4242);
  const pct = (p: HeroConfig[]): number => (100 * dmg(p, S, b)) / ceil;
  const items = party.flatMap((h) => Object.values(h.equipment).filter((x): x is ItemInstance => x !== undefined));
  const T = topTierAt(S - 1);
  const L = expectedLevel(S - 1);
  const qs = items.flatMap((it) => [...it.baseAffix.map((a) => quality(a, it.tier, it.ilvl, it.baseAffix.length > 1)), ...it.stats.map((a) => quality(a, it.tier, it.ilvl, false))]);
  const sockets = items.reduce((n, it) => n + it.sockets.length, 0);
  const gems = items.flatMap((it) => it.sockets.map((s) => s.gem).filter((g) => g !== null));
  const row: Record<string, unknown> = {
    seed: file.seed, stage: S, hours: snap.activeHours, level: snap.party.map((h) => h.level), ceilRange: ceilingTierRange(S), plainOverGradual: plain / ceil,
    slots: items.length, topTier: T, tiers: items.map((i) => i.tier), atTop: items.filter((i) => i.tier >= T).length, ceilIlvl: L,
    ilvlMean: items.reduce((a, i) => a + i.ilvl, 0) / items.length, ilvlMin: Math.min(...items.map((i) => i.ilvl)),
    rollQuality: qs.reduce((a, x) => a + x, 0) / qs.length, sockets, gems: gems.length, gemTierMean: gems.reduce((a, g) => a + (g?.tier ?? 0), 0) / Math.max(1, gems.length),
    gemsAtTop: gems.filter((g) => (g?.tier ?? 0) >= Math.max(1, T)).length,
  };
  const base = pct(party);
  row.base = base;
  const one: [string, Tx][] = [['pieces', toPieces], ['ilvl', toIlvl], ['rarity', toRarity], ['rolls', toMidRolls], ['affixes', toAffixes], ['gems', toGems]];
  for (const [name, tx] of one) row[`only_${name}`] = pct(tx(party, S));
  let acc = party;
  for (const [name, tx] of one) {
    acc = tx(acc, S);
    row[`acc_${name}`] = pct(acc);
  }
  row.ceilingSet = pct(ceilSet(party, S));
  appendFileSync(OUT, JSON.stringify(row) + '\n');
  process.stdout.write(`${file.seed}/${S}: base ${base.toFixed(0)} % → all ${(row.acc_gems as number).toFixed(0)} % (ceiling set ${(row.ceilingSet as number).toFixed(0)} %)\n`);
}

import type { ChestType } from '@/data/chests';
import { DIFFICULTY_COUNT } from '@/data/difficulties';

// The player's LIFETIME RECORDS (the Codex, user 2026-11-21): counts that only grow, kept in the save. The
// achievements read them (sim/achievements); the Codex shows them. Pure: no store, no clock — callers pass what
// happened (`RecordsDelta`) and the best values seen.

export interface Records {
  kills: number;
  bossKills: number;
  worldBossKills: number;
  wipes: number;
  goldEarned: number;
  xpEarned: number;
  playMs: number;
  chestsFound: number;
  chestsOpened: Record<ChestType, number>;
  bestItemTier: number; // -1: none yet
  bestGemTier: number; // 0: none yet (gems start at T1)
  highestHit: number;
  synths: number;
  polishes: number;
  runaways: number;
  merchantBuys: number;
  /** Creature key (data/worlds) → enemies of it defeated, per difficulty (index 0 = Normal). */
  bestiary: Record<string, number[]>;
}

/** What happened since the last count. Every field is optional; counts add, bests keep the higher. */
export interface RecordsDelta {
  kills?: number;
  bossKills?: number;
  worldBossKills?: number;
  wipes?: number;
  goldEarned?: number;
  xpEarned?: number;
  playMs?: number;
  chestsFound?: number;
  chestsOpened?: Partial<Record<ChestType, number>>;
  itemTier?: number;
  gemTier?: number;
  hit?: number;
  synths?: number;
  polishes?: number;
  runaways?: number;
  merchantBuys?: number;
  /** Enemies defeated by creature, at difficulty `difficulty`. */
  creatures?: { difficulty: number; counts: Record<string, number> };
}

export function emptyRecords(): Records {
  return {
    kills: 0, bossKills: 0, worldBossKills: 0, wipes: 0, goldEarned: 0, xpEarned: 0, playMs: 0, chestsFound: 0,
    chestsOpened: { normal: 0, stageBoss: 0, zoneBoss: 0 }, bestItemTier: -1, bestGemTier: 0, highestHit: 0,
    synths: 0, polishes: 0, runaways: 0, merchantBuys: 0, bestiary: {},
  };
}

const COUNTS = ['kills', 'bossKills', 'worldBossKills', 'wipes', 'goldEarned', 'xpEarned', 'playMs', 'chestsFound', 'synths', 'polishes', 'runaways', 'merchantBuys'] as const;

/** `r` with `d` counted in (a new object; `r` is unchanged). Negative or non-finite amounts count as nothing. */
export function addRecords(r: Records, d: RecordsDelta): Records {
  const add = (n: number | undefined): number => (n !== undefined && Number.isFinite(n) && n > 0 ? n : 0);
  const out: Records = { ...r, chestsOpened: { ...r.chestsOpened }, bestiary: r.bestiary };
  for (const k of COUNTS) out[k] = r[k] + add(d[k]);
  if (d.chestsOpened !== undefined) {
    for (const t of ['normal', 'stageBoss', 'zoneBoss'] as const) out.chestsOpened[t] += add(d.chestsOpened[t]);
  }
  if (d.itemTier !== undefined && d.itemTier > out.bestItemTier) out.bestItemTier = d.itemTier;
  if (d.gemTier !== undefined && d.gemTier > out.bestGemTier) out.bestGemTier = d.gemTier;
  if (d.hit !== undefined && Number.isFinite(d.hit) && d.hit > out.highestHit) out.highestHit = d.hit;
  const c = d.creatures;
  if (c !== undefined && c.difficulty >= 0 && c.difficulty < DIFFICULTY_COUNT && Object.keys(c.counts).length > 0) {
    const bestiary = { ...r.bestiary };
    for (const [key, n] of Object.entries(c.counts)) {
      if (!(n > 0)) continue;
      const row = (bestiary[key] ?? []).slice();
      while (row.length < DIFFICULTY_COUNT) row.push(0);
      row[c.difficulty] = (row[c.difficulty] ?? 0) + n;
      bestiary[key] = row;
    }
    out.bestiary = bestiary;
  }
  return out;
}

/** Creature × difficulty pairs defeated at least once. */
export function bestiaryDiscovered(r: Records): number {
  let n = 0;
  for (const row of Object.values(r.bestiary)) for (const count of row) if (count > 0) n += 1;
  return n;
}

/** A save's records, read defensively: a field that is missing or not a number takes its empty value. */
export function sanitizeRecords(raw: unknown): Records {
  const base = emptyRecords();
  if (typeof raw !== 'object' || raw === null) return base;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, dflt: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : dflt);
  for (const k of COUNTS) base[k] = Math.max(0, num(o[k], 0));
  const opened = (typeof o.chestsOpened === 'object' && o.chestsOpened !== null ? o.chestsOpened : {}) as Record<string, unknown>;
  for (const t of ['normal', 'stageBoss', 'zoneBoss'] as const) base.chestsOpened[t] = Math.max(0, num(opened[t], 0));
  base.bestItemTier = num(o.bestItemTier, -1);
  base.bestGemTier = num(o.bestGemTier, 0);
  base.highestHit = Math.max(0, num(o.highestHit, 0));
  if (typeof o.bestiary === 'object' && o.bestiary !== null) {
    for (const [key, row] of Object.entries(o.bestiary as Record<string, unknown>)) {
      if (Array.isArray(row)) base.bestiary[key] = row.slice(0, DIFFICULTY_COUNT).map((v) => Math.max(0, num(v, 0)));
    }
  }
  return base;
}

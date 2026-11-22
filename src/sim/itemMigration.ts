import { GENERATOR_VERSION } from '@/data/lootTables';
import { STATS, type StatKey } from '@/data/stats';
import { tierDef } from '@/data/tiers';
import { affixShare, stageAtLevel } from '@/data/power';
import type { GemInstance } from '@/data/gems';
import type { AffixRoll, InvEntry, ItemInstance } from './items';
import { perfectStatValue, statValue } from './loot';

// Bringing gear from an older generator up to the current one, in place, on load. Pure.
//   · v7 → v8 (2026-11-21): heal power stopped taking the tier's multiplier.
//   · v7/v8 → v9 (2026-11-22, the power curve — docs/redesign/POWER_CURVE.md): every affix keeps its QUALITY — how
//     far up its band it rolled, read back through the old formula — and is re-valued with the new one (the rarity's
//     budget split over the affixes, flat stats on the power curve of the item level, percent stats level-free); a
//     perfect affix stays perfect. The item level moves from hero levels to stages (data/power stageAtLevel). Gems
//     compute their grants on the fly from their tier and drop stage, so a gem only takes the new version.
// Anything older than MIGRATABLE_FROM is not migrated (the caller keeps its clean wipe).

/** The oldest generator version that can be brought up to GENERATOR_VERSION. */
export const MIGRATABLE_FROM = 7;

// ── The v7/v8 formula, frozen (never edit: it reads old saves) ──
const LEGACY_TIER_MULT = [1.0, 1.2, 1.45, 1.8, 2.3, 3.0, 4.2, 6.0, 9.0] as const;
const LEGACY_GEAR_POWER = 9;
function legacyPhi(ilvl: number): number {
  return ilvl <= 0 ? 1 : (1 + ilvl / 600) ** 3;
}
function legacyPctMult(ilvl: number): number {
  return 0.5 + Math.max(0, Math.min(1, (ilvl - 1) / 79));
}
/** The band roll a legacy affix of `key` came from (before the perfect bonus). */
function legacyRoll(key: StatKey, value: number, tier: number, ilvl: number, version: number): number {
  const tierScaled = !(key === 'healPower' && version >= 8);
  const m = tierScaled ? (LEGACY_TIER_MULT[tier] ?? 1) : 1;
  const scale = STATS[key].kind === 'percent' ? legacyPctMult(ilvl) : LEGACY_GEAR_POWER * legacyPhi(ilvl);
  return value / Math.max(1e-9, m * scale);
}

/** How good a legacy roll was: 0 at the bottom of its band, 1 at the top. */
function quality(key: StatKey, roll: number): number {
  const band = STATS[key].rollPerIlvl;
  const span = band.max - band.min;
  return span <= 0 ? 0.5 : Math.max(0, Math.min(1, (roll - band.min) / span));
}

function revalue(a: AffixRoll, item: ItemInstance, ilvl: number, share: number, split: boolean): AffixRoll {
  if (STATS[a.key] === undefined) return a;
  const budget = tierDef(item.tier).statMultiplier;
  if (a.perfect === true) return { ...a, value: perfectStatValue(a.key, budget, ilvl, share) };
  const roll = legacyRoll(a.key, split ? a.value * 2 : a.value, item.tier, item.ilvl, item.origin.generatorVersion);
  const band = STATS[a.key].rollPerIlvl;
  return { ...a, value: statValue(a.key, budget, ilvl, share, band.min + (band.max - band.min) * quality(a.key, roll)) };
}

function migrateGem(gem: GemInstance): GemInstance {
  return gem.origin.generatorVersion >= GENERATOR_VERSION ? gem : { ...gem, origin: { ...gem.origin, generatorVersion: GENERATOR_VERSION } };
}

function migrateItem(item: ItemInstance): ItemInstance {
  const sockets = item.sockets.map((s) => (s.gem === null ? s : { ...s, gem: migrateGem(s.gem) }));
  if (item.origin.generatorVersion >= GENERATOR_VERSION) return { ...item, sockets };
  const ilvl = Math.max(1, Math.round(stageAtLevel(item.ilvl)));
  const split = item.baseAffix.length > 1;
  const baseShare = affixShare(true, item.stats.length) / Math.max(1, item.baseAffix.length);
  const subShare = affixShare(false, item.stats.length);
  return {
    ...item,
    ilvl,
    baseAffix: item.baseAffix.map((a) => revalue(a, item, ilvl, baseShare, split)),
    stats: item.stats.map((a) => revalue(a, item, ilvl, subShare, false)),
    sockets,
    origin: { ...item.origin, generatorVersion: GENERATOR_VERSION },
  };
}

/** `e` brought up to GENERATOR_VERSION, or null when it is too old to migrate (or from a newer build). */
export function migrateEntry<T extends InvEntry>(e: T): T | null {
  const v = e.origin.generatorVersion;
  if (v < MIGRATABLE_FROM || v > GENERATOR_VERSION) return null;
  return ('slot' in e ? migrateItem(e as ItemInstance) : migrateGem(e as GemInstance)) as T;
}

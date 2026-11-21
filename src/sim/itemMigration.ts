import { GENERATOR_VERSION } from '@/data/lootTables';
import { STATS } from '@/data/stats';
import { tierDef } from '@/data/tiers';
import type { GemInstance } from '@/data/gems';
import type { AffixRoll, InvEntry, ItemInstance } from './items';

// Bringing gear from an older generator up to the current one, in place, on load — for the changes that keep an
// item's roll stream (its slot, tier, class, affix keys) and only re-scale values. Pure.
//   · v7 → v8 (2026-11-21): heal power stopped taking the tier's statMultiplier (data/stats `tierScaled: false`); a
//     v7 roll is divided by its tier's multiplier, which is exactly what v8 rolls from the same seed. Gems compute
//     their grants on the fly, so a gem only takes the new version.
// Anything older than MIGRATABLE_FROM is not migrated (the caller keeps its clean wipe).

/** The oldest generator version that can be brought up to GENERATOR_VERSION. */
export const MIGRATABLE_FROM = 7;

function migrateAffixes(affixes: readonly AffixRoll[], tierMult: number): AffixRoll[] {
  return affixes.map((a) => (STATS[a.key]?.tierScaled === false && tierMult !== 1 ? { ...a, value: Math.round((a.value / tierMult) * 100) / 100 } : a));
}

function migrateGem(gem: GemInstance): GemInstance {
  return gem.origin.generatorVersion >= GENERATOR_VERSION ? gem : { ...gem, origin: { ...gem.origin, generatorVersion: GENERATOR_VERSION } };
}

function migrateItem(item: ItemInstance): ItemInstance {
  const sockets = item.sockets.map((s) => (s.gem === null ? s : { ...s, gem: migrateGem(s.gem) }));
  if (item.origin.generatorVersion >= GENERATOR_VERSION) return { ...item, sockets };
  const mult = tierDef(item.tier).statMultiplier;
  return {
    ...item,
    baseAffix: migrateAffixes(item.baseAffix, mult),
    stats: migrateAffixes(item.stats, mult),
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

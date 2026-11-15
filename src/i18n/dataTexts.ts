// Every visible English text that data/ declares, per group: key → English. This is the list the Spanish
// dictionaries (src/data/i18n/es/<group>.json) are checked against: a text missing from its dictionary, or whose
// English changed since it was translated, fails test/i18n/dataTexts.test.ts.
//
// Only groups whose content is stable are registered. Abilities, talents and ultimates are NOT: they are being
// redesigned (docs/redesign/CLASSES.md) and get their group when that lands.
import { CLASSES } from '@/data/classes';
import { DIFFICULTIES } from '@/data/difficulties';
import { GEMS } from '@/data/gems';
import { ARMOR_FAMILIES, SLOTS, WEAPON_TYPES } from '@/data/itemSlots';
import { PETS } from '@/data/pets';
import { STATS } from '@/data/stats';
import { TECH_CATEGORIES, TECH_NODES } from '@/data/techTree';
import { TIERS } from '@/data/tiers';

export type DataGroup = 'stats' | 'tiers' | 'slots' | 'gems' | 'classes' | 'difficulties' | 'tech' | 'pets';

export const DATA_GROUPS: readonly DataGroup[] = ['stats', 'tiers', 'slots', 'gems', 'classes', 'difficulties', 'tech', 'pets'];

/** How a text is keyed inside its group when the group holds more than one kind of text. */
export const dataKey = {
  slot: (slot: string): string => `slot.${slot}`,
  weaponType: (type: string): string => `weapon.${type}`,
  armorFamily: (family: string): string => `armor.${family}`,
  techName: (node: string): string => `${node}.name`,
  techDescription: (node: string): string => `${node}.description`,
  techCategory: (category: string): string => `category.${category}`,
} as const;

function fromEntries(pairs: Iterable<readonly [string, string]>): Record<string, string> {
  return Object.fromEntries(pairs);
}

export function visibleDataTexts(): Record<DataGroup, Record<string, string>> {
  return {
    stats: fromEntries(Object.values(STATS).map((s) => [s.key, s.label] as const)),
    tiers: fromEntries(TIERS.map((tier) => [String(tier.tier), tier.name] as const)),
    slots: fromEntries([
      ...Object.values(SLOTS).map((s) => [dataKey.slot(s.key), s.label] as const),
      ...Object.values(WEAPON_TYPES).map((w) => [dataKey.weaponType(w.key), w.name] as const),
      ...Object.values(ARMOR_FAMILIES).map((f) => [dataKey.armorFamily(f.key), f.name] as const),
    ]),
    gems: fromEntries(Object.values(GEMS).map((g) => [g.key, g.name] as const)),
    classes: fromEntries(Object.values(CLASSES).map((c) => [c.key, c.name] as const)),
    difficulties: fromEntries(Object.values(DIFFICULTIES).map((d) => [d.key, d.name] as const)),
    tech: fromEntries([
      ...TECH_CATEGORIES.map((c) => [dataKey.techCategory(c), c] as const),
      ...TECH_NODES.flatMap((n) => [
        [dataKey.techName(n.key), n.name] as const,
        [dataKey.techDescription(n.key), n.description] as const,
      ]),
    ]),
    pets: fromEntries(Object.values(PETS).map((p) => [p.key, p.name] as const)),
  };
}

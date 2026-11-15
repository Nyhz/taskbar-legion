// Every visible English text that data/ declares, per group: key → English. This is the list the Spanish
// dictionaries (src/data/i18n/es/<group>.json) are checked against: a text missing from its dictionary, or whose
// English changed since it was translated, fails test/i18n/dataTexts.test.ts.
//
// The class kits (docs/redesign/CLASSES.md) are registered too — `abilities` (the hero abilities a talent tree
// teaches and the class ultimates), `talents` (role talents, modifiers, capstones, branches) and `effects` (the
// names the sheet shows) — with PROVISIONAL names, so the checks keep them complete while they change.
import { ABILITIES } from '@/data/abilities';
import { CLASSES } from '@/data/classes';
import { DIFFICULTIES } from '@/data/difficulties';
import { EFFECTS } from '@/data/effects';
import { GEMS } from '@/data/gems';
import { ARMOR_FAMILIES, SLOTS, WEAPON_TYPES } from '@/data/itemSlots';
import { PETS } from '@/data/pets';
import { STATS } from '@/data/stats';
import { talentNodes, talentTree } from '@/data/talents';
import { TECH_CATEGORIES, TECH_NODES } from '@/data/techTree';
import { TIERS } from '@/data/tiers';
import { ULTIMATES } from '@/data/ultimates';
import { WORLDS, allCreatures } from '@/data/worlds';

export type DataGroup =
  | 'stats' | 'tiers' | 'slots' | 'gems' | 'classes' | 'difficulties' | 'tech' | 'pets' | 'worlds'
  | 'abilities' | 'talents' | 'effects';

export const DATA_GROUPS: readonly DataGroup[] = [
  'stats', 'tiers', 'slots', 'gems', 'classes', 'difficulties', 'tech', 'pets', 'worlds', 'abilities', 'talents', 'effects',
];

/** How a text is keyed inside its group when the group holds more than one kind of text. */
export const dataKey = {
  slot: (slot: string): string => `slot.${slot}`,
  weaponType: (type: string): string => `weapon.${type}`,
  armorFamily: (family: string): string => `armor.${family}`,
  techName: (node: string): string => `${node}.name`,
  techDescription: (node: string): string => `${node}.description`,
  techCategory: (category: string): string => `category.${category}`,
  world: (index: number): string => `world.${index}`,
  creature: (key: string): string => `creature.${key}`,
  /** An ability or a class ultimate, by its key. */
  abilityName: (key: string): string => `${key}.name`,
  abilityDescription: (key: string): string => `${key}.desc`,
  /** A role talent, a modifier or a capstone, by its node key. */
  talentName: (node: string): string => `${node}.name`,
  talentDescription: (node: string): string => `${node}.desc`,
  talentBranch: (classKey: string, branch: string): string => `branch.${classKey}.${branch}`,
} as const;

/** The hero abilities: the ones a class's talent tree teaches (enemy abilities are never named on screen). */
function heroAbilityKeys(): string[] {
  return Object.values(CLASSES).flatMap((c) => talentNodes(c.key).flatMap((n) => (n.abilityKey === undefined ? [] : [n.abilityKey])));
}

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
    worlds: fromEntries([
      ...WORLDS.map((w) => [dataKey.world(w.index), w.name] as const),
      ...allCreatures().map((c) => [dataKey.creature(c.key), c.name] as const),
    ]),
    abilities: fromEntries([
      ...heroAbilityKeys().flatMap((key) => {
        const a = ABILITIES[key];
        return a === undefined ? [] : [[dataKey.abilityName(key), a.name] as const, [dataKey.abilityDescription(key), a.desc] as const];
      }),
      ...Object.values(ULTIMATES).flatMap((u) => [
        [dataKey.abilityName(u.key), u.name] as const,
        [dataKey.abilityDescription(u.key), u.desc] as const,
      ]),
    ]),
    talents: fromEntries(
      Object.values(CLASSES).flatMap((c) => [
        ...talentTree(c.key).branches.map((b) => [dataKey.talentBranch(c.key, b.key), b.name] as const),
        // A stat passive is named by its stat and an ability node by its ability: only the nodes with words of
        // their own (role talents, modifiers, capstones) are listed.
        ...talentNodes(c.key).flatMap((n) =>
          n.desc === undefined ? [] : [[dataKey.talentName(n.key), n.name] as const, [dataKey.talentDescription(n.key), n.desc] as const],
        ),
      ]),
    ),
    effects: fromEntries(Object.values(EFFECTS).map((e) => [e.key, e.name] as const)),
  };
}

import type { StatKey } from './stats';

// The 10 equipment slots, grouped into 3 categories (gear overhaul — AFFIXES.md):
//   • armor (5): base = MITIGATION (armor / MR / 50-50 split); substats fully flexible.
//   • weapon (2): weapon + offhand are CLASS-LOCKED, class-specific TYPES (Sword/Shield,
//     Bow/Quiver, Wand/Tome) — each with its own intrinsic base + tailored substat pool.
//   • jewelry (3): ring + trinket + amulet are the freestyle wildcard — base = ANY stat.

export type SlotKey =
  | 'helmet'
  | 'chest'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'weapon'
  | 'offhand'
  | 'ring'
  | 'trinket'
  | 'amulet';

export type SlotCategory = 'armor' | 'weapon' | 'jewelry';

export interface SlotDef {
  key: SlotKey;
  label: string;
  category: SlotCategory;
}

export const SLOTS: Record<SlotKey, SlotDef> = {
  helmet: { key: 'helmet', label: 'Helmet', category: 'armor' },
  chest: { key: 'chest', label: 'Chest', category: 'armor' },
  gloves: { key: 'gloves', label: 'Gloves', category: 'armor' },
  legs: { key: 'legs', label: 'Legs', category: 'armor' },
  boots: { key: 'boots', label: 'Boots', category: 'armor' },
  weapon: { key: 'weapon', label: 'Weapon', category: 'weapon' },
  offhand: { key: 'offhand', label: 'Off-hand', category: 'weapon' },
  ring: { key: 'ring', label: 'Ring', category: 'jewelry' },
  trinket: { key: 'trinket', label: 'Trinket', category: 'jewelry' },
  amulet: { key: 'amulet', label: 'Amulet', category: 'jewelry' },
};

export const SLOT_KEYS: SlotKey[] = [
  'helmet', 'chest', 'gloves', 'legs', 'boots', 'weapon', 'offhand', 'ring', 'trinket', 'amulet',
];

/** A weapon/off-hand TYPE — class-specific identity for the two weapon-category slots.
 *  An item born to a type is CLASS-LOCKED (only that class can equip it). `base` is the
 *  guaranteed intrinsic affix; `pool` is the tailored substat pool (base may repeat in
 *  the pool — loot filters it out). */
export interface WeaponType {
  key: string;
  name: string;
  icon: string;
  classKey: string;
  slot: 'weapon' | 'offhand';
  base: StatKey;
  pool: StatKey[];
}

export const WEAPON_TYPES: Record<string, WeaponType> = {
  // ── Knight: threat lives in the Sword, mitigation in the Shield ──
  // Knight weapons are the FLEX bruiser slots: their block identity + crit/multistrike +
  // bruiser scalers (hp/armor). CDR is jewelry-only, so it's NOT here.
  sword: {
    key: 'sword', name: 'Sword', icon: '🗡', classKey: 'knight', slot: 'weapon',
    base: 'attackDamage',
    pool: ['attackDamage', 'critDamage', 'attackSpeed', 'block', 'critChance', 'multistrike', 'health', 'armor'],
  },
  shield: {
    key: 'shield', name: 'Shield', icon: '🛡', classKey: 'knight', slot: 'offhand',
    base: 'block',
    pool: ['block', 'armor', 'magicResist', 'health', 'critChance', 'multistrike'],
  },
  // ── Ranger: raw damage in the Bow, crit + multistrike (its identity) in both ──
  bow: {
    key: 'bow', name: 'Bow', icon: '🏹', classKey: 'ranger', slot: 'weapon',
    base: 'attackDamage',
    pool: ['attackDamage', 'attackSpeed', 'critDamage', 'critChance', 'multistrike'],
  },
  quiver: {
    key: 'quiver', name: 'Quiver', icon: '🎯', classKey: 'ranger', slot: 'offhand',
    base: 'attackSpeed',
    pool: ['attackSpeed', 'critDamage', 'attackDamage', 'critChance', 'multistrike'],
  },
  // ── Priest: heals + smite + crit (→ crit heals) in both. CDR is jewelry-only now. ──
  wand: {
    key: 'wand', name: 'Wand', icon: '🔮', classKey: 'priest', slot: 'weapon',
    base: 'healPower',
    pool: ['healPower', 'attackDamage', 'critDamage', 'critChance', 'magicResist'],
  },
  tome: {
    key: 'tome', name: 'Tome', icon: '📖', classKey: 'priest', slot: 'offhand',
    base: 'healPower',
    pool: ['healPower', 'critChance', 'critDamage', 'health', 'magicResist'],
  },
};

const WEAPON_TYPE_LIST = Object.values(WEAPON_TYPES);

/** The weapon/off-hand TYPE for a class + slot (e.g. knight+weapon → Sword), or undefined
 *  if none exists (e.g. a stale class key from a pre-rename save). */
export function tryWeaponTypeFor(classKey: string, slot: 'weapon' | 'offhand'): WeaponType | undefined {
  return WEAPON_TYPE_LIST.find((w) => w.classKey === classKey && w.slot === slot);
}

/** The weapon/off-hand TYPE for a class + slot (e.g. knight+weapon → Sword). Throws on an
 *  unknown class/slot — use tryWeaponTypeFor where a stale key must not crash the UI. */
export function weaponTypeFor(classKey: string, slot: 'weapon' | 'offhand'): WeaponType {
  const t = tryWeaponTypeFor(classKey, slot);
  if (t === undefined) throw new Error(`No weapon type for ${classKey}/${slot}`);
  return t;
}

/** Rings and trinkets are now SEPARATE single slots (no interchange) — every slot is
 *  solo. Kept as a function so callers don't special-case the old ring family. */
export function slotFamily(slot: SlotKey): SlotKey[] {
  return [slot];
}

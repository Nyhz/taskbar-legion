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
  // ── Warrior: threat lives in the Sword, mitigation in the Shield ──
  sword: {
    key: 'sword', name: 'Sword', icon: '🗡', classKey: 'warrior', slot: 'weapon',
    base: 'attackDamage',
    pool: ['attackDamage', 'critChance', 'critDamage', 'damageIncrease', 'lifesteal', 'hpPerHit'],
  },
  shield: {
    key: 'shield', name: 'Shield', icon: '🛡', classKey: 'warrior', slot: 'offhand',
    base: 'block',
    pool: ['armor', 'magicResist', 'health', 'block', 'dodgeChance', 'hpRegen'],
  },
  // ── Ranger: raw damage in the Bow, amp + uptime in the Quiver ──
  bow: {
    key: 'bow', name: 'Bow', icon: '🏹', classKey: 'ranger', slot: 'weapon',
    base: 'attackDamage',
    pool: ['attackDamage', 'attackSpeed', 'critChance', 'critDamage', 'damageIncrease', 'lifesteal'],
  },
  quiver: {
    key: 'quiver', name: 'Quiver', icon: '🎯', classKey: 'ranger', slot: 'offhand',
    base: 'attackSpeed',
    pool: ['attackSpeed', 'critChance', 'critDamage', 'damageIncrease', 'lifesteal', 'cooldownReduction'],
  },
  // ── Priest: heals + smite in the Wand, uptime + survival in the Tome ──
  wand: {
    key: 'wand', name: 'Wand', icon: '🔮', classKey: 'priest', slot: 'weapon',
    base: 'healPower',
    pool: ['healPower', 'attackDamage', 'critChance', 'cooldownReduction', 'magicResist', 'damageIncrease'],
  },
  tome: {
    key: 'tome', name: 'Tome', icon: '📖', classKey: 'priest', slot: 'offhand',
    base: 'cooldownReduction',
    pool: ['healPower', 'cooldownReduction', 'health', 'magicResist', 'hpRegen', 'armor'],
  },
};

const WEAPON_TYPE_LIST = Object.values(WEAPON_TYPES);

/** The weapon/off-hand TYPE for a class + slot (e.g. warrior+weapon → Sword). */
export function weaponTypeFor(classKey: string, slot: 'weapon' | 'offhand'): WeaponType {
  const t = WEAPON_TYPE_LIST.find((w) => w.classKey === classKey && w.slot === slot);
  if (t === undefined) throw new Error(`No weapon type for ${classKey}/${slot}`);
  return t;
}

/** Rings and trinkets are now SEPARATE single slots (no interchange) — every slot is
 *  solo. Kept as a function so callers don't special-case the old ring family. */
export function slotFamily(slot: SlotKey): SlotKey[] {
  return [slot];
}

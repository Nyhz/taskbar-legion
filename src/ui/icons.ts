import type { StatKey } from '@/data/stats';
import type { SlotKey } from '@/data/itemSlots';
import { weaponTypeFor } from '@/data/itemSlots';
import type { AbilityDef } from '@/data/abilities';
import type { ItemInstance } from '@/sim/items';

// Procedural (emoji) icon vocabulary for the panels — no external art. One place so
// gear slots, stats and abilities read at a glance instead of as walls of text.

export const SLOT_ICON: Record<SlotKey, string> = {
  helmet: '🪖',
  chest: '🥋',
  gloves: '🧤',
  legs: '👖',
  boots: '🥾',
  weapon: '⚔️',
  offhand: '🛡️',
  ring: '💍',
  trinket: '🔱',
  amulet: '📿',
};

export const STAT_ICON: Record<StatKey, string> = {
  attackDamage: '⚔️',
  attackSpeed: '🌀',
  critChance: '🎯',
  critDamage: '💥',
  damageIncrease: '🔥',
  lifesteal: '🩸',
  armor: '🛡️',
  magicResist: '🔮',
  health: '❤️',
  dodgeChance: '💨',
  hpRegen: '✚',
  hpPerHit: '🩹',
  block: '⛨',
  cooldownReduction: '⏱️',
  healPower: '✨',
  damageReduction: '🪨',
};

const ABILITY_ICON: Record<string, string> = {
  guard: '🛡️', cleave: '🪓', shield: '🔰', cry: '📣', stun: '💫', banner: '🚩',
  fire: '🔥', frost: '❄️', surge: '🌟', lightning: '⚡', holy: '✨', heal: '💚',
  aim: '🎯', arrows: '🏹', poison: '☠️', explosion: '💥', root: '🌿', dagger: '🗡️',
  knives: '🔪', flurry: '🌀', fast: '💨', expose: '🩻', hit: '⚔️', dot: '☠️',
};

export function abilityIcon(ability: AbilityDef): string {
  return ABILITY_ICON[ability.icon] ?? '✦';
}

/** Display icon for an item: weapon/off-hand show their class-specific TYPE glyph
 *  (Sword/Shield · Bow/Quiver · Wand/Tome), so the three off-hands read distinctly
 *  instead of collapsing to one slot icon; everything else uses the generic slot icon. */
export function itemGlyph(item: ItemInstance): string {
  if (item.category === 'weapon' && item.classKey !== undefined) {
    return weaponTypeFor(item.classKey, item.slot as 'weapon' | 'offhand').icon;
  }
  return SLOT_ICON[item.slot];
}

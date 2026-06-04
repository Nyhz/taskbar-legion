import type { StatKey } from '@/data/stats';
import type { SlotKey } from '@/data/itemSlots';
import { tryWeaponTypeFor } from '@/data/itemSlots';
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
  multistrike: '⚡',
  damageIncrease: '🔥',
  lifesteal: '🩸',
  armor: '🛡️',
  magicResist: '🔮',
  health: '❤️',
  hpRegen: '✚',
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
  return glyphForIcon(ability.icon);
}

/** Emoji glyph for a raw icon key (shared by abilities and ultimates). */
export function glyphForIcon(iconKey: string): string {
  return ABILITY_ICON[iconKey] ?? '✦';
}

/** Display icon for an item: weapon/off-hand show their class-specific TYPE glyph
 *  (Sword/Shield · Bow/Quiver · Wand/Tome), so the three off-hands read distinctly
 *  instead of collapsing to one slot icon; everything else uses the generic slot icon. */
export function itemGlyph(item: ItemInstance): string {
  if (item.category === 'weapon' && item.classKey !== undefined) {
    // tryWeaponTypeFor (not the throwing variant) so a stale/unknown class key falls back
    // to the generic slot icon instead of crashing the panel render.
    const wt = tryWeaponTypeFor(item.classKey, item.slot as 'weapon' | 'offhand');
    if (wt !== undefined) return wt.icon;
  }
  return SLOT_ICON[item.slot];
}

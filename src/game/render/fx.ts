import type { ActiveEffect } from '@/data/effects';
import { effectDef } from '@/data/effects';
import { abilityDef, tryAbilityDef } from '@/data/abilities';
import { abilityIcon } from '@/ui/icons';
import { hexToNum } from '@/styles/palette';

// Shared visual vocabulary for combat FX: what color/glyph a cast or an ongoing
// effect reads as on the strip. Render-only (reads data, never mutates the sim).

export const FX = {
  heal: hexToNum('#7fe6a0'), // green — heals + HoT ticks
  hot: hexToNum('#ffd35d'), // gold — Renew/HoT aura ("yellow stars")
  shield: hexToNum('#7fc8ff'), // cyan — absorb
  buff: hexToNum('#d8a0ff'), // violet — stat buffs
  dot: hexToNum('#9bd14a'), // poison-green — DoT ticks/aura
  debuff: hexToNum('#ff6f6f'), // red — debuffs / CC
  offense: hexToNum('#ffb15a'), // amber — offensive cast flourish
  support: hexToNum('#9fe6c0'), // mint — supportive cast flourish
} as const;

export interface CastFx {
  glyph: string;
  color: number;
}

/** A cast's flourish: the ability's OWN icon (its visual identity), tinted by whether
 *  it targets enemies (offense) or allies/self (support). */
export function castFx(abilityKey: string): CastFx {
  const def = abilityDef(abilityKey);
  const offensive = def.target === 'frontEnemy' || def.target === 'allEnemies';
  return { glyph: abilityIcon(def), color: offensive ? FX.offense : FX.support };
}

/** True when a cast targets allies/self (a heal/buff/shield) rather than enemies — used
 *  to play the healer's heal-cast pose. Safe on unknown/renamed keys (treated as false). */
export function isSupportCast(abilityKey: string): boolean {
  const def = tryAbilityDef(abilityKey);
  if (def === undefined) return false;
  return def.target !== 'frontEnemy' && def.target !== 'allEnemies';
}

/** True when a cast hits the WHOLE wave (target 'allEnemies' — Holy Nova, Raining Arrows,
 *  boss Quake/Maelstrom/Cataclysm). Its flourish belongs over the TARGET band, not the
 *  caster, so an AoE doesn't read as landing on the caster's own side. */
export function isWholeWaveCast(abilityKey: string): boolean {
  return tryAbilityDef(abilityKey)?.target === 'allEnemies';
}

/** True while a total-immunity effect is up (Knight Last Stand) — drives the yellow
 *  shield bubble around the hero. */
export function isInvulnerable(effects: readonly ActiveEffect[]): boolean {
  return effects.some((e) => effectDef(e.defKey).kind.type === 'invulnerable');
}

/** Yellow used for the Last Stand invulnerability shield + INVULNERABLE callout. */
export const INVULN_YELLOW = hexToNum('#ffe14d');

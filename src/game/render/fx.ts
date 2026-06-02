import type { ActiveEffect } from '@/data/effects';
import { effectDef } from '@/data/effects';
import { abilityDef } from '@/data/abilities';
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

/** The aura color for an ongoing effect on a combatant — the most salient timed
 *  effect wins (HoT > shield > buff > DoT > debuff/CC). null ⇒ no aura. */
export function auraColor(effects: readonly ActiveEffect[]): number | null {
  let dot: number | null = null;
  let debuff: number | null = null;
  for (const e of effects) {
    const def = effectDef(e.defKey);
    const t = def.kind.type;
    if (t === 'hot') return FX.hot; // top priority — the gold "renew" aura
    if (t === 'shield') return FX.shield;
    if (t === 'statMod' && def.beneficial) return FX.buff;
    if (t === 'dot') dot = FX.dot;
    else if (!def.beneficial && (t === 'statMod' || t === 'root' || t === 'silence')) debuff = FX.debuff;
  }
  return dot ?? debuff;
}

/** True if a HoT is active (drives the twinkling-stars aura specifically). */
export function hasHot(effects: readonly ActiveEffect[]): boolean {
  return effects.some((e) => effectDef(e.defKey).kind.type === 'hot');
}

/** True while a total-immunity effect is up (Warrior Last Stand) — drives the yellow
 *  shield bubble around the hero. */
export function isInvulnerable(effects: readonly ActiveEffect[]): boolean {
  return effects.some((e) => effectDef(e.defKey).kind.type === 'invulnerable');
}

/** Yellow used for the Last Stand invulnerability shield + INVULNERABLE callout. */
export const INVULN_YELLOW = hexToNum('#ffe14d');

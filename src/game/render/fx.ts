import { tryAbilityDef, type AbilityDef } from '@/data/abilities';
import { castSignStem } from './castSign';
import { hexToNum } from '@/styles/palette';

// Shared visual vocabulary for combat FX: what colour and sign a cast or an ongoing
// effect reads as on the strip. Render-only (reads data, never mutates the sim).

export const FX = {
  heal: hexToNum('#7fe6a0'), // green — heals + HoT ticks
  hot: hexToNum('#ffd35d'), // gold — Renew/HoT aura ("yellow stars")
  shield: hexToNum('#7fc8ff'), // cyan — absorb
  buff: hexToNum('#d8a0ff'), // violet — stat buffs
  dot: hexToNum('#9bd14a'), // poison-green — DoT ticks/aura
  leech: hexToNum('#f08a62'), // blood — what a Vampiric boss heals off a hit
  debuff: hexToNum('#ff6f6f'), // red — debuffs / CC
  offense: hexToNum('#ffb15a'), // amber — offensive cast flourish
  support: hexToNum('#9fe6c0'), // mint — supportive cast flourish
} as const;

export interface CastFx {
  /** Art stem of the ability's sign (src/assets/ui), or null when the cast has none (enemies, unknown keys). */
  sign: string | null;
  color: number;
}

function hitsEnemies(def: AbilityDef): boolean {
  return def.target === 'frontEnemy' || def.target === 'meleeEnemies' || def.target === 'allEnemies';
}

/** A cast's flourish: the ability's OWN sign (its visual identity) and a burst tinted by whether it targets
 *  enemies (offense) or allies/self (support). Total: a key the data does not know — a trigger's marker, a
 *  renamed ability from an old save — reads as a plain supportive burst with no sign; it never throws. */
export function castFx(abilityKey: string): CastFx {
  const def = tryAbilityDef(abilityKey);
  const offensive = def !== undefined && hitsEnemies(def);
  return { sign: castSignStem(abilityKey), color: offensive ? FX.offense : FX.support };
}

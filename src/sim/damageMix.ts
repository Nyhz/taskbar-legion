import { mitigation } from '@/data/stageScaling';
import type { Combatant } from './world';

// PHYSICAL AND MAGIC DAMAGE (round 5, 2026-11-16). What share of an enemy's hit is magic, and how much of a hit a
// hero turns away with armour (its physical part) and magic resist (its magic part). Pure: no rng.
//
//   - a boss hits with its own fixed mix (Combatant.magicShare, data/bossKit BOSS_MAGIC_SHARE: 0.4 or 0.6);
//   - a wave enemy's hits are physical, or all magic when it is a caster (enemyMagic: the support); while a
//     living support's Enchanted Weapons aura is on its wave (data/enemies SUPPORT_AURAS.enchant), that share of
//     each hit turns magic;
//   - an ability that names its kind (`magic: true` Chain Lightning, `magic: false`) keeps it whole.

/** The share (0–1) of `foe`'s hit that is magic. `abilityMagic` is the ability's own flag, when it has one. */
export function foeMagicShare(foe: Combatant, abilityMagic?: boolean): number {
  if (abilityMagic !== undefined) return abilityMagic ? 1 : 0;
  if (foe.magicShare !== undefined) return clamp01(foe.magicShare);
  if (foe.enemyMagic === true) return 1;
  return clamp01((foe.underAuras?.enchant ?? 0) / 100);
}

/** The share of a hit a hero with `armor` and `magicResist` turns away at stage `S`, when `share` of it is magic:
 *  each part mitigated by its own defence (data/stageScaling mitigation). */
export function mixedMitigation(armor: number, magicResist: number, share: number, S: number): number {
  const m = clamp01(share);
  const phys = m >= 1 ? 0 : mitigation(Math.max(0, armor), S);
  const magic = m <= 0 ? 0 : mitigation(Math.max(0, magicResist), S);
  return (1 - m) * phys + m * magic;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

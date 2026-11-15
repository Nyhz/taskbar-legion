import type { ActiveEffect, EffectDef } from '@/data/effects';
import { effectDef } from '@/data/effects';
import type { StatMod } from './stats';

// Active-effect processing: stack rules, expiry, and queries the combat loop uses.
// The loop is GENERIC over ActiveEffect — adding an effect is data (SPEC §4.10).
// Effect arrays are mutated in place within a tick (the Simulation owns them).

/** Apply an effect to a target's active-effect list per its stackRule. */
export function applyEffect(
  effects: ActiveEffect[],
  def: EffectDef,
  sourceId: string,
  resolvedValue: number,
  durationMsOverride?: number,
): void {
  const duration = durationMsOverride ?? def.durationMs;
  if (def.stackRule === 'independent') {
    const count = effects.filter((e) => e.defKey === def.key).length;
    if (count >= def.maxStacks) {
      // Refresh the entry with the least time remaining instead of exceeding cap.
      const oldest = effects
        .filter((e) => e.defKey === def.key)
        .sort((a, b) => a.remainingMs - b.remainingMs)[0];
      if (oldest !== undefined) {
        oldest.remainingMs = duration;
        oldest.totalMs = duration;
        oldest.value = resolvedValue;
      }
      return;
    }
    effects.push({ defKey: def.key, sourceId, remainingMs: duration, totalMs: duration, stacks: 1, value: resolvedValue });
    return;
  }

  const existing = effects.find((e) => e.defKey === def.key);
  if (existing === undefined) {
    effects.push({ defKey: def.key, sourceId, remainingMs: duration, totalMs: duration, stacks: 1, value: resolvedValue });
    return;
  }
  if (def.stackRule === 'extend') {
    existing.remainingMs += duration;
    existing.totalMs = existing.remainingMs; // gauge reads "full" against the extended time
  } else {
    // refresh
    existing.remainingMs = duration;
    existing.totalMs = duration;
    existing.stacks = Math.min(def.maxStacks, existing.stacks + (def.maxStacks > 1 ? 1 : 0));
  }
  existing.value = resolvedValue;
}

/** Decrement durations and drop expired effects (mutates). Returns the effects that just ended (ran out, or
 *  a shield that was spent), or undefined when none did — the caller fires their "effect ended" triggers. */
export function tickEffectDurations(effects: ActiveEffect[], deltaMs: number): ActiveEffect[] | undefined {
  for (const e of effects) e.remainingMs -= deltaMs;
  let ended: ActiveEffect[] | undefined;
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    if (e !== undefined && e.remainingMs > 0) continue;
    effects.splice(i, 1);
    if (e !== undefined) (ended ??= []).push(e);
  }
  return ended;
}

/** Lengthen the effects with these keys by `ms`, if the holder carries them (mutates). */
export function extendEffects(effects: ActiveEffect[], keys: readonly string[], ms: number): void {
  for (const e of effects) {
    if (e.remainingMs <= 0 || !keys.includes(e.defKey)) continue;
    e.remainingMs += ms;
    e.totalMs = Math.max(e.totalMs ?? 0, e.remainingMs); // the gauge reads "full" against the longer time
  }
}

/** StatMods contributed by active statMod effects (value × stacks). */
export function effectStatMods(effects: readonly ActiveEffect[]): StatMod[] {
  const mods: StatMod[] = [];
  for (const e of effects) {
    const kind = effectDef(e.defKey).kind;
    if (kind.type === 'statMod') {
      mods.push({ key: kind.stat, mode: kind.mode, value: e.value * e.stacks });
    }
  }
  return mods;
}

function hasKind(effects: readonly ActiveEffect[], type: string): boolean {
  return effects.some((e) => effectDef(e.defKey).kind.type === type);
}

export const isSilenced = (effects: readonly ActiveEffect[]): boolean => hasKind(effects, 'silence');
export const isRooted = (effects: readonly ActiveEffect[]): boolean => hasKind(effects, 'root');
/** A combatant under a Last Stand-style immunity takes no damage at all. */
export const isInvulnerable = (effects: readonly ActiveEffect[]): boolean => hasKind(effects, 'invulnerable');

/** Damage multiplier from vulnerability marks (Ranger ult): 1 + Σ(value%)/100. 1 when
 *  unmarked. Applied to ALL damage dealt to the holder (autos, abilities, DoTs). */
export function vulnerabilityMult(effects: readonly ActiveEffect[]): number {
  let bonus = 0;
  for (const e of effects) {
    if (effectDef(e.defKey).kind.type === 'vulnerable') bonus += e.value * e.stacks;
  }
  return 1 + bonus / 100;
}

/** Outgoing-damage multiplier from weaken effects (Knight Debilitating Cleave): the
 *  mirror of vulnerabilityMult — the holder DEALS less damage. 1 when unweakened.
 *  Clamped so it can never zero out a hit (floored at 10% damage dealt). */
export function weakenMult(effects: readonly ActiveEffect[]): number {
  let reduction = 0;
  for (const e of effects) {
    if (effectDef(e.defKey).kind.type === 'weaken') reduction += e.value * e.stacks;
  }
  return Math.max(0.1, 1 - reduction / 100);
}

/** Healing multiplier from healReduction effects (world-boss Mortal Wound): the holder
 *  RECEIVES less healing. 1 when unafflicted; clamped at 0 (never negative). Applied to
 *  every heal path on the target (instant heal, HoT tick, regen, lifesteal). */
export function healReceivedMult(effects: readonly ActiveEffect[]): number {
  let reduction = 0;
  for (const e of effects) {
    if (effectDef(e.defKey).kind.type === 'healReduction') reduction += e.value * e.stacks;
  }
  return Math.max(0, 1 - reduction / 100);
}

export function hasTag(effects: readonly ActiveEffect[], tag: string): boolean {
  return effects.some((e) => {
    const k = effectDef(e.defKey).kind;
    return k.type === 'tag' && k.tag === tag;
  });
}

/** Drain a combatant's shield pools by `dmg`, returning the damage that gets through
 *  to HP. Depleted shields are marked expired (dropped next tickEffectDurations). */
export function absorbDamage(effects: ActiveEffect[], dmg: number): number {
  if (dmg <= 0) return 0;
  let remaining = dmg;
  for (const e of effects) {
    if (remaining <= 0) break;
    if (effectDef(e.defKey).kind.type !== 'shield' || e.value <= 0) continue;
    const used = Math.min(e.value, remaining);
    e.value -= used;
    remaining -= used;
    if (e.value <= 0) e.remainingMs = 0; // depleted → expire it
  }
  return remaining;
}

/** Total DoT damage-per-second from all dot effects (value × stacks). */
export function dotDps(effects: readonly ActiveEffect[]): number {
  let total = 0;
  for (const e of effects) {
    if (effectDef(e.defKey).kind.type === 'dot') total += e.value * e.stacks;
  }
  return total;
}

/** Total HoT heal-per-second from all hot effects (value × stacks). */
export function hotHps(effects: readonly ActiveEffect[]): number {
  let total = 0;
  for (const e of effects) {
    if (effectDef(e.defKey).kind.type === 'hot') total += e.value * e.stacks;
  }
  return total;
}

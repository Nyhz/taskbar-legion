import type { AbilityPower, AbilityTarget, AppliedEffect } from './abilities';

// An ability PATCH: what a modifier node changes in an ability's definition (docs/redesign/CLASSES.md §2.5,
// F2). Pure data; sim/abilityPatch.ts applies it when the hero is built, so the combat loop only ever sees
// the patched definition and knows nothing about modifiers.

/** A change to one effect the ability already applies. */
export interface EffectPatch {
  effectKey: string;
  /** Its new duration. */
  durationMs?: number;
  /** Added to its duration. */
  durationAddMs?: number;
  /** Multiplies the share of the ability's power it takes (1.5 = half as much again; 0.7 = 70 %). */
  powerScale?: number;
}

export interface AbilityPatch {
  /** Who the ability lands on. */
  target?: AbilityTarget;
  cooldownMs?: number;
  /** Charges it needs to fire (charge-gated abilities). */
  chargeToCast?: number;
  /** Fields merged over the ability's `power`. */
  power?: Partial<AbilityPower>;
  effects?: readonly EffectPatch[];
  /** Extra effects. Each is fixed (it does NOT inherit the ability's per-rank value) unless it states its own
   *  `valuePerRank`; power effects without a `power` of their own share the ability's. */
  addApplies?: readonly AppliedEffect[];
  /** Copies of an effect the ability already applies, laid on another target with the same numbers. */
  mirror?: readonly { effectKey: string; target: AbilityTarget }[];
}

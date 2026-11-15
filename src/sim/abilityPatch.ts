import type { AbilityDef, AppliedEffect } from '@/data/abilities';
import type { AbilityPatch } from '@/data/abilityPatch';
import { effectDef } from '@/data/effects';

// Applies modifier PATCHES to an ability definition (docs/redesign/CLASSES.md §2.5, F2). Pure: the input is
// never mutated and the same (ability, patches) always gives the same definition. It runs when the hero is
// built, so combat reads one plain AbilityDef and never learns that a modifier exists.

function patchEffects(applies: readonly AppliedEffect[], patch: AbilityPatch): AppliedEffect[] {
  const out = applies.map((a) => {
    const change = patch.effects?.find((e) => e.effectKey === a.effectKey);
    if (change === undefined) return a;
    const next: AppliedEffect = { ...a };
    if (change.durationMs !== undefined) next.durationMsOverride = change.durationMs;
    if (change.durationAddMs !== undefined) {
      next.durationMsOverride = (next.durationMsOverride ?? effectDef(a.effectKey).durationMs) + change.durationAddMs;
    }
    if (change.powerScale !== undefined) next.powerScale = (a.powerScale ?? 1) * change.powerScale;
    return next;
  });
  for (const m of patch.mirror ?? []) {
    const original = applies.find((a) => a.effectKey === m.effectKey);
    if (original !== undefined) out.push({ ...original, target: m.target });
  }
  // An added effect is fixed: it does not pick up the ability's per-rank value unless it states its own.
  for (const added of patch.addApplies ?? []) out.push({ ...added, valuePerRank: added.valuePerRank ?? 0 });
  return out;
}

function applyPatch(def: AbilityDef, patch: AbilityPatch): AbilityDef {
  const next: AbilityDef = { ...def, applies: patchEffects(def.applies, patch) };
  if (patch.target !== undefined) next.target = patch.target;
  if (patch.cooldownMs !== undefined) next.cooldownMs = patch.cooldownMs;
  if (patch.chargeToCast !== undefined && def.charge !== undefined) next.charge = { ...def.charge, toCast: patch.chargeToCast };
  if (patch.power !== undefined && def.power !== undefined) next.power = { ...def.power, ...patch.power };
  return next;
}

/** The ability with every patch applied, in order. No patches → the very same definition. */
export function patchAbility(def: AbilityDef, patches: readonly AbilityPatch[]): AbilityDef {
  return patches.reduce(applyPatch, def);
}

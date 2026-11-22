import { SLOT_KEYS, type SlotKey } from '@/data/itemSlots';
import { REF_ILVL_LAG, powerAt } from '@/data/power';

// How the worn gear reads against the stage. Pure. Item levels are stages (docs/redesign/POWER_CURVE.md): the gear is
// judged by its POWER against what a player usually wears there (the typical party's item level, the stage − REF_ILVL_LAG).

/** ≥ +10 % of the usual gear's power (≈ 5 stages better) → well geared; < −18 % (≈ 10 stages worse) → under-geared. */
export const GEAR_OVER = 1.1;
export const GEAR_UNDER = 0.82;

export type GearQuality = 'over' | 'even' | 'under';

/** Average item level over ALL gear slots, an EMPTY slot counting as 0 — so a hero in a single ilvl-1 helm reads
 *  about 0.1 (mostly naked), not 1.0. */
export function averageItemLevel(equipment: Partial<Record<SlotKey, { ilvl: number } | undefined>>): number {
  return SLOT_KEYS.reduce((sum, slot) => sum + (equipment[slot]?.ilvl ?? 0), 0) / SLOT_KEYS.length;
}

/** The usual item level at `globalStage`: what a player wears there. */
export function usualItemLevel(globalStage: number): number {
  return Math.max(1, globalStage - REF_ILVL_LAG);
}

/** The worn gear against what is usually worn at `globalStage` (naked always reads under-geared). */
export function gearQuality(avgItemLevel: number, globalStage: number): GearQuality {
  const ratio = powerAt(avgItemLevel) / powerAt(usualItemLevel(globalStage));
  if (avgItemLevel === 0 || ratio < GEAR_UNDER) return 'under';
  return ratio > GEAR_OVER ? 'over' : 'even';
}

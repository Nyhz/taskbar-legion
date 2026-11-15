import { SLOT_KEYS, type SlotKey } from '@/data/itemSlots';
import { expectedLevel } from '@/data/stageScaling';

// How the worn gear reads against the stage, exactly as the old party panel judged it. Pure.

/** ≥ +10 % over the level the stage's loot is centred on → well geared; < −10 % → under-geared. */
export const GEAR_OVER = 1.1;
export const GEAR_UNDER = 0.9;

export type GearQuality = 'over' | 'even' | 'under';

/** Average item level over ALL gear slots, an EMPTY slot counting as 0 — so a hero in a single ilvl-1 helm reads
 *  about 0.1 (mostly naked), not 1.0. */
export function averageItemLevel(equipment: Partial<Record<SlotKey, { ilvl: number } | undefined>>): number {
  return SLOT_KEYS.reduce((sum, slot) => sum + (equipment[slot]?.ilvl ?? 0), 0) / SLOT_KEYS.length;
}

/** The worn gear against the level loot is centred on at `globalStage` (naked always reads under-geared). */
export function gearQuality(avgItemLevel: number, globalStage: number): GearQuality {
  const ratio = avgItemLevel / Math.max(1, expectedLevel(globalStage));
  if (avgItemLevel === 0 || ratio < GEAR_UNDER) return 'under';
  return ratio > GEAR_OVER ? 'over' : 'even';
}

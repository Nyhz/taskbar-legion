// Tier defs T0–T8. Tier IS rarity: it drives extraStats + sockets + statMultiplier.
// Drop rate is now governed by the per-DIFFICULTY tables (data/difficulties.ts §4) —
// each difficulty caps the droppable tier and weights it; this file owns only a tier's
// intrinsic POWER (extraStats/sockets/statMultiplier), not its rarity. Colors: ART.md
// (T8 is a sentinel the renderer hue-cycles). Stat cap is a hard 4 (T7/T8 share it).

export type ItemTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TierDef {
  tier: ItemTier;
  name: string;
  color: string; // border/text color; 'iridescent' = special-cased animated T8
  extraStats: number; // 0,1,1,2,2,3,3,4,4
  sockets: number; // 0,0,1,1,2,2,3,3,4
  statMultiplier: number;
}

// statMultiplier = the item's BUDGET (docs/redesign/POWER_CURVE.md §2, 2026-11-22): the whole item's power next to a
// T0 of the same level, split over its affixes (data/power affixShare). ×1.2 a step (user, 2026-11-22: «ajustar el
// escalado de la rareza para que el equipo no caduque tan rápido»): a step is worth ~9 stages of the power curve
// (+2 % a stage), so a piece two rarities above the usual lasts about two worlds. T0–T4 are the old values; the top
// is far gentler than the old ×9 (a T8 is 4.3× a T0).
export const TIERS: readonly TierDef[] = [
  { tier: 0, name: 'Normal', color: '#9b9b9b', extraStats: 0, sockets: 0, statMultiplier: 1.0 },
  { tier: 1, name: 'Uncommon', color: '#4caf50', extraStats: 1, sockets: 0, statMultiplier: 1.2 },
  { tier: 2, name: 'Rare', color: '#3d7fe0', extraStats: 1, sockets: 1, statMultiplier: 1.44 },
  { tier: 3, name: 'Epic', color: '#9b4dca', extraStats: 2, sockets: 1, statMultiplier: 1.73 },
  { tier: 4, name: 'Legendary', color: '#e08a2e', extraStats: 2, sockets: 2, statMultiplier: 2.07 },
  { tier: 5, name: 'Mythic', color: '#d33d3d', extraStats: 3, sockets: 2, statMultiplier: 2.49 },
  { tier: 6, name: 'Ancestral', color: '#2bb6a8', extraStats: 3, sockets: 3, statMultiplier: 2.99 },
  { tier: 7, name: 'Divine', color: '#e8c34c', extraStats: 4, sockets: 3, statMultiplier: 3.58 },
  { tier: 8, name: 'Primordial', color: 'iridescent', extraStats: 4, sockets: 4, statMultiplier: 4.3 },
] as const;

export const MAX_SUBSTATS = 4; // hard cap (AFFIXES.md / DIFFICULTY.md §13)

export function tierDef(tier: ItemTier): TierDef {
  const def = TIERS[tier];
  if (def === undefined) throw new Error(`Unknown tier ${tier}`);
  return def;
}

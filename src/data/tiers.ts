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

// statMultiplier: WIDENED so better items feel impactful and the difficulty walls become
// tier-gated. Low/mid tiers (T0-T3) near their old values (baseline/opening unchanged); the
// TOP tiers blow out (T8 1.0→9.0× vs the old 4.2×, per-tier jump growing with tier: ~+20%
// T0→T1 up to ~+50% T7→T8). Farming a difficulty's new top tier is the power spike that
// breaks its world-boss walls (DIFFICULTY.md §9).
export const TIERS: readonly TierDef[] = [
  { tier: 0, name: 'Normal', color: '#9b9b9b', extraStats: 0, sockets: 0, statMultiplier: 1.0 },
  { tier: 1, name: 'Uncommon', color: '#4caf50', extraStats: 1, sockets: 0, statMultiplier: 1.2 },
  { tier: 2, name: 'Rare', color: '#3d7fe0', extraStats: 1, sockets: 1, statMultiplier: 1.45 },
  { tier: 3, name: 'Epic', color: '#9b4dca', extraStats: 2, sockets: 1, statMultiplier: 1.8 },
  { tier: 4, name: 'Legendary', color: '#e08a2e', extraStats: 2, sockets: 2, statMultiplier: 2.3 },
  { tier: 5, name: 'Mythic', color: '#d33d3d', extraStats: 3, sockets: 2, statMultiplier: 3.0 },
  { tier: 6, name: 'Ancestral', color: '#2bb6a8', extraStats: 3, sockets: 3, statMultiplier: 4.2 },
  { tier: 7, name: 'Divine', color: '#e8c34c', extraStats: 4, sockets: 3, statMultiplier: 6.0 },
  { tier: 8, name: 'Primordial', color: 'iridescent', extraStats: 4, sockets: 4, statMultiplier: 9.0 },
] as const;

export const MAX_SUBSTATS = 4; // hard cap (AFFIXES.md / PROGRESSION §13)

export function tierDef(tier: ItemTier): TierDef {
  const def = TIERS[tier];
  if (def === undefined) throw new Error(`Unknown tier ${tier}`);
  return def;
}

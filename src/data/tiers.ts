// Tier defs T0–T8. Tier IS rarity: it drives extraStats + sockets + statMultiplier.
// Drop rate is stage-gated (`unlockStage`) and extremely rare at the top
// (tiny `dropWeight`) — see PROGRESSION §13 / BALANCE.md. Colors: ART.md (T8 is a
// sentinel the renderer hue-cycles). Stat cap is a hard 4 (T7/T8 share it).

export type ItemTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TierDef {
  tier: ItemTier;
  name: string;
  color: string; // border/text color; 'iridescent' = special-cased animated T8
  extraStats: number; // 0,1,1,2,2,3,3,4,4
  sockets: number; // 0,0,1,1,2,2,3,3,4
  statMultiplier: number;
  dropWeight: number; // BASE weight (tiny at top); stage bias + RARITY shift it
  unlockStage: number; // cannot drop before this global stage
}

// `dropWeight` is now the tier's WORLD-100 target weight (the % it should be of drops at
// world 100); rollTier scales it by R(world)^tier so the distribution shifts toward high
// tiers with depth (lootTables.RARITY_DEPTH_P, scripts/sim-rarity.ts). `unlockStage` gates
// a tier until that GLOBAL stage: T0-T3 from the start, then T4..T8 unlock one per 2 worlds
// after world 10 (W12→111, W14→131, W16→151, W18→171, W20→191) — early game is all commons.
// statMultiplier: WIDENED so better items feel impactful and deep walls become tier-gated.
// Low/mid tiers (T0-T3) stay near their old values (baseline + easy opening unchanged); the
// TOP tiers blow out (T8 1.0→9.0× vs the old 4.2×, with the per-tier jump growing with tier:
// ~+20% T0→T1 up to ~+50% T7→T8). So farming a high tier is a real power spike, and the
// rare-drop chase is what breaks the deep zone-boss walls.
export const TIERS: readonly TierDef[] = [
  { tier: 0, name: 'Normal', color: '#9b9b9b', extraStats: 0, sockets: 0, statMultiplier: 1.0, dropWeight: 25, unlockStage: 1 },
  { tier: 1, name: 'Uncommon', color: '#4caf50', extraStats: 1, sockets: 0, statMultiplier: 1.2, dropWeight: 35, unlockStage: 1 },
  { tier: 2, name: 'Rare', color: '#3d7fe0', extraStats: 1, sockets: 1, statMultiplier: 1.45, dropWeight: 15, unlockStage: 1 },
  { tier: 3, name: 'Epic', color: '#9b4dca', extraStats: 2, sockets: 1, statMultiplier: 1.8, dropWeight: 10, unlockStage: 1 },
  { tier: 4, name: 'Legendary', color: '#e08a2e', extraStats: 2, sockets: 2, statMultiplier: 2.3, dropWeight: 7.9, unlockStage: 111 },
  { tier: 5, name: 'Mythic', color: '#d33d3d', extraStats: 3, sockets: 2, statMultiplier: 3.0, dropWeight: 4, unlockStage: 131 },
  { tier: 6, name: 'Ancestral', color: '#2bb6a8', extraStats: 3, sockets: 3, statMultiplier: 4.2, dropWeight: 2, unlockStage: 151 },
  { tier: 7, name: 'Divine', color: '#e8c34c', extraStats: 4, sockets: 3, statMultiplier: 6.0, dropWeight: 1, unlockStage: 171 },
  { tier: 8, name: 'Primordial', color: 'iridescent', extraStats: 4, sockets: 4, statMultiplier: 9.0, dropWeight: 0.1, unlockStage: 191 },
] as const;

export const MAX_SUBSTATS = 4; // hard cap (AFFIXES.md / PROGRESSION §13)

export function tierDef(tier: ItemTier): TierDef {
  const def = TIERS[tier];
  if (def === undefined) throw new Error(`Unknown tier ${tier}`);
  return def;
}

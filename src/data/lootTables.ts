import type { ChestType } from './chests';

// Loot constants shared by the deterministic generator. `GENERATOR_VERSION` is
// stamped on every item's birth certificate — NEVER mutate a version's numbers;
// bump the version instead (ARCHITECTURE determinism contract).

export const GENERATOR_VERSION = 4; // v4: widened tier stat-multipliers (impactful top tiers)

// Tier-rarity DEPTH exponent. rollTier weights each tier by `tierWeight × R(world)^tier`
// where R(world) = (world/100)^RARITY_DEPTH_P. R(100)=1 ⇒ world 100 hits the tuned tier
// target exactly; R<1 early suppresses high tiers; R>1 deep lifts them (no plateau). p
// was fitted so world 1 ≈ 91% T0 and world 200 T8 ≈ 1% (scripts/sim-rarity.ts).
export const RARITY_DEPTH_P = 0.58;

// Per-chest tier richness: a MULTIPLIER on the depth factor R (boss chests behave like a
// deeper world, tilting toward higher tiers). Small because R^tier amplifies it — ×1.15 ≈
// "+1 effective tier" at the high end, ×1.30 ≈ "+2". The zone (act) boss is the jackpot.
export const TIER_CHEST_FACTOR: Record<ChestType, number> = {
  normal: 1.0,
  stageBoss: 1.15,
  zoneBoss: 1.3,
};

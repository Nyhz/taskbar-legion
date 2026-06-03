// Loot constants shared by the deterministic generator. `GENERATOR_VERSION` is
// stamped on every item's birth certificate — NEVER mutate a version's numbers;
// bump the version instead (ARCHITECTURE determinism contract).

// v6: tier roll moved from the infinite world-depth curve (RARITY_DEPTH_P + per-tier
// dropWeight/unlockStage + TIER_CHEST_FACTOR) to the LOCKED per-DIFFICULTY drop tables
// (data/difficulties.ts, DIFFICULTY.md §4) — a flat table per difficulty, tier-capped,
// no depth-gate, no chest tilt. Clean-wipes pre-v6 gear/gems.
export const GENERATOR_VERSION = 6;

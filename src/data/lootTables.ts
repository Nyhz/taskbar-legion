// Loot constants shared by the deterministic generator. `GENERATOR_VERSION` is
// stamped on every item's birth certificate — NEVER mutate a version's numbers;
// bump the version instead (ARCHITECTURE determinism contract).

// v6: tier roll moved from the infinite world-depth curve (RARITY_DEPTH_P + per-tier
// dropWeight/unlockStage + TIER_CHEST_FACTOR) to the LOCKED per-DIFFICULTY drop tables
// (data/difficulties.ts, DIFFICULTY.md §4) — a flat table per difficulty, tier-capped,
// no depth-gate, no chest tilt. Clean-wipes pre-v6 gear/gems.
export const GENERATOR_VERSION = 6;

// ── Perfect stats ──
// Every generated item rolls for "perfect" inherent substats: PERFECT_STAT_CHANCE to
// upgrade one substat (value = its highest possible roll × (1 + PERFECT_STAT_BONUS)), and
// on a hit it rolls AGAIN — up to one perfect per substat (so a T8's 4 substats can give 4
// stars). Synthesize uses a higher chance, transfigure its own (see data/cube.ts). This is
// ADDITIVE: the perfect pass runs AFTER the normal rolls, so a non-perfect item is still
// byte-identical to the pre-feature roll — no GENERATOR_VERSION bump needed.
export const PERFECT_STAT_CHANCE = 0.05;
export const PERFECT_STAT_BONUS = 0.15;

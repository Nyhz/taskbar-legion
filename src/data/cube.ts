// Cube crafting config (data-driven; sim/cube.ts holds the pure logic).

// ── Alchemy: melt items into gold ──
// gold(item) = round(BASE × TIER_MULT^tier × ilvl) — higher tier (exponential) and
// higher ilvl (linear) are both worth more. A T0 ilvl-1 floor item ≈ BASE gold.
export const ALCHEMY_BASE = 8;
export const ALCHEMY_TIER_MULT = 2.2;

// ── Synthesize: 9 same-tier items → 1 higher ──
// Base result is one tier up; this is the chance to "crit" and jump TWO tiers instead
// (clamped to the T8 cap). A lucky craft gets a yellow glow in the Cube UI.
export const SYNTH_DOUBLE_TIER_CHANCE = 0.05;

// ── Transfiguration: re-roll ONE affix on a gear piece ──
// Cost is colour-AGNOSTIC and tiered (see sim/cube.ts `transfigCostOptions`): pay either
// ONE gem at the item's tier, or TWO gems one tier below. No offensive/defensive split —
// any gem of the right tier works, which keeps the recipe simple and uses every colour.

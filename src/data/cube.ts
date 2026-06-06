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

// Synthesized items are "more lucky": each perfect-stat roll uses this chance instead of
// the base PERFECT_STAT_CHANCE (data/lootTables.ts). Same loop (re-roll on a hit, one
// perfect per substat) — only the per-roll probability changes.
export const SYNTH_PERFECT_CHANCE = 0.1;

// When a transfiguration rolls its new affix, this is the chance the replacement comes out
// perfect (independent of the base/synth generation chances).
export const TRANSFIGURE_PERFECT_CHANCE = 0.15;

// ── Transfiguration: re-roll ONE affix on a gear piece ──
// Cost is colour-AGNOSTIC and tiered (see sim/cube.ts `transfigCostOptions`): pay either
// ONE gem at the item's tier, or TWO gems one tier below. No offensive/defensive split —
// any gem of the right tier works, which keeps the recipe simple and uses every colour.

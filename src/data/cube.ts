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

// ── Polish: re-roll the VALUE of one affix, paid in gold ──
// The late-game gold sink (round 16, 2026-11-17, the user's pick among the proposed sinks). The stat stays; only its
// value is rolled again within the item's range, and the player keeps the old or the new one. Endless: every polish
// of the same piece costs POLISH_COST_GROWTH times the last.
// cost(item, n) = POLISH_COST_SHARE × alchemy value × POLISH_COST_GROWTH^n (n = polishes already done on the piece)
//              = 0.8 × 2.2^tier × ilvl × 1.5^n — a tenth of what the piece melts into, so it follows the income.
export const POLISH_COST_SHARE = 0.1;
export const POLISH_COST_GROWTH = 1.5;
/** Chance a polish comes out perfect (★). Below transfiguration's 15 % so a whole set can't be polished to ★. */
export const POLISH_PERFECT_CHANCE = 0.05;

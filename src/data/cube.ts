import type { GemKey } from './gems';

// Cube crafting config (data-driven; sim/cube.ts holds the pure logic).

// ── Alchemy: melt items into gold ──
// gold(item) = round(BASE × TIER_MULT^tier × ilvl) — higher tier (exponential) and
// higher ilvl (linear) are both worth more. A T0 ilvl-1 floor item ≈ BASE gold.
export const ALCHEMY_BASE = 8;
export const ALCHEMY_TIER_MULT = 2.2;

// ── Transfiguration: re-roll ONE affix on a gear piece ──
// Cost is SLOT-INDEPENDENT (armor/jewelry are flex, so a slot→color rule breaks):
// one gem from each family, BOTH at the item's tier. This consumes all six colors
// over time and never depends on whether the slot is offensive or defensive.
export const TRANSFIG_OFFENSIVE_GEMS: GemKey[] = ['ruby', 'topaz', 'amethyst'];
export const TRANSFIG_DEFENSIVE_GEMS: GemKey[] = ['sapphire', 'emerald', 'diamond'];

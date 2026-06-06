// Two storages, each its OWN gold sink:
//  • Inventory (the equip bag): 20 base, buy +1 slot up to 80 total.
//  • Stash (overflow storage): 30 slots/page, buy +1 slot/page (up to +20) and
//    unlock pages (up to 8) — capacity = pages × (30 + slotUpgrades).

export const INVENTORY_BASE = 20;
export const INVENTORY_MAX_SLOTS = 60; // → cap 80

export const STASH_PER_PAGE = 30;
export const STASH_MAX_PAGES = 8;
export const STASH_MAX_SLOTS = 20;

/** Gold for the (k+1)-th inventory slot, k = 0..59. Relaxed scaling (1.25×, was 1.6×)
 *  so the full slot cap is actually reachable by a late-game farmer while mid-game slots
 *  stop competing with tech-node spend: k0=150, k20≈8.3K, k40≈4.5M, k59≈78M
 *  (all 60 ≈ 391M). Boosts QoL and keeps the tech tree as the endless gold sink. */
export function inventorySlotCost(k: number): number {
  return Math.round(150 * 1.25 ** k);
}

export function inventoryCapacity(slotUpgrades: number): number {
  return INVENTORY_BASE + Math.min(INVENTORY_MAX_SLOTS, slotUpgrades);
}

/** Gold to unlock stash page `p`, p = 2..8 (p2=8K … p8≈373M). */
export function stashPageCost(p: number): number {
  return Math.round(8000 * 6 ** (p - 2));
}

/** Gold for the (k+1)-th stash slot/page, k = 0..19. */
export function stashSlotCost(k: number): number {
  return Math.round(250 * 1.5 ** k);
}

export function stashCapacity(pages: number, slotUpgrades: number): number {
  return pages * (STASH_PER_PAGE + Math.min(STASH_MAX_SLOTS, slotUpgrades));
}

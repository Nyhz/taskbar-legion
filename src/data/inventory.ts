// Two storages, each its OWN gold sink:
//  • Inventory (the equip bag): 20 base, buy +1 slot up to 80 total.
//  • Stash (overflow storage): 30 slots/page, buy +1 slot/page (up to +20) and
//    unlock pages (up to 8) — capacity = pages × (30 + slotUpgrades).

export const INVENTORY_BASE = 20;
export const INVENTORY_MAX_SLOTS = 60; // → cap 80

export const STASH_PER_PAGE = 30;
export const STASH_MAX_PAGES = 8;
export const STASH_MAX_SLOTS = 20;

/** Gold for the (k+1)-th inventory slot, k = 0..19 (k0=150 … k19≈5.2M). */
export function inventorySlotCost(k: number): number {
  return Math.round(150 * 1.6 ** k);
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

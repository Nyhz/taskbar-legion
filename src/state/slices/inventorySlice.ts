import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import type { ItemInstance, InvEntry } from '@/sim/items';
import { isItem, isGem } from '@/sim/items';
import { entries, place, removeId, findEntry, sorted, type Slots } from '@/sim/slots';
import type { GemInstance } from '@/data/gems';
import {
  inventoryCapacity,
  stashCapacity,
  inventorySlotCost,
  stashSlotCost,
  stashPageCost,
  INVENTORY_MAX_SLOTS,
  STASH_MAX_SLOTS,
  STASH_MAX_PAGES,
} from '@/data/inventory';
import { synthesize, canSynthesize, alchemyTotal, canTransfigure, transfigureRoll, itemGoldValue } from '@/sim/cube';

// Auto-salvage: when enabled, freshly-looted ITEMS whose tier is marked are melted to gold
// on arrival instead of taking a bag slot — so junk rarities never clog the inventory.
export interface AutoSalvage {
  enabled: boolean;
  tiers: boolean[]; // index = ItemTier (0..8); true ⇒ that rarity is auto-salvaged
}
export const DEFAULT_AUTO_SALVAGE: AutoSalvage = { enabled: false, tiers: Array(9).fill(false) as boolean[] };

// Inventory (the equip bag, 20→40) + Stash (paged overflow storage). Both are
// FIXED-SLOT containers (sim/slots.ts): sparse arrays where a removed item leaves a
// hole and a new item fills the first hole, so moving things never reshuffles the
// grid. Sorting is the only re-pack. Each container is its own gold-driven expansion
// sink; entries move freely between the two.

// Container ids MUST be unique (they're React keys — duplicates break reconciliation:
// ghost cells, items that won't move out). Item ids derive from a roll seed and the
// chest-open RNG repeats its seed sequence across reloads, so freshly-opened loot can
// collide with already-stored items. We force uniqueness at every insertion point and
// when a save is loaded, suffixing a collided id (`#2`, `#3`, …). Cosmetic only — an
// item's stats come from its `origin`, not its id.
function uniquify(entry: InvEntry, taken: Set<string>): InvEntry {
  if (!taken.has(entry.id)) { taken.add(entry.id); return entry; }
  let n = 2;
  while (taken.has(`${entry.id}#${n}`)) n++;
  const id = `${entry.id}#${n}`;
  taken.add(id);
  return { ...entry, id };
}

/** De-duplicate ids across both containers, preserving holes (null) in place. Share
 *  `taken` across calls so an inventory id and a stash id never collide either. */
export function dedupeIds(slots: Slots, taken: Set<string> = new Set()): Slots {
  return slots.map((e) => (e === null ? null : uniquify(e, taken)));
}

/** All ids currently held across both containers (for collision checks). */
function takenIds(inventory: Slots, stash: Slots): Set<string> {
  return new Set([...entries(inventory), ...entries(stash)].map((e) => e.id));
}

export interface InventorySlice {
  inventory: Slots;
  inventorySlotUpgrades: number; // 0..20 → cap 20..40
  stash: Slots;
  stashPages: number; // 1..8
  stashSlotUpgrades: number; // 0..20 (per page)
  autoSalvage: AutoSalvage;

  setAutoSalvage: (enabled: boolean) => void;
  toggleAutoSalvageTier: (tier: number) => void;
  inventoryCap: () => number;
  stashCap: () => number;
  addLoot: (items: ItemInstance[], gems: GemInstance[]) => void;
  addItem: (item: InvEntry) => void;
  removeItem: (id: string) => InvEntry | undefined;
  moveToStash: (id: string) => boolean;
  moveToInventory: (id: string) => boolean;
  buyInventorySlot: () => boolean;
  buyStashSlot: () => boolean;
  buyStashPage: () => boolean;
  /** Re-pack a container by tier (desc) — the ONLY reorder; otherwise items keep their
   *  fixed slots so moving things around never shuffles the grid. */
  sortInventory: () => void;
  sortStash: () => void;
  cubeCombine: (itemIds: string[]) => boolean;
  /** Melt items into gold; returns the gold gained (0 if none were valid). */
  cubeAlchemy: (itemIds: string[]) => number;
  /** Pay the gems + mark the item transfigured (one-time). Does NOT yet change the
   *  affix — the UI previews old vs new, then commits the choice. */
  cubeTransfigure: (itemId: string, gemIds: string[], affixIndex: number) => boolean;
  /** Commit "keep new": replace affix #affixIndex with the rolled replacement. */
  cubeApplyTransfigure: (itemId: string, affixIndex: number) => boolean;
}

export const createInventorySlice: StateCreator<GameStore, [], [], InventorySlice> = (set, get) => ({
  inventory: [],
  inventorySlotUpgrades: 0,
  stash: [],
  stashPages: 1,
  stashSlotUpgrades: 0,
  autoSalvage: DEFAULT_AUTO_SALVAGE,

  setAutoSalvage: (enabled) => set((s) => ({ autoSalvage: { ...s.autoSalvage, enabled } })),
  toggleAutoSalvageTier: (tier) =>
    set((s) => ({ autoSalvage: { ...s.autoSalvage, tiers: s.autoSalvage.tiers.map((v, t) => (t === tier ? !v : v)) } })),

  inventoryCap: () => inventoryCapacity(get().inventorySlotUpgrades),
  stashCap: () => stashCapacity(get().stashPages, get().stashSlotUpgrades),

  // An item is auto-salvaged (melted to gold on arrival) iff auto-salvage is on and its
  // tier is marked. Gems are never auto-salvaged (only gear rarities are filtered).
  // New loot fills inventory holes first, then stash holes, then is dropped.
  addLoot: (items, gems) =>
    set((s) => {
      const as = s.autoSalvage;
      const taken = takenIds(s.inventory, s.stash);
      const invCap = inventoryCapacity(s.inventorySlotUpgrades);
      const stCap = stashCapacity(s.stashPages, s.stashSlotUpgrades);
      let inv = s.inventory;
      let st = s.stash;
      let salvaged = 0;
      for (const raw of [...items, ...gems]) {
        if (isItem(raw) && as.enabled && as.tiers[raw.tier] === true) { salvaged += itemGoldValue(raw); continue; }
        const e = uniquify(raw, taken);
        const ni = place(inv, e, invCap);
        if (ni !== null) { inv = ni; continue; }
        const ns = place(st, e, stCap);
        if (ns !== null) st = ns; // else both full → dropped
      }
      return { inventory: inv, stash: st, gold: s.gold + salvaged };
    }),

  addItem: (item) =>
    set((s) => {
      const as = s.autoSalvage;
      if (isItem(item) && as.enabled && as.tiers[item.tier] === true) return { gold: s.gold + itemGoldValue(item) };
      const it = uniquify(item, takenIds(s.inventory, s.stash));
      const ni = place(s.inventory, it, inventoryCapacity(s.inventorySlotUpgrades));
      if (ni !== null) return { inventory: ni };
      const ns = place(s.stash, it, stashCapacity(s.stashPages, s.stashSlotUpgrades));
      return ns !== null ? { stash: ns } : s;
    }),

  removeItem: (id) => {
    const item = findEntry(get().inventory, id);
    if (item !== undefined) set((s) => ({ inventory: removeId(s.inventory, id) }));
    return item;
  },

  moveToStash: (id) => {
    const s = get();
    const item = findEntry(s.inventory, id);
    if (item === undefined) return false;
    const stCap = s.stashCap();
    if (place(s.stash, item, stCap) === null) return false; // stash full
    set((st) => ({ inventory: removeId(st.inventory, id), stash: place(st.stash, item, stCap) ?? st.stash }));
    return true;
  },

  moveToInventory: (id) => {
    const s = get();
    const item = findEntry(s.stash, id);
    if (item === undefined) return false;
    const invCap = s.inventoryCap();
    if (place(s.inventory, item, invCap) === null) return false; // inventory full
    set((st) => ({ stash: removeId(st.stash, id), inventory: place(st.inventory, item, invCap) ?? st.inventory }));
    return true;
  },

  buyInventorySlot: () => {
    const s = get();
    if (s.inventorySlotUpgrades >= INVENTORY_MAX_SLOTS) return false;
    const cost = inventorySlotCost(s.inventorySlotUpgrades);
    if (s.gold < cost) return false;
    set({ gold: s.gold - cost, inventorySlotUpgrades: s.inventorySlotUpgrades + 1 });
    return true;
  },

  buyStashSlot: () => {
    const s = get();
    if (s.stashSlotUpgrades >= STASH_MAX_SLOTS) return false;
    const cost = stashSlotCost(s.stashSlotUpgrades);
    if (s.gold < cost) return false;
    set({ gold: s.gold - cost, stashSlotUpgrades: s.stashSlotUpgrades + 1 });
    return true;
  },

  buyStashPage: () => {
    const s = get();
    if (s.stashPages >= STASH_MAX_PAGES) return false;
    const cost = stashPageCost(s.stashPages + 1);
    if (s.gold < cost) return false;
    set({ gold: s.gold - cost, stashPages: s.stashPages + 1 });
    return true;
  },

  sortInventory: () => set((s) => ({ inventory: sorted(s.inventory) })),
  sortStash: () => set((s) => ({ stash: sorted(s.stash) })),

  // Cube synthesis: consume 9 same-tier inventory items → 1 of the next tier (bound).
  cubeCombine: (itemIds) => {
    const s = get();
    const ids = new Set(itemIds);
    const inputs = entries(s.inventory).filter(isItem).filter((i) => ids.has(i.id));
    if (!canSynthesize(inputs)) return false;
    const out = synthesize(inputs);
    if (out === null) return false;
    const taken = new Set([...entries(s.inventory).filter((e) => !ids.has(e.id)), ...entries(s.stash)].map((e) => e.id));
    const unique = uniquify(out, taken);
    const invCap = inventoryCapacity(s.inventorySlotUpgrades);
    set((st) => {
      let inv = st.inventory;
      for (const id of ids) inv = removeId(inv, id);
      return { inventory: place(inv, unique, invCap) ?? inv };
    });
    return true;
  },

  // Alchemy: melt the chosen items into gold (any tiers, any count).
  cubeAlchemy: (itemIds) => {
    const s = get();
    const ids = new Set(itemIds);
    const inputs = entries(s.inventory).filter(isItem).filter((i) => ids.has(i.id));
    if (inputs.length === 0) return 0;
    const gold = alchemyTotal(inputs);
    set((st) => {
      let inv = st.inventory;
      for (const id of ids) inv = removeId(inv, id);
      return { inventory: inv, gold: st.gold + gold };
    });
    return gold;
  },

  // Transfigure step 1: validate, consume the two gems, and brand the item as
  // transfigured (forever) — the affix itself isn't touched until the player commits.
  cubeTransfigure: (itemId, gemIds, affixIndex) => {
    const s = get();
    const item = findEntry(s.inventory, itemId);
    if (item === undefined || !isItem(item) || affixIndex < 0 || affixIndex >= item.stats.length) return false;
    const gemSet = new Set(gemIds);
    const gems = entries(s.inventory).filter((e): e is GemInstance => isGem(e) && gemSet.has(e.id));
    if (!canTransfigure(item, gems)) return false;
    set((st) => {
      let inv = st.inventory;
      for (const id of gemIds) inv = removeId(inv, id);
      inv = inv.map((e) => (e !== null && isItem(e) && e.id === itemId ? { ...e, transfigured: true, bound: true } : e));
      return { inventory: inv };
    });
    return true;
  },

  // Transfigure step 2 ("keep new"): swap in the deterministic replacement affix.
  cubeApplyTransfigure: (itemId, affixIndex) => {
    const s = get();
    const item = findEntry(s.inventory, itemId);
    if (item === undefined || !isItem(item) || item.stats[affixIndex] === undefined) return false;
    const rolled = transfigureRoll(item, affixIndex);
    if (rolled === null) return false;
    set((st) => ({
      inventory: st.inventory.map((e) =>
        e !== null && isItem(e) && e.id === itemId
          ? { ...e, stats: e.stats.map((stat, i) => (i === affixIndex ? rolled : stat)) }
          : e,
      ),
    }));
    return true;
  },
});

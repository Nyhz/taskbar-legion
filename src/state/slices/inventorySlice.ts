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
import { synthesize, canSynthesize, synthesizeGems, canSynthesizeGems, alchemyTotal, canTransfigure, transfigureRoll, itemGoldValue } from '@/sim/cube';
import { getBonuses } from '@/sim/bonuses';
import { SYNTH_DOUBLE_TIER_CHANCE } from '@/data/cube';

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
// ghost cells, items that won't move out). Identity is now MINTED from a monotonic
// per-save counter (`nextEntryId`, ids like `e0`, `e1`, …) at every creation point —
// fully decoupled from the roll seed, so two items that roll identical content still get
// distinct ids. Stats come from the item itself; the id carries no meaning beyond identity.
const MINTED_ID_RE = /^e(\d+)$/;
export const mintedIdString = (n: number): string => `e${n}`;

/** Highest minted id (`e<n>`) across loaded containers, so the counter resumes ABOVE any
 *  id already in the save even if the saved counter is missing/stale (legacy `i*`/`g*` ids
 *  are ignored — they never collide with the `e*` namespace). */
export function maxMintedId(...slotsList: Slots[]): number {
  let max = 0;
  for (const slots of slotsList) {
    for (const e of entries(slots)) {
      const m = MINTED_ID_RE.exec(e.id);
      if (m !== null) max = Math.max(max, Number(m[1]));
    }
  }
  return max;
}

// Legacy collision guard, used ONLY on load: pre-minter saves derived ids from the roll
// seed, so stored entries can collide. Suffix a collided id (`#2`, `#3`, …). Newly-minted
// `e<n>` ids are unique by construction and pass through untouched.
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

export interface InventorySlice {
  inventory: Slots;
  inventorySlotUpgrades: number; // 0..20 → cap 20..40
  stash: Slots;
  stashPages: number; // 1..8
  stashSlotUpgrades: number; // 0..20 (per page)
  nextEntryId: number; // monotonic id minter for every gear/gem entry (decoupled from rollSeed)
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
  /** Drag-drop with SLOT PRECISION: drop the entry at EXACTLY `index` in `dest` (inventory or
   *  stash), swapping back whatever already sat there (within OR across the two containers).
   *  Holes are padded up to `index`, so you can drop onto a later stash page even when earlier
   *  slots are empty. No-op if the entry is dropped on its own slot or `index` exceeds capacity. */
  moveEntryToSlot: (id: string, dest: 'inventory' | 'stash', index: number) => void;
  /** Move every gem in the inventory into the stash (until the stash fills); leaves gear. */
  stashAllGems: () => void;
  buyInventorySlot: () => boolean;
  buyStashSlot: () => boolean;
  buyStashPage: () => boolean;
  /** Re-pack a container by tier (desc) — the ONLY reorder; otherwise items keep their
   *  fixed slots so moving things around never shuffles the grid. */
  sortInventory: () => void;
  sortStash: () => void;
  /** Synthesize 9 same-kind, same-tier entries (items OR gems) → 1 of the next tier. Inputs
   *  may live in the inventory AND/OR the stash; the result is placed in the bag (else stash).
   *  Returns the created entry so the UI can preview it (its tier reveals a +2 "lucky"), or null. */
  cubeCombine: (entryIds: string[]) => InvEntry | null;
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
  nextEntryId: 1,
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
      const invCap = inventoryCapacity(s.inventorySlotUpgrades);
      const stCap = stashCapacity(s.stashPages, s.stashSlotUpgrades);
      let inv = s.inventory;
      let st = s.stash;
      let salvaged = 0;
      let nextId = s.nextEntryId;
      for (const raw of [...items, ...gems]) {
        if (isItem(raw) && as.enabled && as.tiers[raw.tier] === true) { salvaged += itemGoldValue(raw); continue; }
        const e = { ...raw, id: mintedIdString(nextId) }; // mint a fresh unique id
        const ni = place(inv, e, invCap);
        if (ni !== null) { inv = ni; nextId++; continue; }
        const ns = place(st, e, stCap);
        if (ns !== null) { st = ns; nextId++; } // else both full → dropped, id not consumed
      }
      return { inventory: inv, stash: st, gold: s.gold + salvaged, nextEntryId: nextId };
    }),

  addItem: (item) =>
    set((s) => {
      const as = s.autoSalvage;
      if (isItem(item) && as.enabled && as.tiers[item.tier] === true) return { gold: s.gold + itemGoldValue(item) };
      const it = { ...item, id: mintedIdString(s.nextEntryId) }; // mint a fresh unique id
      const ni = place(s.inventory, it, inventoryCapacity(s.inventorySlotUpgrades));
      if (ni !== null) return { inventory: ni, nextEntryId: s.nextEntryId + 1 };
      const ns = place(s.stash, it, stashCapacity(s.stashPages, s.stashSlotUpgrades));
      return ns !== null ? { stash: ns, nextEntryId: s.nextEntryId + 1 } : s;
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

  // Exact-slot move/swap for drag-drop. Resolves the dragged entry's source container, then
  // either swaps two slots in one container or moves across containers (sending the displaced
  // occupant — or a hole — back to the source slot). Padding holes up to `index` is what lets
  // an item land on stash page 2 while page 1 is still half-empty.
  moveEntryToSlot: (id, dest, index) =>
    set((s) => {
      const srcInvIdx = s.inventory.findIndex((e) => e !== null && e.id === id);
      const srcStIdx = s.stash.findIndex((e) => e !== null && e.id === id);
      const src: 'inventory' | 'stash' | null = srcInvIdx >= 0 ? 'inventory' : srcStIdx >= 0 ? 'stash' : null;
      if (src === null) return s;
      const srcIdx = src === 'inventory' ? srcInvIdx : srcStIdx;
      const destCap = dest === 'inventory'
        ? inventoryCapacity(s.inventorySlotUpgrades)
        : stashCapacity(s.stashPages, s.stashSlotUpgrades);
      if (index < 0 || index >= destCap) return s;
      if (src === dest && srcIdx === index) return s; // dropped on its own slot — no-op

      const inv = s.inventory.slice();
      const stash = s.stash.slice();
      if (src === dest) {
        const arr = dest === 'inventory' ? inv : stash;
        while (arr.length <= index) arr.push(null);
        const tmp = arr[index] ?? null;
        arr[index] = arr[srcIdx] ?? null;
        arr[srcIdx] = tmp; // swap whatever sat at the target (may be null) back into the old slot
      } else {
        const srcArr = src === 'inventory' ? inv : stash;
        const destArr = dest === 'inventory' ? inv : stash;
        while (destArr.length <= index) destArr.push(null);
        const moving = srcArr[srcIdx] ?? null;
        srcArr[srcIdx] = destArr[index] ?? null; // displaced occupant (or a hole) → source slot
        destArr[index] = moving; // dragged entry → exact target slot
      }
      return { inventory: inv, stash };
    }),

  // Sweep every gem from the bag into the stash, in slot order, stopping if the stash
  // fills (the overflow stays in the bag). Gear is untouched.
  stashAllGems: () =>
    set((st) => {
      const stCap = stashCapacity(st.stashPages, st.stashSlotUpgrades);
      let inv = st.inventory;
      let stash = st.stash;
      for (const gem of entries(st.inventory).filter(isGem)) {
        const placed = place(stash, gem, stCap);
        if (placed === null) break; // stash full — leave the rest in the bag
        stash = placed;
        inv = removeId(inv, gem.id);
      }
      return { inventory: inv, stash };
    }),

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
  cubeCombine: (entryIds) => {
    const s = get();
    // Resolve each id from the inventory first, else the stash (stash inputs are allowed via
    // the "include stash" toggle); bail if any id is missing.
    const resolved = entryIds.map((id) => {
      const inv = findEntry(s.inventory, id);
      if (inv !== undefined) return { entry: inv, from: 'inv' as const };
      const st = findEntry(s.stash, id);
      return st !== undefined ? { entry: st, from: 'stash' as const } : null;
    });
    if (resolved.some((r) => r === null)) return null;
    const found = resolved as { entry: InvEntry; from: 'inv' | 'stash' }[];
    const inputs = found.map((r) => r.entry);

    // Base 5% +2-tier chance + the Transmuter's Fortune tech bonus (capped at +5%).
    const doubleChance = SYNTH_DOUBLE_TIER_CHANCE + getBonuses(s.techRanks, s.ownedPets).synthDoubleChance;

    // All-items or all-gems; mixed batches are rejected.
    let out: InvEntry | null = null;
    if (inputs.every(isItem)) out = canSynthesize(inputs) ? synthesize(inputs, doubleChance) : null;
    else if (inputs.every(isGem)) out = canSynthesizeGems(inputs) ? synthesizeGems(inputs, doubleChance) : null;
    if (out === null) return null;

    const invCap = inventoryCapacity(s.inventorySlotUpgrades);
    const stCap = stashCapacity(s.stashPages, s.stashSlotUpgrades);
    let made: InvEntry | null = null;
    set((st) => {
      let inv = st.inventory;
      let stash = st.stash;
      for (const r of found) {
        if (r.from === 'inv') inv = removeId(inv, r.entry.id);
        else stash = removeId(stash, r.entry.id);
      }
      const minted = { ...out, id: mintedIdString(st.nextEntryId) }; // mint a fresh unique id
      const placedInv = place(inv, minted, invCap);
      if (placedInv !== null) { made = minted; return { inventory: placedInv, stash, nextEntryId: st.nextEntryId + 1 }; }
      const placedStash = place(stash, minted, stCap); // bag full → fall back to the stash
      if (placedStash !== null) { made = minted; return { inventory: inv, stash: placedStash, nextEntryId: st.nextEntryId + 1 }; }
      return { inventory: inv, stash }; // both full (shouldn't happen: freed 9)
    });
    return made;
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
      inv = inv.map((e) => (e !== null && isItem(e) && e.id === itemId ? { ...e, transfigured: true } : e)); // no binding (no trading/bound gear)
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

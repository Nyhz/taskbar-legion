import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import type { HeroState, Loadout } from '@/persistence/saveSchema';
import type { ItemInstance } from '@/sim/items';
import { isGem, isItem } from '@/sim/items';
import { findEntry, place, removeId } from '@/sim/slots';
import { heroAbilities, canLearnNewAbility } from '@/sim/loadout';
import { inventoryCapacity, stashCapacity } from '@/data/inventory';
import { slotFamily, type SlotKey } from '@/data/itemSlots';
import { totalExpToReach, MAX_LEVEL } from '@/data/stageScaling';
import { talentNodes, rowUnlockThreshold } from '@/data/talents';

// The fielded roster (≤3 heroes). Equipment, levels and talents live here (the
// save-shaped HeroState); the engine builds combat units from it. Cross-slice
// actions (equip moves an item between inventory ⇄ a hero) operate over the whole
// store. Updates are immutable; combat-affecting changes bump `configEpoch`.

export interface PartySlice {
  roster: HeroState[];
  selectedHeroId: string;

  selectHero: (id: string) => void;
  gainExp: (amount: number, aliveIds?: readonly string[]) => void;
  equip: (heroId: string, itemId: string, targetSlot?: SlotKey) => void;
  unequip: (heroId: string, slot: SlotKey) => void;
  socketGem: (heroId: string, slot: SlotKey, socketIdx: number, gemId: string) => void;
  spendTalent: (heroId: string, nodeKey: string) => boolean;
  refundTalent: (heroId: string, nodeKey: string) => boolean;
  respec: (heroId: string) => void;
  /** Snapshot the hero's current equipment + talents into loadout `index` (0=Farm, 1=Boss). */
  saveLoadout: (heroId: string, index: number) => void;
  /** Restore loadout `index`: re-equip every saved item still available (inventory/stash/own
   *  gear; missing or other-hero items are skipped) and re-apply the saved talents. */
  applyLoadout: (heroId: string, index: number) => void;
  /** Forget loadout `index`. */
  clearLoadout: (heroId: string, index: number) => void;
  addHero: (classKey: string) => void;
  switchClass: (heroId: string, classKey: string) => void;
}

export const LOADOUT_COUNT = 2;
export const LOADOUT_LABELS = ['Farm', 'Boss'] as const;

function freshHero(id: string, classKey: string, talents: Record<string, number> = {}): HeroState {
  // Seed the active set from any abilities the hero starts ranked in (≤2), so what's
  // shown in the party screen matches what actually fires from frame one.
  const activeAbilities = heroAbilities(classKey, talents).slice(0, 2).map((a) => a.def.key);
  // Every hero starts L1 with ONE talent point. The default knight pre-spends its
  // point on its signature, so subtract anything already assigned → new heroes get a
  // free unassigned point; the knight's is just pre-allocated.
  const spent = Object.values(talents).reduce((a, b) => a + b, 0);
  const talentPoints = Math.max(0, 1 - spent);
  return { id, classKey, level: 1, exp: 0, equipment: {}, talentPoints, talents, activeAbilities, loadouts: [null, null] };
}

function mapHero(roster: HeroState[], id: string, fn: (h: HeroState) => HeroState): HeroState[] {
  return roster.map((h) => (h.id === id ? fn(h) : h));
}

/** Where an inventory item actually lands: a caller-preferred slot if it's in the
 *  item's family (drag onto a specific cell), else the first empty family slot, else
 *  the item's own slot (replace). Rings are the only multi-slot family, so a ring
 *  fills an empty ring slot before replacing one. */
function resolveEquipSlot(
  birth: SlotKey,
  equipment: HeroState['equipment'],
  target: SlotKey | undefined,
): SlotKey {
  const family = slotFamily(birth);
  if (target !== undefined && family.includes(target)) return target;
  return family.find((sl) => equipment[sl] === undefined) ?? birth;
}

export const createPartySlice: StateCreator<GameStore, [], [], PartySlice> = (set, get) => ({
  roster: [freshHero('h0', 'knight')], // starts L1 with 1 unassigned talent point, like every hero
  selectedHeroId: 'h0',

  selectHero: (id) => set({ selectedHeroId: id }),

  gainExp: (amount, aliveIds) =>
    set((s) => {
      // `aliveIds` (when given) restricts XP to living heroes — a dead hero earns
      // nothing until it respawns. Omitted (offline catch-up) ⇒ the whole roster gains.
      const eligible = aliveIds === undefined ? undefined : new Set(aliveIds);
      let leveled = false;
      const roster = s.roster.map((h) => {
        if (eligible !== undefined && !eligible.has(h.id)) return h; // dead → no XP
        const exp = h.exp + amount;
        let level = h.level;
        let points = h.talentPoints;
        while (level < MAX_LEVEL && exp >= totalExpToReach(level + 1)) {
          level += 1;
          points += 1;
        }
        if (level === h.level) return { ...h, exp };
        leveled = true;
        return { ...h, exp, level, talentPoints: points };
      });
      // A level-up changes base stats → rebuild combatants (bump configEpoch).
      return leveled ? { roster, configEpoch: s.configEpoch + 1 } : { roster };
    }),

  equip: (heroId, itemId, targetSlot) => {
    const s = get();
    const found = findEntry(s.inventory, itemId);
    const hero = s.roster.find((h) => h.id === heroId);
    if (found === undefined || hero === undefined || !isItem(found)) return; // gems aren't equipped
    // No level gate: ilvl is a pure power stat now — gear (not level) carries content, so any
    // hero may equip any item. Only the class lock on weapons/off-hands remains.
    if (found.classKey !== undefined && found.classKey !== hero.classKey) return; // class-locked weapon/off-hand
    const item = found;
    const slot = resolveEquipSlot(item.slot, hero.equipment, targetSlot);
    const previous = hero.equipment[slot];
    const invCap = s.inventoryCap();
    set((st) => {
      // Remove the equipped item (leaves a hole at its slot); a swapped-out item drops
      // into that same hole, so the bag never reshuffles.
      let inv = removeId(st.inventory, itemId);
      if (previous !== undefined) inv = place(inv, previous, invCap) ?? inv;
      return {
        inventory: inv,
        roster: mapHero(st.roster, heroId, (h) => ({ ...h, equipment: { ...h.equipment, [slot]: item } })),
        configEpoch: st.configEpoch + 1,
      };
    });
  },

  unequip: (heroId, slot) => {
    const s = get();
    const hero = s.roster.find((h) => h.id === heroId);
    const item = hero?.equipment[slot];
    if (item === undefined) return;
    const invCap = s.inventoryCap();
    if (place(s.inventory, item, invCap) === null) return; // no room
    set((st) => ({
      inventory: place(st.inventory, item, invCap) ?? st.inventory,
      roster: mapHero(st.roster, heroId, (h) => {
        const equipment = { ...h.equipment };
        delete equipment[slot];
        return { ...h, equipment };
      }),
      configEpoch: st.configEpoch + 1,
    }));
  },

  socketGem: (heroId, slot, socketIdx, gemId) => {
    const s = get();
    // The gem may live in the bag OR the stash (stash gems can be dragged straight onto
    // equipped gear) — find it wherever it is.
    const found = findEntry(s.inventory, gemId) ?? findEntry(s.stash, gemId);
    const gem = found !== undefined && isGem(found) ? found : undefined;
    const hero = s.roster.find((h) => h.id === heroId);
    const item = hero?.equipment[slot];
    const socket = item?.sockets[socketIdx];
    // A filled socket is allowed: the new gem REPLACES it (a swap), and the old gem is
    // discarded — the player confirmed it via the swap chooser. An empty socket just fills.
    if (gem === undefined || item === undefined || socket === undefined) return;
    const sockets = item.sockets.map((so, i) => (i === socketIdx ? { gem } : so));
    const updated = { ...item, sockets }; // no binding — this game has no trading/bound gear
    set((st) => ({
      // Consume the gem from whichever container held it (removeId is a no-op on the other).
      inventory: removeId(st.inventory, gemId),
      stash: removeId(st.stash, gemId),
      roster: mapHero(st.roster, heroId, (h) => ({ ...h, equipment: { ...h.equipment, [slot]: updated } })),
      configEpoch: st.configEpoch + 1,
    }));
  },

  spendTalent: (heroId, nodeKey) => {
    const s = get();
    const hero = s.roster.find((h) => h.id === heroId);
    if (hero === undefined || hero.talentPoints <= 0) return false;
    const node = talentNodes(hero.classKey).find((n) => n.key === nodeKey);
    if (node === undefined) return false;
    const spent = Object.values(hero.talents).reduce((a, b) => a + b, 0);
    if (spent < rowUnlockThreshold(node.rowIndex)) return false; // row locked
    if ((hero.talents[nodeKey] ?? 0) >= node.maxRank) return false;
    // Learning a NEW ability (first point) is gated: at most MAX_ACTIVE_ABILITIES ability
    // nodes may be ranked, since the ranked set IS the active loadout. Already-ranked
    // abilities and passive nodes are never blocked.
    const learningNew = node.kind === 'ability' && (hero.talents[nodeKey] ?? 0) === 0;
    if (learningNew && !canLearnNewAbility(hero.classKey, hero.talents)) return false;
    // A freshly-learned ability auto-fills a free active slot so it starts firing at once.
    const autoActivate = learningNew && node.abilityKey !== undefined;
    set((st) => ({
      roster: mapHero(st.roster, heroId, (h) => {
        const active = h.activeAbilities ?? [];
        const nextActive = autoActivate && node.abilityKey !== undefined && active.length < 2 && !active.includes(node.abilityKey)
          ? [...active, node.abilityKey]
          : active;
        return {
          ...h,
          talentPoints: h.talentPoints - 1,
          talents: { ...h.talents, [nodeKey]: (h.talents[nodeKey] ?? 0) + 1 },
          activeAbilities: nextActive,
        };
      }),
      configEpoch: st.configEpoch + 1,
    }));
    return true;
  },

  // Refund ONE rank of a node (right-click) → +1 point. Rejected if removing the point
  // would drop `spent` below a still-ranked HIGHER row's unlock threshold (you'd have
  // points stranded in a now-locked row) — refund those rows first.
  refundTalent: (heroId, nodeKey) => {
    const s = get();
    const hero = s.roster.find((h) => h.id === heroId);
    if (hero === undefined) return false;
    const cur = hero.talents[nodeKey] ?? 0;
    if (cur <= 0) return false;
    const node = talentNodes(hero.classKey).find((n) => n.key === nodeKey);
    if (node === undefined) return false;
    const nextTalents: Record<string, number> = { ...hero.talents };
    if (cur - 1 <= 0) delete nextTalents[nodeKey];
    else nextTalents[nodeKey] = cur - 1;
    const newSpent = Object.values(nextTalents).reduce((a, b) => a + b, 0);
    for (const n of talentNodes(hero.classKey)) {
      if ((nextTalents[n.key] ?? 0) > 0 && newSpent < rowUnlockThreshold(n.rowIndex)) return false;
    }
    // An ability node dropped to rank 0 is no longer learned → drop it from the active set.
    const deactivate = node.kind === 'ability' && node.abilityKey !== undefined && cur - 1 === 0;
    set((st) => ({
      roster: mapHero(st.roster, heroId, (h) => ({
        ...h,
        talentPoints: h.talentPoints + 1,
        talents: nextTalents,
        activeAbilities: deactivate && node.abilityKey !== undefined
          ? (h.activeAbilities ?? []).filter((k) => k !== node.abilityKey)
          : h.activeAbilities,
      })),
      configEpoch: st.configEpoch + 1,
    }));
    return true;
  },

  respec: (heroId) =>
    set((st) => ({
      roster: mapHero(st.roster, heroId, (h) => {
        const refunded = Object.values(h.talents).reduce((a, b) => a + b, 0);
        // Wiping talents un-ranks every ability → clear the active selection too.
        return { ...h, talentPoints: h.talentPoints + refunded, talents: {}, activeAbilities: [] };
      }),
      configEpoch: st.configEpoch + 1,
    })),

  // Snapshot the current equipment + talents into a Farm/Boss slot. Gear is stored by id, so
  // the loadout shares the live items — saving never copies/duplicates gear.
  saveLoadout: (heroId, index) =>
    set((st) => {
      const hero = st.roster.find((h) => h.id === heroId);
      if (hero === undefined || index < 0 || index >= LOADOUT_COUNT) return st;
      const items: Partial<Record<SlotKey, string>> = {};
      for (const [slot, item] of Object.entries(hero.equipment)) {
        if (item !== undefined) items[slot as SlotKey] = item.id;
      }
      const lo: Loadout = {
        classKey: hero.classKey,
        items,
        talents: { ...hero.talents },
        activeAbilities: [...hero.activeAbilities],
      };
      const loadouts = [...(hero.loadouts ?? [null, null])];
      while (loadouts.length < LOADOUT_COUNT) loadouts.push(null);
      loadouts[index] = lo;
      return { roster: mapHero(st.roster, heroId, (h) => ({ ...h, loadouts })) };
    }),

  // Restore a saved loadout. Each saved item id is resolved from wherever it currently lives —
  // own equipment, the shared inventory, or the stash; items that were sold/deleted or are now
  // worn by ANOTHER hero are in none of those pools and are simply skipped (the rest still load).
  // Talents are only re-applied if the hero is still the class the loadout was saved for.
  applyLoadout: (heroId, index) =>
    set((st) => {
      const hero = st.roster.find((h) => h.id === heroId);
      const lo = hero?.loadouts?.[index];
      if (hero === undefined || lo === undefined || lo === null) return st;

      const invCap = inventoryCapacity(st.inventorySlotUpgrades);
      const stCap = stashCapacity(st.stashPages, st.stashSlotUpgrades);

      const ownEquip = new Map<string, ItemInstance>();
      for (const it of Object.values(hero.equipment)) if (it !== undefined) ownEquip.set(it.id, it);

      const resolved: Partial<Record<SlotKey, ItemInstance>> = {};
      const usedIds = new Set<string>();
      for (const [slotStr, itemId] of Object.entries(lo.items)) {
        if (itemId === undefined) continue;
        const found = ownEquip.get(itemId) ?? findEntry(st.inventory, itemId) ?? findEntry(st.stash, itemId);
        if (found === undefined || !isItem(found)) continue; // sold/deleted/on another hero
        if (found.classKey !== undefined && found.classKey !== hero.classKey) continue; // class lock
        resolved[slotStr as SlotKey] = found;
        usedIds.add(itemId);
      }

      // Pull every newly-equipped item out of the shared containers…
      let inv = st.inventory;
      let stash = st.stash;
      for (const id of usedIds) { inv = removeId(inv, id); stash = removeId(stash, id); }

      // …and return any currently-worn piece the loadout doesn't reuse to the bag (then stash).
      for (const it of Object.values(hero.equipment)) {
        if (it === undefined || usedIds.has(it.id)) continue;
        const placedInv = place(inv, it, invCap);
        if (placedInv !== null) { inv = placedInv; continue; }
        const placedStash = place(stash, it, stCap);
        if (placedStash !== null) { stash = placedStash; continue; }
        inv = [...inv, it]; // last resort: never destroy an item, even if both containers are full
      }

      const applyTalents = lo.classKey === hero.classKey;
      const totalEarned = hero.talentPoints + Object.values(hero.talents).reduce((a, b) => a + b, 0);
      const wanted = Object.values(lo.talents).reduce((a, b) => a + b, 0);

      return {
        inventory: inv,
        stash,
        roster: mapHero(st.roster, heroId, (h) => ({
          ...h,
          equipment: resolved,
          ...(applyTalents
            ? {
                talents: { ...lo.talents },
                talentPoints: Math.max(0, totalEarned - wanted),
                activeAbilities: [...lo.activeAbilities],
              }
            : {}),
        })),
        configEpoch: st.configEpoch + 1,
      };
    }),

  clearLoadout: (heroId, index) =>
    set((st) => {
      const hero = st.roster.find((h) => h.id === heroId);
      if (hero === undefined || index < 0 || index >= LOADOUT_COUNT) return st;
      const loadouts = [...(hero.loadouts ?? [null, null])];
      while (loadouts.length < LOADOUT_COUNT) loadouts.push(null);
      loadouts[index] = null;
      return { roster: mapHero(st.roster, heroId, (h) => ({ ...h, loadouts })) };
    }),

  addHero: (classKey) => {
    const s = get();
    if (s.roster.length >= 3) return;
    if (!s.unlockedClasses.includes(classKey)) return;
    if (s.roster.some((h) => h.classKey === classKey)) return;
    const id = `h${s.roster.length}`;
    set((st) => ({ roster: [...st.roster, freshHero(id, classKey)], configEpoch: st.configEpoch + 1 }));
  },

  switchClass: (heroId, classKey) => {
    const s = get();
    if (!s.unlockedClasses.includes(classKey)) return;
    set((st) => ({
      roster: mapHero(st.roster, heroId, (h) => ({ ...h, classKey, talents: {}, activeAbilities: [] })),
      configEpoch: st.configEpoch + 1,
    }));
  },
});

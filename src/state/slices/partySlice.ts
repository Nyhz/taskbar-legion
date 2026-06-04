import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import type { HeroState } from '@/persistence/saveSchema';
import { isGem, isItem } from '@/sim/items';
import { findEntry, place, removeId } from '@/sim/slots';
import { heroAbilities } from '@/sim/loadout';
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
  toggleActiveAbility: (heroId: string, abilityKey: string) => void;
  equip: (heroId: string, itemId: string, targetSlot?: SlotKey) => void;
  unequip: (heroId: string, slot: SlotKey) => void;
  socketGem: (heroId: string, slot: SlotKey, socketIdx: number, gemId: string) => void;
  spendTalent: (heroId: string, nodeKey: string) => boolean;
  refundTalent: (heroId: string, nodeKey: string) => boolean;
  respec: (heroId: string) => void;
  addHero: (classKey: string) => void;
  switchClass: (heroId: string, classKey: string) => void;
}

function freshHero(id: string, classKey: string, talents: Record<string, number> = {}): HeroState {
  // Seed the active set from any abilities the hero starts ranked in (≤2), so what's
  // shown in the party screen matches what actually fires from frame one.
  const activeAbilities = heroAbilities(classKey, talents).slice(0, 2).map((a) => a.def.key);
  // Every hero starts L1 with ONE talent point. The default knight pre-spends its
  // point on its signature, so subtract anything already assigned → new heroes get a
  // free unassigned point; the knight's is just pre-allocated.
  const spent = Object.values(talents).reduce((a, b) => a + b, 0);
  const talentPoints = Math.max(0, 1 - spent);
  return { id, classKey, level: 1, exp: 0, equipment: {}, talentPoints, talents, activeAbilities };
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

  // Toggle an ability in the hero's active set (max 2). Adding a 3rd drops the oldest
  // (FIFO) so a click always succeeds. Bumps configEpoch → the engine rebuilds the
  // combatant's cast list.
  toggleActiveAbility: (heroId, abilityKey) =>
    set((st) => ({
      roster: mapHero(st.roster, heroId, (h) => {
        const cur = h.activeAbilities ?? [];
        let next: string[];
        if (cur.includes(abilityKey)) next = cur.filter((k) => k !== abilityKey);
        else if (cur.length < 2) next = [...cur, abilityKey];
        else next = [...cur.slice(1), abilityKey];
        return { ...h, activeAbilities: next };
      }),
      configEpoch: st.configEpoch + 1,
    })),

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
    // Ranking a NOT-yet-active ability for the first time auto-fills a free active
    // slot (≤2), so a freshly-learned ability starts working without a second click.
    const autoActivate = node.kind === 'ability' && node.abilityKey !== undefined && (hero.talents[nodeKey] ?? 0) === 0;
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

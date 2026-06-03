import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import { techNode, nodeCost, migrateTechRanks } from '@/data/techTree';
import { resumeStageFor } from '@/data/stageScaling';
import { dedupeIds, DEFAULT_AUTO_SALVAGE } from './inventorySlice';
import { classDef, CLASSES } from '@/data/classes';
import { SLOTS, type SlotKey } from '@/data/itemSlots';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { UI_SCALE } from './uiSlice';
import type { ItemInstance, InvEntry } from '@/sim/items';
import { heroAbilities } from '@/sim/loadout';
import type { SaveV1 } from '@/persistence/saveSchema';

// Account-wide progression: gold (the main currency), zone keys (mirrored from the
// sim), tech ranks (gold-bought), unlocked classes. `configEpoch` bumps whenever
// something that affects combat changes, so the engine knows to rebuild heroes.

// Keep only post-overhaul gear/gems on load — an older generatorVersion is a clean WIPE
// (the gear overhaul changed item shape: array base affix, class weapons, new slots).
function keepEntry(e: InvEntry): boolean {
  return e.origin.generatorVersion === GENERATOR_VERSION;
}

// Drop equipped items that are pre-overhaul or sit in a now-removed slot (e.g. ring1/ring2).
function sanitizeEquipment(eq: Partial<Record<SlotKey, ItemInstance>>): Partial<Record<SlotKey, ItemInstance>> {
  const out: Partial<Record<SlotKey, ItemInstance>> = {};
  for (const [slot, item] of Object.entries(eq)) {
    if (item !== undefined && SLOTS[slot as SlotKey] !== undefined && item.origin.generatorVersion === GENERATOR_VERSION) {
      out[slot as SlotKey] = item;
    }
  }
  return out;
}

export interface ProgressSlice {
  gold: number;
  researchPoints: number; // reserved/unused in v1
  techRanks: Record<string, number>;
  unlockedClasses: string[];
  seed: number;
  configEpoch: number;
  resumeStage: number; // globalStageIndex to resume the sim at (from a loaded save)
  maxClearedStage: number; // highest stage whose boss was beaten (fallback for save when no engine)
  lootRngState: number; // serialized chest-open RNG state (0 = unseeded → derive from seed)

  addGold: (n: number) => void;
  bumpConfig: () => void;
  canBuyTech: (key: string) => boolean;
  buyTech: (key: string) => boolean;
  unlockClass: (key: string) => boolean;
  hydrate: (save: SaveV1) => void;
}

export const createProgressSlice: StateCreator<GameStore, [], [], ProgressSlice> = (set, get) => ({
  gold: 0,
  researchPoints: 0,
  techRanks: {},
  unlockedClasses: ['knight'],
  seed: 0xc0ffee,
  configEpoch: 0,
  resumeStage: 1,
  maxClearedStage: 0,
  lootRngState: 0,

  addGold: (n) => set((s) => ({ gold: s.gold + n })),
  bumpConfig: () => set((s) => ({ configEpoch: s.configEpoch + 1 })),

  canBuyTech: (key) => {
    const s = get();
    const node = techNode(key);
    const rank = s.techRanks[key] ?? 0;
    if (rank >= node.maxRanks) return false; // capped nodes (auto-open, party size)
    return s.gold >= nodeCost(node, rank);
  },

  buyTech: (key) => {
    if (!get().canBuyTech(key)) return false;
    const node = techNode(key);
    const rank = get().techRanks[key] ?? 0;
    set((s) => ({
      gold: s.gold - nodeCost(node, rank),
      techRanks: { ...s.techRanks, [key]: rank + 1 },
      configEpoch: s.configEpoch + 1,
    }));
    return true;
  },

  unlockClass: (key) => {
    const s = get();
    if (s.unlockedClasses.includes(key)) return false;
    const unlock = classDef(key).unlock;
    if (unlock.type !== 'gold' || s.gold < unlock.cost) return false;
    set({ gold: s.gold - unlock.cost, unlockedClasses: [...s.unlockedClasses, key] });
    return true;
  },

  // Restore the whole player state from a save (called once on boot, before the
  // engine constructs). Bumps configEpoch so the engine rebuilds from the roster.
  hydrate: (save) =>
    set((s) => ({
      gold: save.gold,
      researchPoints: save.researchPoints,
      techRanks: migrateTechRanks(save.techTree), // pre-rework key names → new flat nodes
      // Drop classes that no longer exist (e.g. a save made before Mage/Rogue were
      // removed) so the engine never builds a combatant for an unknown class. Knight
      // is always kept so the party can never end up empty.
      unlockedClasses: save.unlockedClasses.filter((k) => CLASSES[k] !== undefined),
      seed: save.seed,
      lootRngState: save.lootRngState ?? 0, // 0 ⇒ engine derives from seed (old saves)
      // Back-compat: pre-map saves have no maxClearedStage → infer "one below where
      // you left off" from the saved stage. New saves carry it directly.
      ...((): { maxClearedStage: number; resumeStage: number } => {
        const mc = save.maxClearedStage ?? Math.max(0, save.progress.globalStageIndex - 1);
        return { maxClearedStage: mc, resumeStage: resumeStageFor(mc) };
      })(),
      // Drop heroes of a removed class (Mage/Rogue) so the engine can't build a combatant
      // for an unknown class; back-compat: pre-ability saves get their active set seeded
      // from ranked abilities (≤2). Always keep at least a fresh L1 knight.
      ...((): { roster: typeof save.roster; selectedHeroId: string } => {
        const kept = save.roster
          .filter((h) => CLASSES[h.classKey] !== undefined)
          .map((h) => {
            // The hero's CURRENTLY-valid unlocked ability keys. Used to (a) seed an
            // active set for pre-ability saves and (b) drop any stale/renamed key a save
            // still carries (e.g. a since-renamed ability) so it can't reach the sim/UI.
            const poolKeys = heroAbilities(h.classKey, h.talents).map((a) => a.def.key);
            const activeAbilities =
              h.activeAbilities === undefined
                ? poolKeys.slice(0, 2)
                : h.activeAbilities.filter((k) => poolKeys.includes(k));
            return { ...h, equipment: sanitizeEquipment(h.equipment), activeAbilities };
          });
        const roster = kept.length > 0 ? kept : save.roster.slice(0, 1).map((h) => ({ ...h, classKey: 'knight', talents: {}, equipment: {}, activeAbilities: [] }));
        const selected = roster.find((h) => h.id === save.roster[0]?.id) ?? roster[0];
        return { roster, selectedHeroId: selected?.id ?? 'h0' };
      })(),
      // fold any legacy gem bag into the unified inventory (new saves write it []),
      // de-duplicate ids across both containers, AND drop any pre-overhaul gear/gems
      // (older generatorVersion) — the gear overhaul changed item shape (array base
      // affix, class weapons, new slots), so old items are a clean WIPE on load.
      ...((): { inventory: typeof save.inventory; stash: typeof save.stash } => {
        const taken = new Set<string>();
        const wipe = (e: InvEntry | null): InvEntry | null => (e !== null && keepEntry(e) ? e : null);
        const inventory = dedupeIds([...save.inventory, ...(save.inventoryGems ?? [])], taken).map(wipe);
        const stash = dedupeIds([...(save.stash ?? [])], taken).map(wipe);
        return { inventory, stash };
      })(),
      inventorySlotUpgrades: save.inventorySlotUpgrades,
      stashPages: save.stashPages ?? 1,
      stashSlotUpgrades: save.stashSlotUpgrades ?? 0,
      chests: save.chests.map((c) => ({ ...c })),
      autoOpen: { ...save.autoOpen },
      ownedPets: [...save.pets.ownedKeys],
      selectedPet: save.pets.selectedKey,
      uiScale: UI_SCALE, // fixed baseline — ignore any zoom stored in an old save
      dockOrientation: save.settings.dockOrientation,
      autoSalvage: save.settings.autoSalvage ?? DEFAULT_AUTO_SALVAGE, // old saves: off
      configEpoch: s.configEpoch + 1,
    })),
});

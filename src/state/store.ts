import { create } from 'zustand';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createGameSlice, type GameSlice } from './slices/gameSlice';
import { createProgressSlice, type ProgressSlice } from './slices/progressSlice';
import { createInventorySlice, type InventorySlice } from './slices/inventorySlice';
import { createChestSlice, type ChestSlice } from './slices/chestSlice';
import { createLootToastSlice, type LootToastSlice } from './slices/lootToastSlice';
import { createPetSlice, type PetSlice } from './slices/petSlice';
import { createPartySlice, type PartySlice } from './slices/partySlice';

// The global store is composed from slices (one per domain). Each slice creator
// receives (set, get, api) and returns its part. Cross-slice actions (e.g. equip
// moving an item from inventory to a hero) read/write the whole store via get/set.
export type GameStore = UiSlice &
  GameSlice &
  ProgressSlice &
  InventorySlice &
  ChestSlice &
  LootToastSlice &
  PetSlice &
  PartySlice;

export const useStore = create<GameStore>()((...a) => ({
  ...createUiSlice(...a),
  ...createGameSlice(...a),
  ...createProgressSlice(...a),
  ...createInventorySlice(...a),
  ...createChestSlice(...a),
  ...createLootToastSlice(...a),
  ...createPetSlice(...a),
  ...createPartySlice(...a),
}));

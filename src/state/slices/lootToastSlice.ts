import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';

// Transient "you got X" loot text that floats over the top of the fighting strip
// when a chest popup is opened. Pure UI state (never saved): the popup-open handler
// pushes one toast per item; the LootToasts renderer drops each after it fades.

export interface LootToast {
  id: number;
  text: string; // e.g. "Legendary (Weapon)"
  color: string; // tier color (hex)
}

export interface LootToastSlice {
  lootToasts: LootToast[];
  pushLootToast: (toast: Omit<LootToast, 'id'>) => void;
  removeLootToast: (id: number) => void;
}

let nextToastId = 0;

export const createLootToastSlice: StateCreator<GameStore, [], [], LootToastSlice> = (set) => ({
  lootToasts: [],
  pushLootToast: (toast) =>
    set((s) => ({ lootToasts: [...s.lootToasts, { ...toast, id: nextToastId++ }] })),
  removeLootToast: (id) =>
    set((s) => ({ lootToasts: s.lootToasts.filter((t) => t.id !== id) })),
});

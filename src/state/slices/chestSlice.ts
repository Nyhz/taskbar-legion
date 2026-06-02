import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import type { ChestType, ChestStack } from '@/data/chests';

// Mirror of the sim's unopened-chest stacks (the sim owns caps/accrual) + auto-open
// state. The engine pushes `setChests`; the chest popups (ChestPopups) read these
// counts and open a type via the engine.

export interface ChestSlice {
  chests: ChestStack[];
  autoOpen: { unlocked: boolean; lastRunAt: number | null };
  setChests: (chests: ChestStack[]) => void;
  setAutoOpen: (state: { unlocked: boolean; lastRunAt: number | null }) => void;
  chestCount: (type: ChestType) => number;
}

export const createChestSlice: StateCreator<GameStore, [], [], ChestSlice> = (set, get) => ({
  chests: [],
  autoOpen: { unlocked: false, lastRunAt: null },
  setChests: (chests) => set({ chests }),
  setAutoOpen: (state) => set({ autoOpen: state }),
  chestCount: (type) => get().chests.find((c) => c.type === type)?.count ?? 0,
});

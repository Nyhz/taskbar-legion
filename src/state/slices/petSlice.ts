import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';

// Owned pets (permanent stacking economy bonuses) + the cosmetic selection.
// Owning grants the bonus regardless of which pet is selected (DATA_MODEL).

export interface PetSlice {
  ownedPets: string[];
  selectedPet: string | null;
  addPet: (key: string) => void;
  selectPet: (key: string | null) => void;
}

export const createPetSlice: StateCreator<GameStore, [], [], PetSlice> = (set, get) => ({
  ownedPets: [],
  selectedPet: null,
  addPet: (key) => {
    if (get().ownedPets.includes(key)) return;
    set((s) => ({
      ownedPets: [...s.ownedPets, key],
      selectedPet: s.selectedPet ?? key,
      configEpoch: s.configEpoch + 1, // pet bonuses feed getBonuses
    }));
  },
  selectPet: (key) => set({ selectedPet: key }),
});

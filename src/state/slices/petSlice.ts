import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import { advancePetProgress, isPet, petRanks, type PetFacts } from '@/sim/pets';

// Owned pets (permanent stacking economy bonuses), their progress and ranks, and the cosmetic companion.
// Owning grants the bonus regardless of which pet accompanies the party (DATA_MODEL). Every owned pet counts
// its own objective from the moment it is found (`petProgress`); `petRanks` is that progress read as ranks —
// kept beside it because the bonuses read ranks, which change rarely, while progress moves all the time.

export interface PetSlice {
  ownedPets: string[];
  selectedPet: string | null;
  /** Pet key → what its objective has counted since the pet was found. */
  petProgress: Record<string, number>;
  /** Pet key → rank, for every owned pet (derived from `petProgress`; feeds sim/bonuses.getBonuses). */
  petRanks: Record<string, number>;
  /** Pets found and not yet announced, oldest first: the "new pet" notice over the strip shows the first. */
  petFound: string[];
  addPet: (key: string) => void;
  /** The notice of the first pet in `petFound` is done (it timed out or was clicked). */
  dismissPetFound: () => void;
  selectPet: (key: string | null) => void;
  /** Count what happened towards every owned pet's objective. Returns the pets that just gained a rank. */
  notePetFacts: (facts: PetFacts) => string[];
}

export const createPetSlice: StateCreator<GameStore, [], [], PetSlice> = (set, get) => ({
  ownedPets: [],
  selectedPet: null,
  petProgress: {},
  petRanks: {},
  petFound: [],
  dismissPetFound: () => set((s) => ({ petFound: s.petFound.slice(1) })),
  addPet: (key) => {
    if (!isPet(key) || get().ownedPets.includes(key)) return;
    set((s) => {
      const ownedPets = [...s.ownedPets, key];
      const petProgress = { ...s.petProgress, [key]: 0 }; // its objective counts from now
      return {
        ownedPets,
        petProgress,
        petRanks: petRanks(ownedPets, petProgress),
        selectedPet: s.selectedPet ?? key,
        petFound: [...s.petFound, key], // a find is rare: it gets its own notice (ui/overlay/PetFoundNotice)
        configEpoch: s.configEpoch + 1, // pet bonuses feed getBonuses
      };
    });
  },
  selectPet: (key) => set({ selectedPet: key }),
  notePetFacts: (facts) => {
    const s = get();
    const petProgress = advancePetProgress(s.ownedPets, s.petProgress, facts);
    if (petProgress === s.petProgress) return [];
    const ranks = petRanks(s.ownedPets, petProgress);
    const raised = s.ownedPets.filter((key) => (ranks[key] ?? 0) > (s.petRanks[key] ?? 0));
    // A new rank changes the bonuses → the engine re-reads them (configEpoch); plain progress does not.
    if (raised.length === 0) set({ petProgress: { ...petProgress } });
    else set({ petProgress: { ...petProgress }, petRanks: ranks, configEpoch: s.configEpoch + 1 });
    return raised;
  },
});

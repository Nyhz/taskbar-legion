import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/state/store';
import { PETS } from '@/data/pets';

// The pets of the store: found at rank 1, each counting its own objective from the moment it is found, every
// owned pet at once; a new rank re-reads the bonuses (configEpoch) and a find queues its notice.

const goals = (key: string): readonly number[] => PETS[key]?.objective.goals ?? [];

describe('pets in the store', () => {
  beforeEach(() => useStore.setState({ ownedPets: [], selectedPet: null, petProgress: {}, petRanks: {}, petFound: [] }));

  it('a found pet starts at rank 1 with nothing counted, becomes the companion if there is none, and is announced', () => {
    const epoch = useStore.getState().configEpoch;
    useStore.getState().addPet('scholar_owl');
    const s = useStore.getState();
    expect(s.ownedPets).toEqual(['scholar_owl']);
    expect(s.petProgress).toEqual({ scholar_owl: 0 });
    expect(s.petRanks).toEqual({ scholar_owl: 1 });
    expect(s.selectedPet).toBe('scholar_owl');
    expect(s.petFound).toEqual(['scholar_owl']);
    expect(s.configEpoch).toBe(epoch + 1);
    useStore.getState().addPet('scholar_owl'); // already owned: nothing happens
    useStore.getState().addPet('ghost_pet'); // not a pet of the game
    expect(useStore.getState().ownedPets).toEqual(['scholar_owl']);
    expect(useStore.getState().petFound).toEqual(['scholar_owl']);
    useStore.getState().dismissPetFound();
    expect(useStore.getState().petFound).toEqual([]);
  });

  it('what happened before a pet was found never counts for it', () => {
    expect(useStore.getState().notePetFacts({ xpEarned: 1e12 })).toEqual([]);
    useStore.getState().addPet('scholar_owl');
    expect(useStore.getState().petProgress.scholar_owl).toBe(0);
    expect(useStore.getState().petRanks.scholar_owl).toBe(1);
  });

  it('every owned pet progresses at once, whichever is the companion', () => {
    useStore.getState().addPet('coin_sprite');
    useStore.getState().addPet('hoarder');
    useStore.getState().selectPet('coin_sprite');
    useStore.getState().notePetFacts({ goldEarned: 100, bossesDefeated: 3, xpEarned: 50 });
    expect(useStore.getState().petProgress).toEqual({ coin_sprite: 100, hoarder: 3 });
  });

  it('reaching a goal raises the rank, reports it and re-reads the bonuses; plain progress does not', () => {
    useStore.getState().addPet('coin_sprite');
    const epoch = useStore.getState().configEpoch;
    expect(useStore.getState().notePetFacts({ goldEarned: (goals('coin_sprite')[0] ?? 0) - 1 })).toEqual([]);
    expect(useStore.getState().configEpoch).toBe(epoch);
    expect(useStore.getState().notePetFacts({ goldEarned: 1 })).toEqual(['coin_sprite']);
    expect(useStore.getState().petRanks.coin_sprite).toBe(2);
    expect(useStore.getState().configEpoch).toBe(epoch + 1);
    // Several ranks in one go (a long absence): still one report, the rank lands where the progress says.
    expect(useStore.getState().notePetFacts({ goldEarned: goals('coin_sprite')[3] ?? 0 })).toEqual(['coin_sprite']);
    expect(useStore.getState().petRanks.coin_sprite).toBe(5);
    expect(useStore.getState().notePetFacts({ goldEarned: 1e9 })).toEqual([]); // nothing above the last rank
  });
});

import type { StateCreator } from 'zustand';
import type { GameStore } from '../store';
import { addRecords, emptyRecords, type Records, type RecordsDelta } from '@/sim/records';
import { earnedAchievements, type AchievementFacts } from '@/sim/achievements';

// The Codex (user, 2026-11-21): the lifetime records (persisted) and the achievements they reach. Achievements are
// READ from the facts (sim/achievements), never stored; `achievements` keeps the last reading so the bonuses
// (sim/bonuses) and the interface see the same list, and so a new one can be announced once.

export interface CodexSlice {
  records: Records;
  /** The keys of the achievements reached, as last read (refreshAchievements). Feeds sim/bonuses.getBonuses. */
  achievements: string[];
  /** Achievements reached and not yet announced, oldest first (the engine turns them into loot lines). */
  achievementsNew: string[];
  noteRecords: (delta: RecordsDelta) => void;
  /** Read the achievements again from the records and the live facts (`frontier`: the highest stage cleared). A new
   *  one changes the bonuses (configEpoch) and is queued for its announcement — unless `quiet` (the first reading
   *  after a load: what an old save already had is not news). */
  refreshAchievements: (frontier: number, quiet?: boolean) => void;
  takeNewAchievements: () => string[];
}

/** The facts the achievements read, from the store and the frontier the engine knows. */
export function achievementFactsOf(s: GameStore, frontier: number): AchievementFacts {
  return {
    records: s.records,
    frontier,
    petsOwned: s.ownedPets.length,
    heroLevel: s.roster.reduce((max, h) => Math.max(max, h.level), 0),
  };
}

export const createCodexSlice: StateCreator<GameStore, [], [], CodexSlice> = (set, get) => ({
  records: emptyRecords(),
  achievements: [],
  achievementsNew: [],
  noteRecords: (delta) => set((s) => ({ records: addRecords(s.records, delta) })),
  refreshAchievements: (frontier, quiet = false) => {
    const s = get();
    const now = earnedAchievements(achievementFactsOf(s, frontier));
    if (now.length === s.achievements.length) return; // facts only grow: the same count is the same list
    const had = new Set(s.achievements);
    const fresh = quiet ? [] : now.filter((key) => !had.has(key));
    set({ achievements: now, achievementsNew: [...s.achievementsNew, ...fresh], configEpoch: s.configEpoch + 1 });
  },
  takeNewAchievements: () => {
    const fresh = get().achievementsNew;
    if (fresh.length > 0) set({ achievementsNew: [] });
    return fresh;
  },
});

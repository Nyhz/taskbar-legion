// ACHIEVEMENTS (the Codex, user 2026-11-21: «que haya muchos logros con muchos incrementos pequeños»). Each one is
// a target on one FACT of the player's journey (sim/achievements: the lifetime records plus a few things read
// live — the frontier, the pets owned, the highest hero level). Reaching it grants a small, permanent ECONOMY
// bonus: gold, experience, chest finds or gem finds — never a combat stat (combat power lives in the items:
// CLAUDE.md, DIFFICULTY.md). Every bonus adds up with the tech and the pets (sim/bonuses).
//
// The catalogue is written as SERIES: one fact, a ladder of targets and one reward per step. Names and lines are
// not data: the interface words each achievement from its fact and target (i18n `codex`).
// ALL REWARD SIZES ARE PROVISIONAL until the user has seen the totals (ACHIEVEMENT_TOTALS in the tests and below).

export type AchievementFact =
  | 'frontier' // the highest stage cleared (a world boss's stage: 10, 20, … 500)
  | 'kills' // enemies defeated (bosses included)
  | 'bossKills' // stage and world bosses defeated
  | 'goldEarned' // gold from kills
  | 'chestsNormal' // common chests opened
  | 'chestsStageBoss' // stage-boss chests opened
  | 'chestsZoneBoss' // world-boss chests opened
  | 'bestItemTier' // the highest tier of an item that came out of a chest or the Cube
  | 'bestGemTier' // …of a gem
  | 'petsOwned'
  | 'heroLevel' // the highest level of a hero
  | 'playHours' // hours of active play
  | 'bestiary' // creature × difficulty pairs defeated at least once (the Codex's bestiary)
  | 'synths' // Cube syntheses
  | 'polishes' // Cube polishes
  | 'runaways' // runaway chests caught (strip events)
  | 'merchantBuys' // things bought from the wandering merchant (strip events)
  | 'wipes'; // times the whole party fell

export type AchievementReward = { kind: 'goldMult' | 'xpMult' | 'chestDropMult' | 'gemDropMult'; value: number };

export type AchievementCategory = 'progress' | 'combat' | 'loot' | 'collection' | 'craft' | 'events';

export interface AchievementDef {
  key: string; // `${fact}_${target}`
  category: AchievementCategory;
  fact: AchievementFact;
  target: number;
  reward: AchievementReward;
}

interface Series {
  fact: AchievementFact;
  category: AchievementCategory;
  targets: readonly number[];
  reward: AchievementReward['kind'];
  /** The reward of each step (a fraction: 0.002 = +0.2 %). */
  step: number;
}

const pct = (n: number): number => n / 100;

// Every world boss of every difficulty: 50 steps of experience.
const WORLD_BOSS_STAGES = Array.from({ length: 50 }, (_, i) => (i + 1) * 10);

const SERIES: readonly Series[] = [
  { fact: 'frontier', category: 'progress', targets: WORLD_BOSS_STAGES, reward: 'xpMult', step: pct(0.15) },
  { fact: 'heroLevel', category: 'progress', targets: [10, 25, 50, 75, 100, 120], reward: 'goldMult', step: pct(0.4) },
  { fact: 'playHours', category: 'progress', targets: [1, 10, 50, 100, 250, 500, 1000], reward: 'xpMult', step: pct(0.3) },
  { fact: 'kills', category: 'combat', targets: [100, 1_000, 10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 4_000_000], reward: 'goldMult', step: pct(0.3) },
  { fact: 'bossKills', category: 'combat', targets: [10, 50, 100, 250, 500, 1_000, 2_500, 5_000], reward: 'chestDropMult', step: pct(0.3) },
  { fact: 'wipes', category: 'combat', targets: [1, 10, 100], reward: 'xpMult', step: pct(0.2) },
  { fact: 'goldEarned', category: 'loot', targets: [10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000], reward: 'goldMult', step: pct(0.3) },
  { fact: 'chestsNormal', category: 'loot', targets: [10, 100, 500, 1_000, 5_000, 10_000], reward: 'gemDropMult', step: pct(0.3) },
  { fact: 'chestsStageBoss', category: 'loot', targets: [10, 100, 500, 1_000], reward: 'gemDropMult', step: pct(0.3) },
  { fact: 'chestsZoneBoss', category: 'loot', targets: [1, 10, 50, 100], reward: 'chestDropMult', step: pct(0.3) },
  { fact: 'bestItemTier', category: 'loot', targets: [1, 2, 3, 4, 5, 6, 7, 8], reward: 'xpMult', step: pct(0.2) },
  { fact: 'bestGemTier', category: 'loot', targets: [1, 2, 3, 4, 5, 6, 7, 8], reward: 'goldMult', step: pct(0.2) },
  { fact: 'petsOwned', category: 'collection', targets: [1, 2, 3, 4, 5, 6], reward: 'xpMult', step: pct(0.3) },
  { fact: 'bestiary', category: 'collection', targets: [10, 25, 50, 100, 150, 200, 250, 300], reward: 'chestDropMult', step: pct(0.3) },
  { fact: 'synths', category: 'craft', targets: [1, 10, 100, 500], reward: 'gemDropMult', step: pct(0.3) },
  { fact: 'polishes', category: 'craft', targets: [1, 10, 100, 1_000], reward: 'goldMult', step: pct(0.2) },
  { fact: 'runaways', category: 'events', targets: [1, 10, 50, 100, 250, 500], reward: 'chestDropMult', step: pct(0.3) },
  { fact: 'merchantBuys', category: 'events', targets: [1, 10, 50, 100, 250], reward: 'goldMult', step: pct(0.3) },
];

export const ACHIEVEMENTS: readonly AchievementDef[] = SERIES.flatMap((s) =>
  s.targets.map((target) => ({ key: `${s.fact}_${target}`, category: s.category, fact: s.fact, target, reward: { kind: s.reward, value: s.step } })),
);

const BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]));

/** The achievement `key`, or undefined (a save may carry a key that no longer is). */
export function tryAchievement(key: string): AchievementDef | undefined {
  return BY_KEY.get(key);
}

export const ACHIEVEMENT_CATEGORIES: readonly AchievementCategory[] = ['progress', 'combat', 'loot', 'collection', 'craft', 'events'];

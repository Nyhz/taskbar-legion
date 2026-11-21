import { tryAchievement, type AchievementFact, type AchievementReward } from '@/data/achievements';
import { difficultyOf, stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { difficultyName, getLanguage, t, tierName, type TextKey } from '@/i18n';
import type { ItemTier } from '@/data/tiers';

// How an achievement reads (the Codex, and its loot line when it is reached): its goal, worded from its fact and
// target, and the bonus it gives. Interface words only — the data has none (data/achievements).

// The goal of each fact that is worded from its count `{n}` (the frontier and the tiers are worded apart).
const COUNT_GOAL = {
  kills: 'codex.kills',
  bossKills: 'codex.bossKills',
  goldEarned: 'codex.goldEarned',
  chestsNormal: 'codex.chestsNormal',
  chestsStageBoss: 'codex.chestsStageBoss',
  chestsZoneBoss: 'codex.chestsZoneBoss',
  petsOwned: 'codex.petsOwned',
  heroLevel: 'codex.heroLevel',
  playHours: 'codex.playHours',
  bestiary: 'codex.bestiary',
  synths: 'codex.synths',
  polishes: 'codex.polishes',
  runaways: 'codex.runaways',
  merchantBuys: 'codex.merchantBuys',
  wipes: 'codex.wipes',
} as const satisfies Record<Exclude<AchievementFact, 'frontier' | 'bestItemTier' | 'bestGemTier'>, string>;

// Goals whose first step is a single one, worded in the singular ("Catch a runaway chest", not "Catch 1 …").
const ONE_GOAL: Partial<Record<AchievementFact, TextKey>> = {
  wipes: 'codex.one_wipes',
  chestsZoneBoss: 'codex.one_chestsZoneBoss',
  petsOwned: 'codex.one_petsOwned',
  playHours: 'codex.one_playHours',
  synths: 'codex.one_synths',
  polishes: 'codex.one_polishes',
  runaways: 'codex.one_runaways',
  merchantBuys: 'codex.one_merchantBuys',
};

const num = (n: number): string => n.toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US');

/** "Defeat 10,000 enemies", "Beat the boss of Hell 3-10"… */
export function achievementGoal(key: string): string {
  const a = tryAchievement(key);
  if (a === undefined) return key;
  const n = num(a.target);
  const one = a.target === 1 ? ONE_GOAL[a.fact] : undefined;
  if (one !== undefined) return t(one);
  switch (a.fact) {
    case 'frontier': return t('codex.frontier', { stage: `${difficultyName(difficultyOf(a.target).key)} ${worldInDifficulty(a.target)}-${stageInWorldOf(a.target)}` });
    case 'bestItemTier': return t('codex.bestItemTier', { tier: tierName(a.target as ItemTier) });
    case 'bestGemTier': return t('codex.bestGemTier', { tier: tierName(a.target as ItemTier) });
    default: return t(COUNT_GOAL[a.fact], { n });
  }
}

const REWARD_KEY = {
  goldMult: 'codex.rewardGold',
  xpMult: 'codex.rewardXp',
  chestDropMult: 'codex.rewardChests',
  gemDropMult: 'codex.rewardGems',
} as const satisfies Record<AchievementReward['kind'], string>;

/** "+0.3 % gold" */
export function rewardWords(reward: AchievementReward): string {
  const v = (Math.round(reward.value * 1000) / 10).toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US');
  return t(REWARD_KEY[reward.kind], { v });
}

/** The goal and the bonus, for its loot line: "Defeat 10,000 enemies · +0.3 % gold". */
export function achievementLine(key: string): string {
  const a = tryAchievement(key);
  return a === undefined ? key : `${achievementGoal(key)} · ${rewardWords(a.reward)}`;
}

/** Each series' name (a step adds its roman numeral) and its line. */
export const SERIES_NAME = {
  frontier: 'codex.s_frontier',
  heroLevel: 'codex.s_heroLevel',
  playHours: 'codex.s_playHours',
  kills: 'codex.s_kills',
  bossKills: 'codex.s_bossKills',
  wipes: 'codex.s_wipes',
  goldEarned: 'codex.s_goldEarned',
  chestsNormal: 'codex.s_chestsNormal',
  chestsStageBoss: 'codex.s_chestsStageBoss',
  chestsZoneBoss: 'codex.s_chestsZoneBoss',
  bestItemTier: 'codex.s_bestItemTier',
  bestGemTier: 'codex.s_bestGemTier',
  petsOwned: 'codex.s_petsOwned',
  bestiary: 'codex.s_bestiary',
  synths: 'codex.s_synths',
  polishes: 'codex.s_polishes',
  runaways: 'codex.s_runaways',
  merchantBuys: 'codex.s_merchantBuys',
} as const satisfies Record<AchievementFact, string>;

export const SERIES_LINE = {
  frontier: 'codex.l_frontier',
  heroLevel: 'codex.l_heroLevel',
  playHours: 'codex.l_playHours',
  kills: 'codex.l_kills',
  bossKills: 'codex.l_bossKills',
  wipes: 'codex.l_wipes',
  goldEarned: 'codex.l_goldEarned',
  chestsNormal: 'codex.l_chestsNormal',
  chestsStageBoss: 'codex.l_chestsStageBoss',
  chestsZoneBoss: 'codex.l_chestsZoneBoss',
  bestItemTier: 'codex.l_bestItemTier',
  bestGemTier: 'codex.l_bestGemTier',
  petsOwned: 'codex.l_petsOwned',
  bestiary: 'codex.l_bestiary',
  synths: 'codex.l_synths',
  polishes: 'codex.l_polishes',
  runaways: 'codex.l_runaways',
  merchantBuys: 'codex.l_merchantBuys',
} as const satisfies Record<AchievementFact, string>;

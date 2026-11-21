import { ACHIEVEMENTS, tryAchievement, type AchievementDef, type AchievementFact, type AchievementReward } from '@/data/achievements';
import { bestiaryDiscovered, type Records } from './records';

// Which achievements a player has reached and what they give (data/achievements). Achievements are not stored:
// they are READ from the facts every time — the lifetime records plus three things the game knows live — so an
// old save earns at once what its frontier, pets and heroes already show, and nothing can be earned twice. Pure.

/** Everything an achievement may read. */
export interface AchievementFacts {
  records: Records;
  frontier: number; // highest stage cleared
  petsOwned: number;
  heroLevel: number; // the highest level of a hero
}

/** The value of `fact` for this player. */
export function factValue(fact: AchievementFact, f: AchievementFacts): number {
  const r = f.records;
  switch (fact) {
    case 'frontier': return f.frontier;
    case 'kills': return r.kills;
    case 'bossKills': return r.bossKills;
    case 'goldEarned': return r.goldEarned;
    case 'chestsNormal': return r.chestsOpened.normal;
    case 'chestsStageBoss': return r.chestsOpened.stageBoss;
    case 'chestsZoneBoss': return r.chestsOpened.zoneBoss;
    case 'bestItemTier': return r.bestItemTier;
    case 'bestGemTier': return r.bestGemTier;
    case 'petsOwned': return f.petsOwned;
    case 'heroLevel': return f.heroLevel;
    case 'playHours': return r.playMs / 3_600_000;
    case 'bestiary': return bestiaryDiscovered(r);
    case 'synths': return r.synths;
    case 'polishes': return r.polishes;
    case 'runaways': return r.runaways;
    case 'merchantBuys': return r.merchantBuys;
    case 'wipes': return r.wipes;
    default: { const _exhaustive: never = fact; return _exhaustive; }
  }
}

export function isEarned(a: AchievementDef, f: AchievementFacts): boolean {
  return factValue(a.fact, f) >= a.target;
}

/** The keys of every achievement reached, in catalogue order. */
export function earnedAchievements(f: AchievementFacts): string[] {
  return ACHIEVEMENTS.filter((a) => isEarned(a, f)).map((a) => a.key);
}

/** How far towards `a` the player is: 0…1. */
export function achievementProgress(a: AchievementDef, f: AchievementFacts): number {
  return Math.max(0, Math.min(1, factValue(a.fact, f) / a.target));
}

export type AchievementTotals = Record<AchievementReward['kind'], number>;

/** What the achievements `keys` give together (fractions to add: 0.05 = +5 %). Unknown keys give nothing. */
export function achievementTotals(keys: readonly string[]): AchievementTotals {
  const t: AchievementTotals = { goldMult: 0, xpMult: 0, chestDropMult: 0, gemDropMult: 0 };
  for (const key of keys) {
    const a = tryAchievement(key);
    if (a !== undefined) t[a.reward.kind] += a.reward.value;
  }
  return t;
}

import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type AchievementCategory, type AchievementDef, type AchievementFact } from '@/data/achievements';
import { WINDOW_FRAME_ART, WINDOW_SHADOW_ART, WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '../panelLayout';

// The Codex wing (bestiary, achievements, records): its signs, how its achievements group, and its box. Pure (no
// React, no store): unit-tested.

export type CodexSection = 'bestiary' | 'achievements' | 'records';
export const CODEX_SECTIONS: readonly CodexSection[] = ['bestiary', 'achievements', 'records'];

export const SECTION_SIGN: Readonly<Record<CodexSection, string>> = {
  bestiary: 'codex_sec_bestiary',
  achievements: 'codex_sec_achievements',
  records: 'codex_sec_records',
};

/** The sign of each achievement series: its own where another panel has none, else that panel's. */
export const FACT_SIGN: Readonly<Record<AchievementFact, string>> = {
  frontier: 'map_front',
  heroLevel: 'codex_level',
  playHours: 'codex_hours',
  kills: 'codex_kills',
  bossKills: 'hud_boss',
  wipes: 'hud_retry',
  goldEarned: 'ui_gold',
  chestsNormal: 'hud_chest_normal',
  chestsStageBoss: 'hud_chest_stage',
  chestsZoneBoss: 'hud_chest_world',
  bestItemTier: 'cube_star',
  bestGemTier: 'ui_gem',
  petsOwned: 'pet_sign_paw',
  bestiary: 'codex_sec_bestiary',
  synths: 'cube2_synth',
  polishes: 'cube2_polish',
  runaways: 'codex_runaway',
  merchantBuys: 'codex_merchant',
};

export const CATEGORY_SIGN: Readonly<Record<AchievementCategory, string>> = {
  progress: 'map_front',
  combat: 'codex_kills',
  loot: 'hud_chest_normal',
  collection: 'pet_sign_paw',
  craft: 'hud_cube',
  events: 'codex_runaway',
};

export interface Series {
  fact: AchievementFact;
  steps: AchievementDef[];
}

/** The series of a category, in catalogue order, each with its steps (lowest target first). */
export function seriesOf(category: AchievementCategory): Series[] {
  const out: Series[] = [];
  for (const a of ACHIEVEMENTS) {
    if (a.category !== category) continue;
    const last = out[out.length - 1];
    if (last !== undefined && last.fact === a.fact) last.steps.push(a);
    else out.push({ fact: a.fact, steps: [a] });
  }
  return out;
}

export type Medal = 'locked' | 'bronze' | 'silver' | 'gold';

/** The medal of step `i` (from 0) of a series of `n` steps once reached: its first third bronze, then silver,
 *  its last third gold. Not reached: locked. */
export function medalOf(i: number, n: number, reached: boolean): Medal {
  if (!reached) return 'locked';
  const at = n <= 1 ? 1 : i / (n - 1);
  return at < 1 / 3 ? 'bronze' : at < 2 / 3 ? 'silver' : 'gold';
}

/** Roman numeral of a step (1 → I): the series' name and its numeral name the step. */
export function roman(n: number): string {
  const table: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let left = Math.max(1, Math.floor(n));
  for (const [v, s] of table) {
    while (left >= v) {
      out += s;
      left -= v;
    }
  }
  return out;
}

/** Medals across a row of a series. */
export const MEDALS_PER_ROW = 10;
/** One medal's pitch (a 16 px medal; neighbours share the transparent pixel around the outline). */
export const MEDAL_PITCH_ART = 15;

const HEAD_ART = 20;
const SECTIONS_ART = 20;
const CATEGORIES_ART = 3 + 20;
const SERIES_HEAD_ART = 14;
const MEDAL_ROW_ART = 16;
const SERIES_GAP_ART = 3;

/** Height of a category's list of series (achievements view, under its category keys). */
export function categoryListArt(category: AchievementCategory): number {
  return seriesOf(category).reduce((h, s) => h + SERIES_HEAD_ART + Math.ceil(s.steps.length / MEDALS_PER_ROW) * MEDAL_ROW_ART + SERIES_GAP_ART, 0);
}

/** The bestiary view: the world line, the six creatures, the niche, the name and the difficulty signs. */
const BESTIARY_ART = 3 + 16 + 3 + 24 + 4 + 116 + 4 + 12 + 3 + 16;

/** The wing's box (frame and shadow included) in its tallest view. */
export function codexWingArt(): { width: number; height: number } {
  const achievements = CATEGORIES_ART + Math.max(...ACHIEVEMENT_CATEGORIES.map(categoryListArt));
  const body = Math.max(BESTIARY_ART, achievements, 9 * 18 + 6);
  return { width: WING_ART_WIDTH, height: Math.min(WING_MAX_ART_HEIGHT, HEAD_ART + SECTIONS_ART + body + WINDOW_FRAME_ART + WINDOW_SHADOW_ART) };
}

export const CODEX_WING_ART = codexWingArt();

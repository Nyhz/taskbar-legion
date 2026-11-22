// ENEMY NUMBERS FROM THE TYPICAL PARTY (docs/redesign/POWER_CURVE.md §4). Every life and every hit of an enemy is a
// design share of what the typical party of its zone (sim/reference) deals or can take — a number of the zone, the
// same for every player: one better geared than the typical kills in fewer hits, takes less in proportion, farms
// faster and breaks the walls sooner. Pure and deterministic (the reference is memoised per stage).

import { referenceParty } from './reference';
import { wallAsk } from '@/data/power';
import { pressureDifficulty, worldBossPressureAt } from '@/data/bossKit';
import { difficultyIndexOf, worldInDifficulty } from '@/data/difficulties';
import {
  BOSS_THREAT_PCT,
  ENEMY_BASE_ATTACK_SPEED,
  STAGE_BOSS_THREAT_SHARE,
  TRASH_BACK_THREAT_PCT,
  TRASH_HP_FRACTION,
  TRASH_THREAT_PCT,
  ZONE_ENRAGE_MS,
  expectedDefense,
  mitigation,
  worldOf,
} from '@/data/stageScaling';

/** A grunt (the plain melee enemy) lives this many basic hits of the typical party's hardest hitter. */
export const GRUNT_HITS = 2.5;
/** A stage boss lives this many seconds of the typical party. */
export const STAGE_BOSS_SECONDS = 7.5;
/** The hits a second of a wave that land on the front hero, and on each hero behind him: what turns "a wave takes
 *  X % of his life a second" into the hit of one enemy. */
export const WAVE_FRONT_HITS_PER_SEC = 3.5;
export const WAVE_BACK_HITS_PER_SEC = 1.2;
/** A stage boss's area blow: × its hit, every this long (data/abilities boss_slam). */
const STAGE_BLOW = { coeff: 1.2, everyMs: 10_000 } as const;

/** The reference enemy life at global stage `S` (a grunt is TRASH_HP_FRACTION × this; each kind its share). */
export function enemyHp(S: number): number {
  return gruntHp(S) / TRASH_HP_FRACTION;
}
/** A grunt's life: GRUNT_HITS of the typical hardest hitter's basic hit. */
export function gruntHp(S: number): number {
  return GRUNT_HITS * referenceParty(S).topHit;
}
/** A wave enemy's hit on the FRONT hero (× its kind's share): a wave takes TRASH_THREAT_PCT % of the typical
 *  Knight's effective life a second while it fights him. */
export function trashFrontHit(S: number): number {
  const pct = TRASH_THREAT_PCT[difficultyIndexOf(S)] ?? 0;
  return ((pct / 100) * referenceParty(S).knightEhp) / WAVE_FRONT_HITS_PER_SEC;
}
/** A wave enemy's hit on a hero BEHIND the front (× its kind's share): what reaches the back line takes
 *  TRASH_BACK_THREAT_PCT % of the typical back-liner's effective life a second. */
export function trashBackHit(S: number): number {
  const pct = TRASH_BACK_THREAT_PCT[difficultyIndexOf(S)] ?? 0;
  return ((pct / 100) * referenceParty(S).backEhp) / WAVE_BACK_HITS_PER_SEC;
}
/** An enemy's plain hit at global stage `S` — a wave enemy's on the back line; the bosses' hits behind the front
 *  are a multiple of it (data/stageScaling BOSS_DMG_MULT / ZONE_BOSS_DMG_MULT). */
export function enemyDamage(S: number): number {
  return trashBackHit(S);
}
/** A stage boss's life: STAGE_BOSS_SECONDS of the typical party. */
export function stageBossHp(S: number): number {
  return STAGE_BOSS_SECONDS * referenceParty(S).partyDps;
}
/** A world boss's life — THE WALL: the typical party's damage over the minute before the enrage × what its world
 *  asks (data/power wallAsk). */
export function zoneBossHp(S: number): number {
  return (ZONE_ENRAGE_MS / 1000) * referenceParty(S).partyDps * wallAsk(worldOf(S));
}
/** The world boss's basic hit on the front hero: its basic hits and its area blow's main hit take BOSS_THREAT_PCT %
 *  of the typical Knight's effective life a second (the previous difficulty's target in a difficulty's first
 *  worlds — data/bossKit pressureDifficulty). */
export function zoneBossHit(S: number): number {
  const pct = BOSS_THREAT_PCT[pressureDifficulty(S)] ?? 0;
  const p = worldBossPressureAt(S);
  const perSec = ENEMY_BASE_ATTACK_SPEED + p.blowCoeff / (p.blowEveryMs / 1000);
  return ((pct / 100) * referenceParty(S).knightEhp) / perSec;
}
/** A stage boss's basic hit on the front hero: STAGE_BOSS_THREAT_SHARE of its world boss's pressure. */
export function stageBossHit(S: number): number {
  const pct = (BOSS_THREAT_PCT[pressureDifficulty(S)] ?? 0) * STAGE_BOSS_THREAT_SHARE;
  const perSec = ENEMY_BASE_ATTACK_SPEED + STAGE_BLOW.coeff / (STAGE_BLOW.everyMs / 1000);
  return ((pct / 100) * referenceParty(S).knightEhp) / perSec;
}
/** The Crushing Blow's hit on the front hero: `tankLife` × the typical Knight's effective life. On an OPENING wall
 *  (world 1 of Hell … Torment, round 14b) the Knight it is sized against is the previous world's: the wall is taken
 *  with the gear the last difficulty ended with. */
export function crushHit(S: number, tankLife: number): number {
  const opening = difficultyIndexOf(S) > 0 && worldInDifficulty(S) === 1;
  return tankLife * referenceParty(opening ? S - 10 : S).knightEhp;
}
/** What turns a share of the typical back-liner's life into a raw hit through on-level defence (half turned away). */
function throughOnLevel(S: number): number {
  return Math.max(0.05, 1 - mitigation(expectedDefense(S), S));
}
/** The Crushing Blow's magic shock on each hero behind: `backLife` × `sideScale` × the typical back-liner's life,
 *  through on-level magic resist. */
export function crushShock(S: number, backLife: number, sideScale: number): number {
  return (backLife * sideScale * referenceParty(S).backLife) / throughOnLevel(S);
}
/** The world boss's area blow on each hero behind the front one: `share` × the typical back-liner's life through
 *  on-level defence; 0 when the difficulty gives no share (the ability's own splash stays). */
export function areaBlowSplash(S: number, share: number): number {
  if (share <= 0) return 0;
  return (share * referenceParty(S).backLife) / throughOnLevel(S);
}

// The standardized "average player" progression loop.
//
// Day-stepping calendar model (the only tractable way to span 4h→months):
//   - Each calendar day = `activeHoursPerDay` of full-rate active combat (gold+xp+chests,
//     chests captured per-type) + ONE stretch away (`offlineHoursPerDay`, of which the game counts
//     at most its cap — sim/offline.offlineCapMs, 8 h) that banks gold/xp ONLY at offlineMult (no
//     loot, no advancement — matches the game rule).
//   - Combat is tick-measured by the REAL sim (combat.ts); a measurement is cached and only
//     re-run when party power moves (an equip or level-up). Long wall-farms with no upgrades
//     extrapolate from the cached rate, so months of farming cost milliseconds.
//   - Frontier pushes through normal stages 1..9 (each a measured clear), then the world boss
//     (stage 10) is the wall. KEYS (the live rule: engine.applyEnterZoneBoss / Simulation.enterZoneBoss):
//     every attempt — the first one too — spends a key of that world; the first clear of the world's X-9 gives
//     one (option A), the rest come out of stage-boss chests of that world (rolled by the real openChest, a
//     quarter of them); a failed attempt loses the key. With a key in
//     hand the player attempts; without one the party loops this world's W-9 (where the live game parks
//     it) until a chest gives the next. Each attempt is fought with its own combat seed, so a party at
//     the margin can lose one and win the next, as in the game.
//   - Chest drops are the EXPECTED number for the kills measured (kills × the real drop chance), not the
//     handful that happened to drop in the one measured clear: at 0.2 % a clear holds 0 or 1 common chest,
//     and extrapolating that sample would make a seed's whole wall farm all-or-nothing.
//   - Gold is spent the moment it is enough (recruits first, then tech) — not once a day.
//
// Reports BOTH active playtime (matches "Normal ≈ 4h") and calendar time (matches "Torment ≈
// months"), per difficulty, with the monotonic check.

import { measureFarm, measureBoss, type FarmSample } from './combat';
import { openCaptured, equipItems, socketGems, partyPower, heroEhp, SURVIVAL_NEED, SCORE_CONTEXT } from './gear';
import { bossMagicShare } from '@/data/bossKit';
import { newCubeBag, cubeStep, type CubeBag } from './cubePolicy';
import { wallDamage, zoneSetDamage } from './zoneGear';
import { freshHero, syncGrowth, buyTech, applyBuild } from './economy';
import { partyWithBuild, PROBE_GOOD_BUILD, type PartyBuild } from './builds';
import { petMissChance, petRanks } from '@/sim/pets';
import { PET_KEYS, petDef } from '@/data/pets';
import { getBonuses } from '@/sim/bonuses';
import { chestDropChance } from '@/sim/chests';
import { offlineCapMs } from '@/sim/offline';
import { classDef, CLASS_KEYS } from '@/data/classes';
import { MAX_GLOBAL_STAGE, difficultyIndexOf, DIFFICULTY_KEYS, worldBossStageOf } from '@/data/difficulties';
import { worldOf, zoneBossHp, ELITE_CHANCE, ELITE_CHEST_MULT, ELITE_MIN_STAGE, ZONE_ENRAGE_MS } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import { FIRST_CLEAR_KEYS, type ChestType } from '@/data/chests';

export interface ProbeConfig {
  activeHoursPerDay: number; // full-rate active combat per day (gold+xp+chests)
  offlineHoursPerDay: number; // hours a day the game is closed, in one stretch; the game counts at most its cap (8 h); gold/xp only at offlineMult
  capture: Record<ChestType, number>; // fraction of dropped chests the player actually opens
  chunkSec: number; // active-time granularity for farming in Normal (three times this from Hell on)
  measureSeed: number; // fixed seed for combat measurement (separate from the loot stream); wall attempts use measureSeed + attempt number
  lostAttemptSec: number; // active time a failed world-boss attempt costs (the fight until the wipe + the wipe beat)
  /** A farm stage is measured again only when the party's power has moved by more than this share since its last
   *  measurement (or the party changed): one new ring does not change a clear time worth a simulated stage. */
  remeasureTol: number;
  /** Tooling (the wall tuner): keep the keys instead of attempting — the party just farms at the wall. */
  holdKeys?: boolean;
  /** THE SENSIBLE KEY USER (round 4b, user 2026-11-16: «farmear y no gastar llaves en intentos que sabe que no van a
   *  pasar»): the first attempt at a wall goes in with the first key; after a loss the player retries only when the
   *  boss was left at `bossHpAtMost` of its life or less, or the party's power (gear.partyPower) rose by `powerGain`
   *  since the attempt, or `maxWaitSec` of active play went by (a player tries again some day). Meanwhile it keeps its
   *  keys and farms the world's X-9. `false` = the old probe, an attempt with every key. */
  retryRule?: { bossHpAtMost: number; powerGain: number; maxWaitSec: number } | false;
  /** The player uses the Cube (probe/cubePolicy.ts; round 4e). false = the old probe, which threw away all it did not wear. */
  cube?: boolean;
  /** Tooling (the anchors): do nothing but farm this stage — no progress, no attempts — until the time is up.
   *  "A party in the full gear of the world it has just left" is a party that stayed there a few more hours. */
  farmStage?: number;
  /** Tooling (the gear gate): the party equips and sockets NOTHING from now on — it keeps levelling, opening
   *  chests and finding keys, but wears what it wears. "Is gearing up a condition to advance?" */
  freezeGear?: boolean;
  /** Tooling: at every wall kill, also measure the party's gear % of the zone and the wall's share of the zone
   *  set (zoneGear.ts) — six more fights a kill, so only the reports ask for it. */
  measureGear?: boolean;
  /** Tooling: called at the wall each time a key for it is in hand that was not there a moment ago. */
  onKey?: (run: ProbeRun) => void;
  /** Tooling: stop once this much active time has been played (seconds). */
  stopAtActiveSec?: number;
  maxDays: number; // hard stop (stall guard)
  stallDays: number; // give up on a wall after this many days of no frontier progress
  /** Tooling hook: a line per notable moment (a stage first cleared, a recruit, a wall attempt), with the active time. */
  trace?: (line: string) => void;
  /** Stop once this global stage is cleared (partial runs for tuning one difficulty); omitted = the whole game. */
  stopAtStage?: number;
  /** Tooling hook: called with the party as it stands each time the player is about to take on stage `target`
   *  (again and again while walled). Lets a measurement sample "the party the average player has at stage S"
   *  (scripts/measure-backline.ts). Return false to end the run there. */
  observe?: (target: number, party: readonly HeroConfig[], bonuses: ReturnType<typeof getBonuses>) => boolean | void;
  /** The build every hero of a class plays (test/sim/probe/builds.ts); omitted = PROBE_DEFAULT_BUILD. */
  build?: PartyBuild;
  /** The build by the stage the player is taking on (a free respec when it changes); overrides `build` where it
   *  returns one. DEFAULT_CONFIG: the default build in Normal and Hell, PROBE_GOOD_BUILD from Inferno. */
  buildAt?: (target: number) => PartyBuild | undefined;
  /** Pets: 'none' (the player never finds one) or 'median' (each pet is owned from the moment half the players
   *  would have found it — the chance of having missed it falls to 50 % with the kills so far — and climbs its
   *  ranks through its own objective, counted from then, as in the game). */
  pets?: 'none' | 'median';
  /** The run's seed deals the affixes of each boss and the supports of each wave (as in the game: the same on every
   *  attempt at a wall). false = the old probe: they came from the combat seed, so a failed wall rerolled them. */
  fixedRunSeed?: boolean;
  /** Tooling (the build study): the build the party switches to for an attempt at the wall `stage` (a free respec
   *  before the fight) — omitted or undefined, it fights in the build it farms in. */
  wallBuild?: (stage: number) => PartyBuild | undefined;
}

// THE PACING REFERENCE (set by the user, 2026-11-15): the game is a desktop overlay that stays open — assume
// an average of 8 hours of active play a day, and the whole game (Normal 1-1 → Torment 10-10) should take about
// 3 MONTHS of calendar time at that rate (~720 active hours). The user finished the previous balance in about
// 3 weeks of real play, so reaching the target means retuning (walls, enemies, drops, class power) once the
// redesign's content is in place — measure with this probe then; do not retune piecemeal before.
// CAPTURE (2026-11-15, with the common chest at 0.2 % per kill): a common chest drops every five to ten minutes
// and the storage holds 6, so it takes half an hour or more to overflow — a player with the game open, or the
// auto-open tech (every 30 min at its base), loses almost none (it was 0.5 when a chest dropped every 40 s). Boss
// chests are rarer still than their storage. AWAY: the game is open 8 h in one block, so the other 16 h are one absence, of
// which the game counts its cap (8 h).
export const DEFAULT_CONFIG: ProbeConfig = {
  activeHoursPerDay: 8,
  offlineHoursPerDay: 16,
  capture: { normal: 0.9, stageBoss: 0.95, zoneBoss: 1.0 },
  chunkSec: 600,
  measureSeed: 1234,
  lostAttemptSec: 80,
  remeasureTol: 0.03,
  maxDays: 3000,
  stallDays: 540,
  pets: 'none',
  fixedRunSeed: true,
  buildAt: (target) => (target > 200 ? PROBE_GOOD_BUILD : undefined),
  retryRule: { bossHpAtMost: 0.15, powerGain: 0.1, maxWaitSec: 8 * 3600 },
};

export interface State {
  party: HeroConfig[];
  xp: number[];
  gold: number;
  techRanks: Record<string, number>;
  frontier: number; // highest global stage cleared (0 = none)
  draw: { n: number };
  carry: Record<ChestType, number>; // fractional captured-chest remainder
  seed: number;
  dirty: boolean; // party power moved since the last combat measurement
  cache: { stage: number; sample: FarmSample; goldMult: number; xpMult: number; power: number; heroes: number } | null;
  keys: Record<number, number>; // world-boss stage → keys in hand
  activeSec: number; // total active-combat seconds consumed
  calendarDays: number;
  tally: ProbeTally; // what active play has produced so far (kills, income, chests) — drop-rate and objective tuning
  build?: PartyBuild; // the build every hero of a class plays (cfg.build)
  away: { gold: number; xp: number }; // what away-time banked (it counts for the gold and experience pets' objectives)
  pets: Record<string, PetCounters>; // owned pets (cfg.pets 'median') → the counters when each was found
  cube?: CubeBag; // what the player keeps for the Cube and what it has made (cfg.cube)
}

/** The counters a pet objective reads, as they stood when the pet was found. */
interface PetCounters { gold: number; xp: number; opened: number; found: number; playedMs: number; bosses: number }

/** Running totals of ACTIVE play (away-time excluded): the base the pet drop rates and objectives are tuned on. */
export interface ProbeTally {
  kills: number; // normal enemies defeated
  bossKills: number; // stage bosses + world bosses defeated
  gold: number; // gold earned from kills
  xp: number; // experience earned from kills (per hero)
  chestsFound: number; // chests dropped, every type (gross: storage caps ignored)
  normalChestsOpened: number; // common chests the player model captured and opened
}

const emptyTally = (): ProbeTally => ({ kills: 0, bossKills: 0, gold: 0, xp: 0, chestsFound: 0, normalChestsOpened: 0 });

export interface WorldMilestone {
  stage: number; // world-boss global stage just cleared
  world: number; // 1..50 (global world index)
  difficulty: string;
  activeHours: number;
  calendarDays: number;
  partyLevel: number;
  topTier: number; // highest tier equipped across the party
  bossKillSec: number;
  bossFightSec: number; // the boss's fight clock at the kill: past 60 the party was holding its enrage
  bossMinHpPct: number; // survival margin at the kill (0 = someone nearly died)
  bossFails: number; // failed wall attempts (each cost a key) before this clear
  daysOnWorld: number; // calendar days spent on THIS world (since the previous world's clear)
  hoursOnWorld: number; // ACTIVE hours spent on this world (since the previous world's clear)
  keylessHours: number; // of those, active hours parked at W-9 without a key (waiting for one to drop)
  heldHours?: number; // …and with a key in hand, farming for gear before a retry (retryRule)
  firstKeyHours: number; // active hours from reaching the wall (W-9 cleared) to the first attempt
  gear: GearState; // what the party wore when the wall fell
  gearPct?: number; // its gear % of the zone at the kill (zoneGear.ts) — only with cfg.measureGear
  cube?: { made: number[]; gemsMade: number[]; transfigured: number; wornFromCube: number }; // the Cube so far, and what the party wears of it
  wallPct?: number; // the wall's life as a % of the zone set's 60 s of damage: the gear % that kills it at exactly 60 s
}

export interface ProbeResult {
  seed: number;
  completed: boolean;
  stalledAtStage: number | null;
  totalActiveHours: number;
  totalCalendarDays: number;
  milestones: WorldMilestone[];
  difficultyActiveHours: Record<string, number>; // cumulative active playtime at each difficulty's end
  difficultyCalendarDays: Record<string, number>;
  techNodeCount: number; // distinct tech nodes with ≥1 rank at the end
  techTotalRanks: number; // total tech ranks purchased across all nodes
  totalBossFails: number; // total failed wall attempts across the whole run
  tally: ProbeTally; // totals of active play at the end of the run
  difficultyTally: Record<string, ProbeTally>; // the same, cumulative at each difficulty's end
}

/** What a party wears, seen from the wall of the world it is in: the reason a difficulty is as long as it is. */
export interface GearState {
  slots: number; // gear slots filled, of 33 (three heroes × eleven)
  ofThisWorld: number; // of those, pieces dropped in THIS world
  ofThisDifficulty: number; // …dropped in this difficulty (any of its worlds)
  meanTier: number; // mean rarity of the worn pieces (0 normal … 8 primordial)
  topTierPieces: number; // pieces of this difficulty's top rarity or above
  sockets: number; // sockets on the worn pieces
  gems: number; // …with a gem in them
}

/** The gear of `party` as it stands before the world boss at global stage `bossStage`. */
export function gearState(party: readonly HeroConfig[], bossStage: number): GearState {
  const first = bossStage - 9;
  const diffFirst = Math.floor((bossStage - 1) / 100) * 100 + 1;
  const cap = Math.min(8, 4 + Math.floor((bossStage - 1) / 100));
  const g: GearState = { slots: 0, ofThisWorld: 0, ofThisDifficulty: 0, meanTier: 0, topTierPieces: 0, sockets: 0, gems: 0 };
  let tiers = 0;
  for (const hero of party) {
    for (const item of Object.values(hero.equipment)) {
      if (item === undefined) continue;
      g.slots += 1;
      tiers += item.tier;
      if (item.origin.stageIndex >= first) g.ofThisWorld += 1;
      if (item.origin.stageIndex >= diffFirst) g.ofThisDifficulty += 1;
      if (item.tier >= cap) g.topTierPieces += 1;
      g.sockets += item.sockets.length;
      g.gems += item.sockets.filter((so) => so.gem !== null).length;
    }
  }
  g.meanTier = g.slots > 0 ? tiers / g.slots : 0;
  return g;
}

const CHEST_TYPES: ChestType[] = ['normal', 'stageBoss', 'zoneBoss'];
const isWorldBoss = (s: number): boolean => s % 10 === 0;

function topTier(party: readonly HeroConfig[]): number {
  let t = 0;
  for (const cfg of party) for (const item of Object.values(cfg.equipment)) if (item !== undefined && item.tier > t) t = item.tier;
  return t;
}

function addXp(state: State, perHero: number): void {
  for (let i = 0; i < state.party.length; i++) {
    state.xp[i] = (state.xp[i] ?? 0) + perHero;
    const cfg = state.party[i];
    if (cfg !== undefined && syncGrowth(cfg, state.xp[i] ?? 0, state.build?.[cfg.classKey])) state.dirty = true;
  }
}

/** Tooling (round 4d, the farm audit): called after every batch of opened chests with what dropped and the party
 *  as it stands once it has equipped and socketed what it wanted. Never changes the run. */
export const lootWatch: { fn?: (dropStage: number, type: ChestType, loot: { items: readonly ItemInstance[]; gems: readonly GemInstance[] }, party: readonly HeroConfig[]) => void } = {};

function cubeSummary(bag: CubeBag, party: readonly HeroConfig[]): { made: number[]; gemsMade: number[]; transfigured: number; wornFromCube: number } {
  const worn = party.flatMap((h) => Object.values(h.equipment).map((i) => i?.id ?? ''));
  return { made: [...bag.madeItems], gemsMade: [...bag.madeGems], transfigured: bag.transfigured, wornFromCube: worn.filter((id) => bag.madeIds.has(id)).length };
}

function grantLoot(state: State, dropStage: number, captured: Record<ChestType, number>, bonusesGemDrop: ReturnType<typeof getBonuses>, freezeGear = false): void {
  const allowed = state.party.map((p) => p.classKey);
  for (const type of CHEST_TYPES) {
    state.carry[type] += captured[type];
    const open = Math.floor(state.carry[type]);
    if (open <= 0) continue;
    state.carry[type] -= open;
    // The player gears for the wall ahead: its boss's physical/magic mix weighs armour against magic resist.
    SCORE_CONTEXT.magicShare = bossMagicShare(worldBossStageOf(dropStage), 'world');
    const loot = openCaptured(type, dropStage, open, state.seed, state.draw, bonusesGemDrop, allowed);
    if (!freezeGear && equipItems(state.party, loot.items)) state.dirty = true;
    if (!freezeGear && socketGems(state.party, loot.gems)) state.dirty = true;
    if (!freezeGear && state.cube !== undefined && cubeStep(state.cube, state.party, dropStage, loot.items, loot.gems, bonusesGemDrop, allowed)) state.dirty = true;
    lootWatch.fn?.(dropStage, type, loot, state.party);
    if (loot.keys > 0) {
      const boss = worldBossStageOf(dropStage); // a key belongs to the world its chest dropped in
      state.keys[boss] = (state.keys[boss] ?? 0) + loot.keys;
    }
  }
}

function farmSample(state: State, S: number, bonuses: ReturnType<typeof getBonuses>, cfg: ProbeConfig = DEFAULT_CONFIG): FarmSample {
  let stale = state.cache === null || state.cache.stage !== S;
  if (!stale && state.dirty && state.cache !== null) {
    const power = partyPower(state.party);
    stale = state.cache.heroes !== state.party.length || Math.abs(power / state.cache.power - 1) > cfg.remeasureTol;
    if (!stale) state.dirty = false; // moved too little to matter: keep the measurement (the drift keeps adding up)
  }
  if (stale) {
    const sample = measureFarm(state.party, S, cfg.measureSeed, bonuses, undefined, cfg.fixedRunSeed === false ? cfg.measureSeed : state.seed);
    state.cache = { stage: S, sample, goldMult: bonuses.goldMult, xpMult: bonuses.xpMult, power: partyPower(state.party), heroes: state.party.length };
    state.dirty = false;
  }
  if (state.cache === null) throw new Error('unreachable: the farm cache was just filled');
  // Tech bought since the measurement (gold / experience per kill) scales its income; combat is unchanged.
  const { sample, goldMult, xpMult } = state.cache;
  if (goldMult === bonuses.goldMult && xpMult === bonuses.xpMult) return sample;
  return { ...sample, gold: sample.gold * (bonuses.goldMult / goldMult), xp: sample.xp * (bonuses.xpMult / xpMult) };
}

/** The chests the measured kills are EXPECTED to drop (gross, before capture): kills × the game's own drop chance
 *  (an elite doubles it), stage bosses × theirs. The world-boss chest is granted at its kill, not here. */
function expectedChests(m: FarmSample, S: number, bonuses: ReturnType<typeof getBonuses>): Record<ChestType, number> {
  const elites = S >= ELITE_MIN_STAGE ? ELITE_CHANCE : 0;
  return {
    normal: m.kills * chestDropChance('normal', bonuses) * (1 + elites * (ELITE_CHEST_MULT - 1)),
    stageBoss: m.bossKills * chestDropChance('stageBoss', bonuses),
    zoneBoss: 0,
  };
}

/** Count what `clears` clears of the measured stage produced (active play only). */
function tallyClears(state: State, m: FarmSample, chests: Record<ChestType, number>, clears: number, cfg: ProbeConfig): void {
  const t = state.tally;
  t.kills += m.kills * clears;
  t.bossKills += m.bossKills * clears;
  t.gold += m.gold * clears;
  t.xp += m.xp * clears;
  t.chestsFound += (chests.normal + chests.stageBoss + chests.zoneBoss) * clears;
  t.normalChestsOpened += chests.normal * clears * cfg.capture.normal;
}

/** Farm `dtSec` of active time at stage `S` (assumed clearable): bank income + captured loot. */
function farmChunk(state: State, S: number, dtSec: number, cfg: ProbeConfig, bonuses: ReturnType<typeof getBonuses>): void {
  // Works for both a clean clear (m.gold = one clear, clearSec = clear time) AND a stage the
  // party can't yet clear (m.gold = the budget window's PARTIAL haul, clearSec = the window) —
  // partial farming is how the naked solo Knight bootstraps its first gear.
  const m = farmSample(state, S, bonuses, cfg);
  if (m.clearSec <= 0) return;
  const clears = dtSec / m.clearSec;
  const chests = expectedChests(m, S, bonuses);
  state.gold += m.gold * clears;
  addXp(state, m.xp * clears);
  tallyClears(state, m, chests, clears, cfg);
  grantLoot(state, S, {
    normal: chests.normal * clears * cfg.capture.normal,
    stageBoss: chests.stageBoss * clears * cfg.capture.stageBoss,
    zoneBoss: 0,
  }, bonuses, cfg.freezeGear === true);
}

/** Recruit any affordable open slot, then spend gold on tech (which may open more slots). */
function recruitAndTech(state: State, cfg: ProbeConfig, trace?: (line: string) => void): void {
  for (let pass = 0; pass < 4; pass++) {
    let bonuses = bonusesOf(state, cfg);
    while (state.party.length < bonuses.partySlots && state.party.length < CLASS_KEYS.length) {
      const nextClass = CLASS_KEYS[state.party.length];
      if (nextClass === undefined) break;
      const unlock = classDef(nextClass).unlock;
      const cost = unlock.type === 'gold' ? unlock.cost : 0;
      if (state.gold < cost) break;
      state.gold -= cost;
      state.party.push(freshHero(`h${state.party.length}`, nextClass, 1, state.build?.[nextClass]));
      trace?.(`${(state.activeSec / 3600).toFixed(2)}h\trecruit ${nextClass} (frontier ${state.frontier})`);
      state.xp.push(0);
      state.dirty = true;
      bonuses = bonusesOf(state, cfg);
    }
    // Until the trio is complete the player SAVES for it: only the party slot is bought (a purse drained by cheap
    // economy ranks would push the first recruit back by half an hour).
    const partyFull = state.party.length >= CLASS_KEYS.length;
    const left = buyTech(state.gold, state.techRanks, partyFull ? undefined : ['party_size']);
    if (left === state.gold) break; // nothing bought ⇒ stable
    state.gold = left;
  }
}

function applyOffline(state: State, cfg: ProbeConfig, bonuses: ReturnType<typeof getBonuses>): void {
  const farm = Math.max(1, state.frontier);
  const S = isWorldBoss(farm) ? farm - 1 : farm; // never measure a world boss as a farm stage
  const m = farmSample(state, S, bonuses, cfg);
  if (m.clearSec <= 0) return;
  const sec = Math.min(cfg.offlineHoursPerDay * 3600, offlineCapMs(bonuses) / 1000); // one absence: the game's cap applies
  const clears = sec / m.clearSec;
  state.gold += m.gold * clears * bonuses.offlineMult; // gold/xp only, ×offlineMult, no loot
  addXp(state, m.xp * clears * bonuses.offlineMult);
  state.away.gold += m.gold * clears * bonuses.offlineMult;
  state.away.xp += m.xp * clears * bonuses.offlineMult;
}

/** Farming granularity: fine in Normal (the first hours are looked at closely), three times coarser after it. */
function chunkSec(state: State, cfg: ProbeConfig): number {
  return state.frontier >= 100 ? cfg.chunkSec * 3 : cfg.chunkSec;
}

/** A probe run that can be stopped, cloned (`structuredClone`) and resumed — the whole player and its bookkeeping. */
export interface ProbeRun {
  state: State;
  activeLeft: number; // active seconds left today
  milestones: WorldMilestone[];
  diffActive: Record<string, number>;
  diffDays: Record<string, number>;
  diffTally: Record<string, ProbeTally>;
  lastProgressDay: number;
  wallFails: number; // failed attempts at the CURRENT world boss (reset on a clear)
  totalBossFails: number;
  attempts: number; // world-boss attempts so far, all worlds — each is fought with its own combat seed
  lastWorldClearDay: number; // calendar day the previous world boss fell (for per-world days)
  lastWorldClearSec: number; // active seconds when it fell
  keylessSec: number; // active seconds parked at the current wall without a key
  wallReachedSec: number; // active seconds when the current wall was reached (W-9 cleared); -1 before
  firstAttemptSec: number; // active seconds at the first attempt on the current wall; -1 before
  lastAttempt: { bossHpFrac: number; power: number; sec: number } | null; // the last lost attempt at the current wall
  heldSec: number; // active seconds at the current wall holding a key the player chose not to spend (retryRule)
  gaveUp: boolean; // the stall guard or the observe hook ended it
}

export function newProbeRun(seed: number, cfg: ProbeConfig = DEFAULT_CONFIG): ProbeRun {
  SURVIVAL_NEED.clear();
  SCORE_CONTEXT.magicShare = 0.5;
  return {
    state: {
      party: [freshHero('h0', 'knight', 1, cfg.build?.knight)],
      xp: [0],
      gold: 0,
      techRanks: {},
      frontier: 0,
      draw: { n: 0 },
      carry: { normal: 0, stageBoss: 0, zoneBoss: 0 },
      seed,
      dirty: true,
      cache: null,
      keys: {},
      activeSec: 0,
      calendarDays: 0,
      tally: emptyTally(),
      build: cfg.build,
      away: { gold: 0, xp: 0 },
      pets: {},
      ...(cfg.cube === false ? {} : { cube: newCubeBag() }),
    },
    activeLeft: cfg.activeHoursPerDay * 3600,
    milestones: [],
    diffActive: {},
    diffDays: {},
    diffTally: {},
    lastProgressDay: 0,
    wallFails: 0,
    totalBossFails: 0,
    attempts: 0,
    lastWorldClearDay: 0,
    lastWorldClearSec: 0,
    keylessSec: 0,
    wallReachedSec: -1,
    firstAttemptSec: -1,
    lastAttempt: null,
    heldSec: 0,
    gaveUp: false,
  };
}

/** The party of a run and its W-9 farm sample helpers, for tooling. */
export function runParty(run: ProbeRun): readonly HeroConfig[] {
  return run.state.party;
}
export function runFrontier(run: ProbeRun): number {
  return run.state.frontier;
}
export function runActiveHours(run: ProbeRun): number {
  return run.state.activeSec / 3600;
}
export function runBonuses(run: ProbeRun, cfg: ProbeConfig = DEFAULT_CONFIG): ReturnType<typeof getBonuses> {
  return bonusesOf(run.state, cfg);
}

/** The pets the player owns now and their ranks (cfg.pets 'median'; none otherwise). Finds the pets whose chance
 *  of having been missed has fallen to a half with the kills so far, noting the counters their objectives start from. */
export function ownedPetRanks(state: State, cfg: ProbeConfig): Record<string, number> {
  if (cfg.pets !== 'median') return {};
  const t = state.tally;
  const counters = (): PetCounters => ({
    gold: t.gold + state.away.gold, xp: t.xp + state.away.xp, opened: t.normalChestsOpened, found: t.chestsFound,
    playedMs: state.activeSec * 1000, bosses: t.bossKills,
  });
  for (const key of PET_KEYS) {
    if (state.pets[key] === undefined && petMissChance(key, t.kills, t.bossKills) <= 0.5) state.pets[key] = counters();
  }
  const now = counters();
  const progress: Record<string, number> = {};
  for (const [key, at] of Object.entries(state.pets)) {
    const kind = petDef(key).objective.kind;
    progress[key] = kind === 'goldEarned' ? now.gold - at.gold
      : kind === 'xpEarned' ? now.xp - at.xp
      : kind === 'commonChestsOpened' ? now.opened - at.opened
      : kind === 'chestsFound' ? now.found - at.found
      : kind === 'timePlayed' ? now.playedMs - at.playedMs
      : now.bosses - at.bosses;
  }
  return petRanks(Object.keys(state.pets), progress);
}

/** The bonuses of the player's tech and pets. */
function bonusesOf(state: State, cfg: ProbeConfig): ReturnType<typeof getBonuses> {
  return getBonuses(state.techRanks, ownedPetRanks(state, cfg));
}

/** Play `run` on until the game (or `cfg.stopAtStage`) is cleared, `cfg.stopAtActiveSec` is reached, or it gives up. */
export function advanceProbe(run: ProbeRun, cfg: ProbeConfig = DEFAULT_CONFIG): void {
  const state = run.state;
  const lastStage = Math.min(MAX_GLOBAL_STAGE, cfg.stopAtStage ?? MAX_GLOBAL_STAGE);
  const timeUp = (): boolean => cfg.stopAtActiveSec !== undefined && state.activeSec >= cfg.stopAtActiveSec;
  while (state.frontier < lastStage && state.calendarDays < cfg.maxDays && !run.gaveUp && !timeUp()) {
    let bonuses = bonusesOf(state, cfg);

    while (run.activeLeft > 0 && state.frontier < lastStage && !timeUp()) {
      // Gold is spent as soon as it is enough: a recruit joins mid-session, not at the end of the day.
      recruitAndTech(state, cfg, cfg.trace);
      bonuses = bonusesOf(state, cfg);
      if (cfg.farmStage !== undefined) {
        const dt = Math.min(run.activeLeft, chunkSec(state, cfg));
        farmChunk(state, cfg.farmStage, dt, cfg, bonuses);
        run.activeLeft -= dt;
        state.activeSec += dt;
        continue;
      }
      const target = state.frontier + 1;
      const want = cfg.buildAt?.(target) ?? cfg.build;
      if (want !== state.build) {
        // the player respecs (free) into the build of this stage
        state.build = want;
        for (const h of state.party) applyBuild(h, h.level, want?.[h.classKey]);
        state.dirty = true;
      }
      if (cfg.observe?.(target, state.party, bonuses) === false) {
        run.gaveUp = true;
        break;
      }

      if (isWorldBoss(target)) {
        if (run.wallReachedSec < 0) run.wallReachedSec = state.activeSec;
        const wb0 = cfg.wallBuild?.(target);
        const ready = (() => {
          const rule = cfg.retryRule;
          const last = run.lastAttempt;
          if (rule === undefined || rule === false || last === null) return true;
          if (last.bossHpFrac <= rule.bossHpAtMost) return true;
          if (state.activeSec - last.sec >= rule.maxWaitSec) return true;
          return partyPower(wb0 === undefined ? state.party : partyWithBuild(state.party, wb0)) >= last.power * (1 + rule.powerGain);
        })();
        if (cfg.holdKeys !== true && (state.keys[target] ?? 0) >= 1 && ready) {
          // A key in hand → an attempt (the first one needs a key too). The key is spent on entry, win or lose.
          state.keys[target] = (state.keys[target] ?? 0) - 1;
          if (run.firstAttemptSec < 0) run.firstAttemptSec = state.activeSec;
          const wb = cfg.wallBuild?.(target);
          const fighters = wb === undefined ? state.party : partyWithBuild(state.party, wb);
          const res = measureBoss(fighters, target, cfg.measureSeed + run.attempts, bonuses, undefined, cfg.fixedRunSeed === false ? cfg.measureSeed + run.attempts : state.seed);
          run.attempts += 1;
          cfg.trace?.(`${(state.activeSec / 3600).toFixed(2)}h\tattempt ${target} ${res.win ? 'WIN' : 'lost'} lvl ${state.party.map((h) => h.level).join('/')} top T${topTier(state.party)} fight ${res.fightSec.toFixed(0)}s minHP ${(res.minHpFrac * 100).toFixed(0)}%`);
          // A hero that fell before the enrage asks its gear for more life (gear.SURVIVAL_NEED): enough to have stood
          // the minute at the rate it was losing it; the player then re-picks from what it keeps for the Cube.
          let needMoved = false;
          for (const [cls, sec] of Object.entries(res.deathSec ?? {})) {
            if (sec >= ZONE_ENRAGE_MS / 1000) continue;
            const hero = state.party.find((h) => h.classKey === cls);
            if (hero === undefined) continue;
            const want = heroEhp(hero, state.party) * Math.min(3, ZONE_ENRAGE_MS / 1000 / Math.max(5, sec));
            if (want > (SURVIVAL_NEED.get(cls) ?? 0)) {
              SURVIVAL_NEED.set(cls, want);
              needMoved = true;
            }
          }
          if (needMoved) {
            if (state.cube !== undefined) equipItems(state.party, state.cube.items);
            state.dirty = true;
          }
          const spent = res.win ? Math.max(30, res.killSec) : cfg.lostAttemptSec;
          run.activeLeft -= spent;
          state.activeSec += spent;
          if (res.win) {
            state.tally.bossKills += 1;
            state.tally.chestsFound += 1; // a world boss always drops its chest
            state.frontier = target;
            run.lastProgressDay = state.calendarDays;
            const gear = gearState(state.party, target);
            const zoneRef = cfg.measureGear === true ? zoneSetDamage(state.party, target, bonuses, cfg.measureSeed) : 0;
            const zone = zoneRef > 0 ? { gearPct: (100 * wallDamage(state.party, target, bonuses, cfg.measureSeed)) / zoneRef, wallPct: (100 * zoneBossHp(target)) / zoneRef } : {};
            grantLoot(state, target, { normal: 0, stageBoss: 0, zoneBoss: cfg.capture.zoneBoss }, bonuses, cfg.freezeGear === true);
            run.milestones.push({
              stage: target,
              world: worldOf(target),
              difficulty: DIFFICULTY_KEYS[difficultyIndexOf(target)] ?? '?',
              activeHours: state.activeSec / 3600,
              calendarDays: state.calendarDays,
              partyLevel: state.party[0]?.level ?? 1,
              topTier: topTier(state.party),
              bossKillSec: res.killSec,
              bossFightSec: res.fightSec,
              bossMinHpPct: res.minHpFrac * 100,
              bossFails: run.wallFails,
              daysOnWorld: state.calendarDays - run.lastWorldClearDay,
              hoursOnWorld: (state.activeSec - run.lastWorldClearSec) / 3600,
              keylessHours: run.keylessSec / 3600,
              heldHours: run.heldSec / 3600,
              ...(state.cube !== undefined ? { cube: cubeSummary(state.cube, state.party) } : {}),
              firstKeyHours: (run.firstAttemptSec - run.wallReachedSec) / 3600,
              gear,
              ...zone,
            });
            if (target % 100 === 0) {
              // a difficulty ends at this kill: note the moment (Normal is over long before its first day is)
              const key = DIFFICULTY_KEYS[target / 100 - 1];
              if (key !== undefined && run.diffActive[key] === undefined) {
                run.diffActive[key] = state.activeSec / 3600;
                run.diffDays[key] = state.calendarDays + 1;
                run.diffTally[key] = { ...state.tally };
              }
            }
            run.wallFails = 0;
            run.lastWorldClearDay = state.calendarDays;
            run.lastWorldClearSec = state.activeSec;
            run.keylessSec = 0;
            run.heldSec = 0;
            run.lastAttempt = null;
            run.wallReachedSec = -1;
            run.firstAttemptSec = -1;
            continue;
          }
          // the attempt failed: the key is gone
          run.wallFails += 1;
          run.totalBossFails += 1;
          run.lastAttempt = { bossHpFrac: res.bossHpFrac ?? 1, power: partyPower(fighters), sec: state.activeSec };
          continue;
        }
        // no key — or a key the player keeps until it is ready to retry: the party loops this world's W-9 (target-1)
        const dt = Math.min(run.activeLeft, chunkSec(state, cfg));
        const keysBefore = state.keys[target] ?? 0;
        farmChunk(state, target - 1, dt, cfg, bonuses);
        run.activeLeft -= dt;
        state.activeSec += dt;
        if (keysBefore >= 1) run.heldSec += dt;
        else run.keylessSec += dt;
        for (let k = keysBefore; k < (state.keys[target] ?? 0); k++) cfg.onKey?.(run);
      } else {
        const m = farmSample(state, target, bonuses, cfg);
        if (m.clearable) {
          const chests = expectedChests(m, target, bonuses);
          run.activeLeft -= m.clearSec;
          state.activeSec += m.clearSec;
          state.gold += m.gold;
          addXp(state, m.xp);
          tallyClears(state, m, chests, 1, cfg);
          grantLoot(state, target, { normal: chests.normal * cfg.capture.normal, stageBoss: chests.stageBoss * cfg.capture.stageBoss, zoneBoss: 0 }, bonuses, cfg.freezeGear === true);
          state.frontier = target;
          // Option A (data/chests FIRST_CLEAR_KEYS): the first clear of a world's X-9 hands over one key of that world.
          if (target % 10 === 9) state.keys[target + 1] = (state.keys[target + 1] ?? 0) + FIRST_CLEAR_KEYS;
          run.lastProgressDay = state.calendarDays;
          cfg.trace?.(`${(state.activeSec / 3600).toFixed(2)}h\tcleared ${target} in ${m.clearSec.toFixed(0)}s lvl ${state.party.map((h) => h.level).join('/')} top T${topTier(state.party)} gold ${Math.round(state.gold)} wipes ${m.wipes}`);
        } else {
          // Not clearable yet: farm the last stage that is (never a world-boss stage — that is not a farm stage).
          const back = Math.max(1, isWorldBoss(state.frontier) ? state.frontier - 1 : state.frontier);
          const dt = Math.min(run.activeLeft, chunkSec(state, cfg));
          farmChunk(state, back, dt, cfg, bonuses);
          run.activeLeft -= dt;
          state.activeSec += dt;
        }
      }
    }
    if (run.activeLeft > 0) break; // stopped mid-day (done, time up, or the hook): the day is not over

    applyOffline(state, cfg, bonuses);
    recruitAndTech(state, cfg, cfg.trace);
    state.calendarDays += 1;
    run.activeLeft = cfg.activeHoursPerDay * 3600;

    // record difficulty boundaries crossed
    const dIdx = state.frontier > 0 ? difficultyIndexOf(state.frontier) : -1;
    for (let d = 0; d <= dIdx; d++) {
      const key = DIFFICULTY_KEYS[d];
      if (key === undefined) continue;
      const lastStageOfDiff = (d + 1) * 100;
      if (state.frontier >= lastStageOfDiff && run.diffActive[key] === undefined) {
        run.diffActive[key] = state.activeSec / 3600;
        run.diffDays[key] = state.calendarDays;
        run.diffTally[key] = { ...state.tally };
      }
    }

    if (state.calendarDays - run.lastProgressDay > cfg.stallDays) run.gaveUp = true; // wall too hard
  }
}

export function probeResult(run: ProbeRun, cfg: ProbeConfig = DEFAULT_CONFIG): ProbeResult {
  const state = run.state;
  const lastStage = Math.min(MAX_GLOBAL_STAGE, cfg.stopAtStage ?? MAX_GLOBAL_STAGE);
  // A difficulty finished mid-day is recorded here (the day loop records it at the day's end).
  const diffActive = { ...run.diffActive };
  const diffDays = { ...run.diffDays };
  const diffTally = { ...run.diffTally };
  for (let d = 0; d < DIFFICULTY_KEYS.length; d++) {
    const key = DIFFICULTY_KEYS[d];
    if (key === undefined || diffActive[key] !== undefined || state.frontier < (d + 1) * 100) continue;
    diffActive[key] = state.activeSec / 3600;
    diffDays[key] = state.calendarDays + 1;
    diffTally[key] = { ...state.tally };
  }
  return {
    seed: state.seed,
    completed: state.frontier >= lastStage,
    stalledAtStage: state.frontier >= lastStage ? null : state.frontier,
    totalActiveHours: state.activeSec / 3600,
    totalCalendarDays: state.calendarDays + (state.frontier >= lastStage && run.activeLeft < cfg.activeHoursPerDay * 3600 ? 1 : 0),
    milestones: run.milestones,
    difficultyActiveHours: diffActive,
    difficultyCalendarDays: diffDays,
    techNodeCount: Object.values(state.techRanks).filter((r) => r > 0).length,
    techTotalRanks: Object.values(state.techRanks).reduce((a, r) => a + r, 0),
    totalBossFails: run.totalBossFails,
    tally: { ...state.tally },
    difficultyTally: diffTally,
  };
}

export function runProbe(seed: number, cfg: ProbeConfig = DEFAULT_CONFIG): ProbeResult {
  const run = newProbeRun(seed, cfg);
  advanceProbe(run, cfg);
  return probeResult(run, cfg);
}

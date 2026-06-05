// The standardized "average player" progression loop.
//
// Day-stepping calendar model (the only tractable way to span 4h→months):
//   - Each calendar day = `activeHoursPerDay` of full-rate active combat (gold+xp+chests,
//     chests captured per-type) + an offline catch-up (`offlineHoursPerDay`, capped 12h) that
//     banks gold/xp ONLY at offlineMult (no loot, no advancement — matches the game rule).
//   - Combat is tick-measured by the REAL sim (combat.ts); a measurement is cached and only
//     re-run when party power moves (an equip or level-up). Long wall-farms with no upgrades
//     extrapolate from the cached rate, so months of farming cost milliseconds.
//   - Frontier pushes through normal stages 1..9 (each a measured clear), then the world boss
//     (stage 10) is the wall: attempted with current power, re-tried only after power rises.
//
// Reports BOTH active playtime (matches "Normal ≈ 4h") and calendar time (matches "Torment ≈
// months"), per difficulty, with the monotonic check.

import { measureFarm, measureBoss, type FarmSample } from './combat';
import { openCaptured, equipItems, socketGems, partyPower } from './gear';
import { freshHero, syncGrowth, buyTech } from './economy';
import { getBonuses } from '@/sim/bonuses';
import { classDef, CLASS_KEYS } from '@/data/classes';
import { MAX_GLOBAL_STAGE, difficultyIndexOf, DIFFICULTY_KEYS } from '@/data/difficulties';
import { worldOf } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { ChestType } from '@/data/chests';

export interface ProbeConfig {
  activeHoursPerDay: number; // full-rate active combat per day (gold+xp+chests)
  offlineHoursPerDay: number; // capped at 12h; gold/xp only at offlineMult
  capture: Record<ChestType, number>; // fraction of dropped chests the player actually opens
  chunkSec: number; // active-time granularity for wall farming
  measureSeed: number; // fixed seed for combat measurement (separate from the loot stream)
  maxDays: number; // hard stop (stall guard)
  stallDays: number; // give up on a wall after this many days of no frontier progress
}

export const DEFAULT_CONFIG: ProbeConfig = {
  activeHoursPerDay: 2,
  offlineHoursPerDay: 12,
  capture: { normal: 0.5, stageBoss: 0.9, zoneBoss: 1.0 },
  chunkSec: 1800,
  measureSeed: 1234,
  maxDays: 3000,
  stallDays: 540,
};

interface State {
  party: HeroConfig[];
  xp: number[];
  gold: number;
  techRanks: Record<string, number>;
  frontier: number; // highest global stage cleared (0 = none)
  draw: { n: number };
  carry: Record<ChestType, number>; // fractional captured-chest remainder
  seed: number;
  dirty: boolean; // party power moved since the last combat measurement
  cache: { stage: number; sample: FarmSample } | null;
  activeSec: number; // total active-combat seconds consumed
  calendarDays: number;
}

export interface WorldMilestone {
  stage: number; // world-boss global stage just cleared
  world: number; // 1..50 (global world index)
  difficulty: string;
  activeHours: number;
  calendarDays: number;
  partyLevel: number;
  topTier: number; // highest tier equipped across the party
  bossKillSec: number;
  bossMinHpPct: number; // survival margin at the kill (0 = someone nearly died)
  bossFails: number; // failed wall attempts (power-gated retries) before this clear
  daysOnWorld: number; // calendar days spent on THIS world (since the previous world's clear)
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
    if (cfg !== undefined && syncGrowth(cfg, state.xp[i] ?? 0)) state.dirty = true;
  }
}

function grantLoot(state: State, dropStage: number, captured: Record<ChestType, number>, bonusesGemDrop: ReturnType<typeof getBonuses>): void {
  const allowed = state.party.map((p) => p.classKey);
  for (const type of CHEST_TYPES) {
    state.carry[type] += captured[type];
    const open = Math.floor(state.carry[type]);
    if (open <= 0) continue;
    state.carry[type] -= open;
    const loot = openCaptured(type, dropStage, open, state.seed, state.draw, bonusesGemDrop, allowed);
    if (equipItems(state.party, loot.items)) state.dirty = true;
    if (socketGems(state.party, loot.gems)) state.dirty = true;
  }
}

function farmSample(state: State, S: number, bonuses: ReturnType<typeof getBonuses>): FarmSample {
  if (state.cache !== null && state.cache.stage === S && !state.dirty) return state.cache.sample;
  const sample = measureFarm(state.party, S, DEFAULT_CONFIG.measureSeed, bonuses);
  state.cache = { stage: S, sample };
  state.dirty = false;
  return sample;
}

/** Farm `dtSec` of active time at stage `S` (assumed clearable): bank income + captured loot. */
function farmChunk(state: State, S: number, dtSec: number, cfg: ProbeConfig, bonuses: ReturnType<typeof getBonuses>): void {
  // Works for both a clean clear (m.gold = one clear, clearSec = clear time) AND a stage the
  // party can't yet clear (m.gold = the budget window's PARTIAL haul, clearSec = the window) —
  // partial farming is how the naked solo Knight bootstraps its first gear.
  const m = farmSample(state, S, bonuses);
  if (m.clearSec <= 0) return;
  const clears = dtSec / m.clearSec;
  state.gold += m.gold * clears;
  addXp(state, m.xp * clears);
  grantLoot(state, S, {
    normal: m.chests.normal * clears * cfg.capture.normal,
    stageBoss: m.chests.stageBoss * clears * cfg.capture.stageBoss,
    zoneBoss: m.chests.zoneBoss * clears * cfg.capture.zoneBoss,
  }, bonuses);
}

/** Recruit any affordable open slot, then spend gold on tech (which may open more slots). */
function recruitAndTech(state: State): void {
  for (let pass = 0; pass < 4; pass++) {
    let bonuses = getBonuses(state.techRanks, []);
    while (state.party.length < bonuses.partySlots && state.party.length < CLASS_KEYS.length) {
      const nextClass = CLASS_KEYS[state.party.length];
      if (nextClass === undefined) break;
      const unlock = classDef(nextClass).unlock;
      const cost = unlock.type === 'gold' ? unlock.cost : 0;
      if (state.gold < cost) break;
      state.gold -= cost;
      state.party.push(freshHero(`h${state.party.length}`, nextClass, 1));
      state.xp.push(0);
      state.dirty = true;
      bonuses = getBonuses(state.techRanks, []);
    }
    const left = buyTech(state.gold, state.techRanks);
    if (left === state.gold) break; // nothing bought ⇒ stable
    state.gold = left;
  }
}

function applyOffline(state: State, cfg: ProbeConfig, bonuses: ReturnType<typeof getBonuses>): void {
  const farm = Math.max(1, state.frontier);
  const S = isWorldBoss(farm) ? farm - 1 : farm; // never measure a world boss as a farm stage
  const m = farmSample(state, S, bonuses);
  if (m.clearSec <= 0) return;
  const sec = Math.min(cfg.offlineHoursPerDay, 12) * 3600;
  const clears = sec / m.clearSec;
  state.gold += m.gold * clears * bonuses.offlineMult; // gold/xp only, ×offlineMult, no loot
  addXp(state, m.xp * clears * bonuses.offlineMult);
}

export function runProbe(seed: number, cfg: ProbeConfig = DEFAULT_CONFIG): ProbeResult {
  const state: State = {
    party: [freshHero('h0', 'knight', 1)],
    xp: [0],
    gold: 0,
    techRanks: {},
    frontier: 0,
    draw: { n: 0 },
    carry: { normal: 0, stageBoss: 0, zoneBoss: 0 },
    seed,
    dirty: true,
    cache: null,
    activeSec: 0,
    calendarDays: 0,
  };

  const milestones: WorldMilestone[] = [];
  const diffActive: Record<string, number> = {};
  const diffDays: Record<string, number> = {};
  let lastProgressDay = 0;
  let lastWallAttemptPower = -1;
  let wallFails = 0; // failed attempts at the CURRENT world boss (reset on a clear)
  let totalBossFails = 0;
  let lastWorldClearDay = 0; // calendar day the previous world boss fell (for per-world days)

  while (state.frontier < MAX_GLOBAL_STAGE && state.calendarDays < cfg.maxDays) {
    const bonuses = getBonuses(state.techRanks, []);
    let active = cfg.activeHoursPerDay * 3600;

    while (active > 0 && state.frontier < MAX_GLOBAL_STAGE) {
      const target = state.frontier + 1;

      if (isWorldBoss(target)) {
        const power = partyPower(state.party);
        if (power > lastWallAttemptPower) {
          const res = measureBoss(state.party, target, cfg.measureSeed, bonuses);
          lastWallAttemptPower = power;
          active -= Math.max(30, res.killSec);
          state.activeSec += Math.max(30, res.killSec);
          if (res.win) {
            state.frontier = target;
            lastProgressDay = state.calendarDays;
            lastWallAttemptPower = -1;
            grantLoot(state, target, { normal: 0, stageBoss: 0, zoneBoss: cfg.capture.zoneBoss }, bonuses);
            milestones.push({
              stage: target,
              world: worldOf(target),
              difficulty: DIFFICULTY_KEYS[difficultyIndexOf(target)] ?? '?',
              activeHours: state.activeSec / 3600,
              calendarDays: state.calendarDays,
              partyLevel: state.party[0]?.level ?? 1,
              topTier: topTier(state.party),
              bossKillSec: res.killSec,
              bossMinHpPct: res.minHpFrac * 100,
              bossFails: wallFails,
              daysOnWorld: state.calendarDays - lastWorldClearDay,
            });
            wallFails = 0;
            lastWorldClearDay = state.calendarDays;
            continue;
          }
          // a power-gated attempt that didn't clear → a wall failure ("wipe")
          wallFails += 1;
          totalBossFails += 1;
        }
        // walled: farm this world's W-9 (target-1) for a chunk
        const dt = Math.min(active, cfg.chunkSec);
        farmChunk(state, target - 1, dt, cfg, bonuses);
        active -= dt;
        state.activeSec += dt;
      } else {
        const m = farmSample(state, target, bonuses);
        if (m.clearable) {
          active -= m.clearSec;
          state.activeSec += m.clearSec;
          state.gold += m.gold;
          addXp(state, m.xp);
          grantLoot(state, target, { normal: m.chests.normal * cfg.capture.normal, stageBoss: 0, zoneBoss: 0 }, bonuses);
          state.frontier = target;
          lastProgressDay = state.calendarDays;
        } else {
          const dt = Math.min(active, cfg.chunkSec);
          farmChunk(state, Math.max(1, state.frontier), dt, cfg, bonuses);
          active -= dt;
          state.activeSec += dt;
        }
      }
    }

    applyOffline(state, cfg, bonuses);
    recruitAndTech(state);
    state.calendarDays += 1;

    // record difficulty boundaries crossed
    const dIdx = state.frontier > 0 ? difficultyIndexOf(state.frontier) : -1;
    for (let d = 0; d <= dIdx; d++) {
      const key = DIFFICULTY_KEYS[d];
      if (key === undefined) continue;
      const lastStageOfDiff = (d + 1) * 100;
      if (state.frontier >= lastStageOfDiff && diffActive[key] === undefined) {
        diffActive[key] = state.activeSec / 3600;
        diffDays[key] = state.calendarDays;
      }
    }

    if (state.calendarDays - lastProgressDay > cfg.stallDays) break; // wall too hard
  }

  return {
    seed,
    completed: state.frontier >= MAX_GLOBAL_STAGE,
    stalledAtStage: state.frontier >= MAX_GLOBAL_STAGE ? null : state.frontier,
    totalActiveHours: state.activeSec / 3600,
    totalCalendarDays: state.calendarDays,
    milestones,
    difficultyActiveHours: diffActive,
    difficultyCalendarDays: diffDays,
    techNodeCount: Object.values(state.techRanks).filter((r) => r > 0).length,
    techTotalRanks: Object.values(state.techRanks).reduce((a, r) => a + r, 0),
    totalBossFails,
  };
}

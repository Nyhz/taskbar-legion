import type { Simulation, TickContext } from './Simulation';
import { TICK_MS } from './Simulation';
import type { ChestType } from '@/data/chests';

// Offline catch-up: the combat rules run in bulk at load with a capped elapsed time
// (ARCHITECTURE). Deterministic (uses the world's seeded rng). Away-time banks
// gold/XP ONLY (scaled by offlineMult) — NO loot (chests), NO pet drops, and NO stage
// advancement (the frontier moves only during active play). Enforced by ctx.offline.

export const OFFLINE_CAP_MS = 12 * 60 * 60 * 1000; // 12 hours (BALANCE)

export interface OfflineSummary {
  elapsedMs: number;
  cappedMs: number;
  ticks: number;
  gold: number;
  xp: number;
  chests: { type: ChestType; count: number }[]; // gained, aggregated by type (display)
  petDrops: string[];
  fromStage: number;
  toStage: number;
}

/** Run `elapsedMs` (capped) of simulation forward. Assumes pending was drained. */
export function simulateOffline(
  sim: Simulation,
  ctx: TickContext,
  elapsedMs: number,
): OfflineSummary {
  const cappedMs = Math.min(Math.max(0, elapsedMs), OFFLINE_CAP_MS);
  const ticks = Math.floor(cappedMs / TICK_MS);
  const w = sim.world;
  const fromStage = w.globalStageIndex;

  // offline:true → gold/XP only; no chests, no pets, frozen stage (Simulation.awardKill /
  // handleClear / retreatAfterWipe all honour the flag). fromStage === toStage by construction.
  const offlineCtx: TickContext = { ...ctx, offline: true };
  for (let i = 0; i < ticks; i++) sim.tick(offlineCtx);

  // Offline grants no loot/pets by design — the summary reports gold/XP only (empty chest list).
  const chests: { type: ChestType; count: number }[] = [];

  return {
    elapsedMs,
    cappedMs,
    ticks,
    gold: Math.round(w.pending.gold * ctx.bonuses.offlineMult),
    xp: Math.round(w.pending.xp * ctx.bonuses.offlineMult),
    chests,
    petDrops: [],
    fromStage,
    toStage: w.globalStageIndex,
  };
}

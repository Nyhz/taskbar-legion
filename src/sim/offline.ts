import type { Simulation, TickContext } from './Simulation';
import { TICK_MS } from './Simulation';
import type { ChestStack, ChestType } from '@/data/chests';

// Offline catch-up: the same rules run in bulk at load with a capped elapsed time
// (ARCHITECTURE). Deterministic (uses the world's seeded rng). Chests fill to
// their per-type caps and stop (no overflow); gold/XP are scaled by offlineMult.

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
  const chestsBefore = sumByType(w.chests);

  for (let i = 0; i < ticks; i++) sim.tick(ctx);

  const chestsAfter = sumByType(w.chests);
  const chestGain: { type: ChestType; count: number }[] = [];
  for (const [type, count] of chestsAfter) {
    const delta = count - (chestsBefore.get(type) ?? 0);
    if (delta > 0) chestGain.push({ type, count: delta });
  }

  return {
    elapsedMs,
    cappedMs,
    ticks,
    gold: Math.round(w.pending.gold * ctx.bonuses.offlineMult),
    xp: Math.round(w.pending.xp * ctx.bonuses.offlineMult),
    chests: chestGain,
    petDrops: [...w.pending.petDrops],
    fromStage,
    toStage: w.globalStageIndex,
  };
}

function sumByType(chests: ChestStack[]): Map<ChestType, number> {
  const m = new Map<ChestType, number>();
  for (const c of chests) m.set(c.type, (m.get(c.type) ?? 0) + c.count);
  return m;
}

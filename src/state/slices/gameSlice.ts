import type { StateCreator } from 'zustand';
import type { ChestType } from '@/data/chests';
import type { StagePhase } from '@/sim/world';

// HUD-facing snapshot of the live sim, pushed by the game engine each frame.
// The Pixi renderer reads the sim world directly (for 60fps interpolation); the
// React HUD reads this throttled snapshot.

export interface HudSnapshot {
  world: number;
  stageInWorld: number;
  globalStage: number;
  maxClearedStage: number; // highest beaten boss → drives the Map's travel unlocks
  stageProgress: number; // 0..1
  phase: StagePhase;
  gold: number;
  chests: Record<ChestType, number>;
  zoneKeys: Record<number, number>; // per-zone key counts (world index → count)
  party: { classKey: string; level: number }[]; // one entry per fielded hero
}

export const EMPTY_HUD: HudSnapshot = {
  world: 1,
  stageInWorld: 1,
  globalStage: 1,
  maxClearedStage: 0,
  stageProgress: 0,
  phase: 'advancing',
  gold: 0,
  chests: { normal: 0, stageBoss: 0, zoneBoss: 0 },
  zoneKeys: {},
  party: [],
};

export interface GameSlice {
  hud: HudSnapshot;
  setHud: (snapshot: HudSnapshot) => void;
  /** Map "travel" intent: target globalStageIndex the engine should jump to next
   *  frame (then clear). null = no pending jump. */
  pendingTravelStage: number | null;
  requestTravel: (globalStageIndex: number) => void;
  clearPendingTravel: () => void;
  /** "Enter world W's W-10 world boss" intent (spends one of that zone's keys). Carries
   *  the target world; set by the strip portal tap and the Map's X-10 button; the engine
   *  consumes it once next frame. null = no pending entry. */
  pendingEnterZoneWorld: number | null;
  requestEnterZoneBoss: (world: number) => void;
  clearPendingEnterZoneBoss: () => void;
}

export const createGameSlice: StateCreator<GameSlice, [], [], GameSlice> = (set) => ({
  hud: EMPTY_HUD,
  setHud: (snapshot) => set({ hud: snapshot }),
  pendingTravelStage: null,
  requestTravel: (globalStageIndex) => set({ pendingTravelStage: globalStageIndex }),
  clearPendingTravel: () => set({ pendingTravelStage: null }),
  pendingEnterZoneWorld: null,
  requestEnterZoneBoss: (world) => set({ pendingEnterZoneWorld: world }),
  clearPendingEnterZoneBoss: () => set({ pendingEnterZoneWorld: null }),
});

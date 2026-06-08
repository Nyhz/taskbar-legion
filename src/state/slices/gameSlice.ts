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
  clockMs: number; // current sim time (world.tick * TICK_MS) — drives the auto-open countdown
  party: { classKey: string; level: number }[]; // one entry per fielded hero
  zoneKeysHeld: number; // world-boss keys valid for the CURRENT zone (world+difficulty)
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
  clockMs: 0,
  party: [],
  zoneKeysHeld: 0,
};

export interface GameSlice {
  hud: HudSnapshot;
  setHud: (snapshot: HudSnapshot) => void;
  /** Map "travel" intent: target globalStageIndex the engine should jump to next
   *  frame (then clear). null = no pending jump. */
  pendingTravelStage: number | null;
  requestTravel: (globalStageIndex: number) => void;
  clearPendingTravel: () => void;
  /** "Enter world W's W-10 world boss" intent. Carries the target world; set by the strip
   *  portal tap and the Map's X-10 button; the engine consumes it once next frame.
   *  null = no pending entry. */
  pendingEnterZoneWorld: number | null;
  requestEnterZoneBoss: (world: number) => void;
  clearPendingEnterZoneBoss: () => void;
  /** Auto-open (tech) is DUE: the engine sets this when its interval elapses + the bag has
   *  room; the UI consumes it to reveal every chest with staggered toasts (like a manual
   *  click), then clears it. Decouples the engine's timing from the UI's reveal. */
  autoOpenPending: boolean;
  requestAutoOpen: () => void;
  clearAutoOpen: () => void;
  /** True after a persist write threw — surfaces a "progress isn't saving" warning so a
   *  silent save failure (e.g. the macOS app-data dir bug) can never lose hours unnoticed.
   *  Set/cleared by saveManager.saveGame on each write attempt. */
  saveFailed: boolean;
  setSaveFailed: (failed: boolean) => void;
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
  autoOpenPending: false,
  requestAutoOpen: () => set({ autoOpenPending: true }),
  clearAutoOpen: () => set({ autoOpenPending: false }),
  saveFailed: false,
  setSaveFailed: (failed) => set({ saveFailed: failed }),
});

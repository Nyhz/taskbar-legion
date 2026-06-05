import type { StateCreator } from 'zustand';
import { loadSettings, saveSettings } from '../settingsShim';

export type PanelKey =
  | 'party' // the persistent host, anchored above the strip
  | 'stash' // left wing
  | 'talents' // left wing (Stats + Talents tabs)
  | 'cube' // right wing
  | 'map' // right wing
  | 'pets' // right wing (opened from the paper-doll button)
  | 'tech'; // full overlay that slides up over the party menu

// At most one panel may be open per side of the party menu. Opening a second one
// on the same side closes the first (the "one menu per side" rule).
export const LEFT_PANELS: readonly PanelKey[] = ['stash', 'talents'];
export const RIGHT_PANELS: readonly PanelKey[] = ['cube', 'map', 'pets'];

function sideOf(key: PanelKey): readonly PanelKey[] | null {
  if (LEFT_PANELS.includes(key)) return LEFT_PANELS;
  if (RIGHT_PANELS.includes(key)) return RIGHT_PANELS;
  return null; // party / tech are independent of the wing exclusivity
}

export type UiScale = 1 | 1.5 | 2; // kept for save-schema back-compat; the live value is fixed
/** Baseline UI sizing baked into the layout (the strip canvas + panel base scales). The user
 *  zoom multiplies ON TOP of this, so uiZoom = 1 reproduces the original 1.5×/1.3×… look. */
export const UI_SCALE = 1.5;
/** The slider stops for the two independent scales (× on top of the baseline). */
export const SCALE_MIN = 0.75;
export const SCALE_STEP = 0.25;
export const MENU_SCALE_MAX = 1; // menus only 0.75 / 1.00 (1.25 outgrows the capped overlay height)
export const GAME_SCALE_MAX = 1.25; // game 0.75 / 1.00 / 1.25
export type DockOrientation = 'bottom' | 'left' | 'right';

export interface WindowPos {
  x: number;
  y: number;
}

/** Which top-level view is showing. The app boots at the title screen every launch and
 *  switches to 'game' once the player picks Start/Continue. Session-only — never persisted
 *  (not part of SaveV1 / the settings shim), so every boot lands back on the title. */
export type Screen = 'title' | 'game';

export interface UiSlice {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  openPanels: PanelKey[];
  windowPos: Partial<Record<PanelKey, WindowPos>>;
  uiScale: UiScale;
  menuScale: number; // independent zoom for the floating menus (default 1)
  gameScale: number; // independent zoom for the strip + its top bar (default 1)
  dockOrientation: DockOrientation;
  retryStage: boolean; // when true, a wipe keeps the party on its stage (no retreat)
  hideSocketWarning: boolean; // when true, socketing skips the confirm modal
  togglePanel: (key: PanelKey) => void;
  openPanel: (key: PanelKey) => void;
  closePanel: (key: PanelKey) => void;
  toggleMenu: () => void; // Menu button: open the party host, or close everything if already open
  closeAllPanels: () => void;
  setWindowPos: (key: PanelKey, pos: WindowPos) => void;
  setDockOrientation: (orientation: DockOrientation) => void;
  setRetryStage: (on: boolean) => void;
  setHideSocketWarning: (on: boolean) => void;
  setMenuScale: (scale: number) => void;
  setGameScale: (scale: number) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => {
  const persisted = loadSettings();
  // Persist every shim-backed UI setting from the current store snapshot.
  const persist = (): void =>
    saveSettings({
      uiScale: get().uiScale,
      menuScale: get().menuScale,
      gameScale: get().gameScale,
      dockOrientation: get().dockOrientation,
      retryStage: get().retryStage,
      hideSocketWarning: get().hideSocketWarning,
    });
  return {
    screen: 'title',
    setScreen: (screen) => set({ screen }),
    openPanels: [],
    windowPos: {},
    uiScale: UI_SCALE, // fixed baseline — the user knobs are menuScale / gameScale
    menuScale: Math.min(MENU_SCALE_MAX, persisted.menuScale ?? 1), // clamp a stale 1.25 down
    gameScale: persisted.gameScale ?? 1,
    dockOrientation: persisted.dockOrientation ?? 'bottom',
    retryStage: persisted.retryStage ?? false,
    hideSocketWarning: persisted.hideSocketWarning ?? false,

    togglePanel: (key) =>
      set((s) => {
        if (s.openPanels.includes(key)) {
          return { openPanels: s.openPanels.filter((k) => k !== key) };
        }
        // Opening: drop any sibling already open on the same wing.
        const side = sideOf(key);
        const kept = side === null ? s.openPanels : s.openPanels.filter((k) => !side.includes(k));
        return { openPanels: [...kept, key] };
      }),

    openPanel: (key) =>
      set((s) => {
        if (s.openPanels.includes(key)) return s;
        const side = sideOf(key);
        const kept = side === null ? s.openPanels : s.openPanels.filter((k) => !side.includes(k));
        return { openPanels: [...kept, key] };
      }),

    // Closing the party host tears down the whole menu (its wings + tech overlay).
    closePanel: (key) =>
      set((s) => (key === 'party' ? { openPanels: [] } : { openPanels: s.openPanels.filter((k) => k !== key) })),

    toggleMenu: () =>
      set((s) => (s.openPanels.includes('party') ? { openPanels: [] } : { openPanels: ['party'] })),

    closeAllPanels: () => set({ openPanels: [] }),

    setWindowPos: (key, pos) =>
      set((s) => ({ windowPos: { ...s.windowPos, [key]: pos } })),

    setDockOrientation: (orientation) => {
      set({ dockOrientation: orientation });
      persist();
    },

    setRetryStage: (on) => {
      set({ retryStage: on });
      persist();
    },

    setHideSocketWarning: (on) => {
      set({ hideSocketWarning: on });
      persist();
    },

    setMenuScale: (scale) => {
      set({ menuScale: scale });
      persist();
    },

    setGameScale: (scale) => {
      set({ gameScale: scale });
      persist();
    },
  };
};

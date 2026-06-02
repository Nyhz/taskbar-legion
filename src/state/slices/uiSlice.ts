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
/** The one and only UI sizing. 1.5× is the baseline now — zoom is no longer adjustable. */
export const UI_SCALE = 1.5;
export type DockOrientation = 'bottom' | 'left' | 'right';

export interface WindowPos {
  x: number;
  y: number;
}

export interface UiSlice {
  openPanels: PanelKey[];
  windowPos: Partial<Record<PanelKey, WindowPos>>;
  uiScale: UiScale;
  dockOrientation: DockOrientation;
  retryStage: boolean; // when true, a wipe keeps the party on its stage (no retreat)
  togglePanel: (key: PanelKey) => void;
  openPanel: (key: PanelKey) => void;
  closePanel: (key: PanelKey) => void;
  toggleMenu: () => void; // Menu button: open the party host, or close everything if already open
  closeAllPanels: () => void;
  setWindowPos: (key: PanelKey, pos: WindowPos) => void;
  setDockOrientation: (orientation: DockOrientation) => void;
  setRetryStage: (on: boolean) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => {
  const persisted = loadSettings();
  return {
    openPanels: [],
    windowPos: {},
    uiScale: UI_SCALE, // fixed — zoom is no longer adjustable
    dockOrientation: persisted.dockOrientation ?? 'bottom',
    retryStage: persisted.retryStage ?? false,

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
      saveSettings({ uiScale: get().uiScale, dockOrientation: orientation, retryStage: get().retryStage });
    },

    setRetryStage: (on) => {
      set({ retryStage: on });
      saveSettings({ uiScale: get().uiScale, dockOrientation: get().dockOrientation, retryStage: on });
    },
  };
};

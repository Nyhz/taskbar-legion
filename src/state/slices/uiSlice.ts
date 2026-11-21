import type { StateCreator } from 'zustand';
import { getLanguage, isLang, setLanguage, subscribeLanguage } from '@/i18n/core';
import type { Lang } from '@/i18n/core';
import { loadSettings, saveSettings, storedGameScale } from '../settingsShim';
import { UI_SCALE, isWholePixelStop, snapGameScale } from '../pixelScale';

export type PanelKey =
  | 'party' // the hero window: the main panel, fixed and centred above the strip
  | 'stash' // left wing
  | 'talents' // left wing
  | 'sheet' // left wing: every stat of the hero and the account
  | 'cube' // right wing
  | 'map' // right wing
  | 'pets' // right wing
  | 'codex' // right wing: bestiary, achievements, records
  | 'tech'; // right wing (upgrades)

// The hero window (`party`) is the anchor. Every other panel is a WING that opens glued to one of its edges, at
// most one per side: opening a second one on the same side closes the first. A wing can only be open while the
// hero window is — opening one opens it, and closing the hero window closes its wings.
export const LEFT_PANELS: readonly PanelKey[] = ['stash', 'talents', 'sheet'];
export const RIGHT_PANELS: readonly PanelKey[] = ['cube', 'map', 'pets', 'codex', 'tech'];

function sideOf(key: PanelKey): readonly PanelKey[] | null {
  if (LEFT_PANELS.includes(key)) return LEFT_PANELS;
  if (RIGHT_PANELS.includes(key)) return RIGHT_PANELS;
  return null; // the hero window itself
}

/** `open` with `key` added: its sibling on the same side dropped, the hero window opened if it was not. */
function withPanel(open: readonly PanelKey[], key: PanelKey): PanelKey[] {
  const side = sideOf(key);
  const kept = side === null ? [...open] : open.filter((k) => !side.includes(k));
  if (side !== null && !kept.includes('party')) kept.unshift('party');
  return [...kept, key];
}

export type UiScale = 1 | 1.5 | 2; // kept for save-schema back-compat; the live value is fixed
// The baseline (UI_SCALE) and the whole-pixel game-scale stops live in ../pixelScale (pure, tested).
export { UI_SCALE } from '../pixelScale';
/** The stops of the MENU scale (× on top of the baseline). The game scale has its own, per display. */
export const SCALE_MIN = 0.75;
export const SCALE_STEP = 0.25;
export const MENU_SCALE_MAX = 1; // menus only 0.75 / 1.00 (1.25 outgrows the capped overlay height)
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
  toggleMenu: () => void; // the HUD's sign: open the hero window, or close it and its wings
  closeAllPanels: () => void;
  setWindowPos: (key: PanelKey, pos: WindowPos) => void;
  setDockOrientation: (orientation: DockOrientation) => void;
  setRetryStage: (on: boolean) => void;
  setHideSocketWarning: (on: boolean) => void;
  setMenuScale: (scale: number) => void;
  setGameScale: (scale: number) => void;
  /** Snap the player's chosen game scale again for the display and window the game is on now (it moved to another
   *  monitor, or the window was resized). The choice is kept: back on the first screen, the same scale returns. */
  resnapGameScale: () => void;
  /** The effect chip of the strip the pointer is on (not persisted): the effects behind it and where its top-left
   *  corner is, in art pixels of the strip. The strip sets it; ui/overlay/StripEffectTip words it. */
  stripTip: StripTip | null;
  setStripTip: (tip: StripTip | null) => void;
}

export interface StripTip {
  /** The effects behind the chip and what each is worth on the hero right now (value per stack, stacks, the time
   *  it was laid for). */
  effects: readonly { key: string; value?: number; stacks?: number; totalMs?: number }[];
  x: number;
  y: number;
}

/** Screen pixels per CSS pixel of the display the window is on (1 outside a browser). */
export function displayPixelRatio(): number {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
}

/** Height of the window the game lives in, in CSS px (undefined outside a browser). */
export function displayViewportHeight(): number | undefined {
  return typeof window === 'undefined' ? undefined : window.innerHeight;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => {
  const persisted = loadSettings();
  // The scale the player picked, before snapping it to this display's stops — kept apart so that a window moved to a
  // screen where it is not allowed falls back for now and gets it again on a screen where it is.
  let wantedGameScale = storedGameScale(persisted) ?? 1;
  // A half stop (×1.5) is only ever the player's pick: a default or an old save snaps to whole pixels.
  let wantsHalfStop = storedGameScale(persisted) !== undefined && persisted.halfPixelScale === true;
  const snapped = (): number => snapGameScale(wantedGameScale, displayPixelRatio(), displayViewportHeight(), wantsHalfStop);
  // The language lives in @/i18n (so `t()` works outside React and the store); this slice only persists it.
  // It is written to the shim ONLY once chosen — until then the game follows the system language.
  let chosenLanguage: Lang | undefined = isLang(persisted.language) ? persisted.language : undefined;
  if (chosenLanguage !== undefined) setLanguage(chosenLanguage);
  // Persist every shim-backed UI setting from the current store snapshot.
  const persist = (): void =>
    saveSettings({
      uiScale: get().uiScale,
      menuScale: get().menuScale,
      gameScale: wantedGameScale,
      wholePixelScale: true,
      halfPixelScale: wantsHalfStop,
      dockOrientation: get().dockOrientation,
      retryStage: get().retryStage,
      hideSocketWarning: get().hideSocketWarning,
      ...(chosenLanguage !== undefined ? { language: chosenLanguage } : {}),
    });
  subscribeLanguage(() => {
    chosenLanguage = getLanguage();
    persist();
  });
  return {
    screen: 'title',
    setScreen: (screen) => set({ screen }),
    openPanels: [],
    windowPos: {},
    uiScale: UI_SCALE, // fixed baseline — the user knobs are menuScale / gameScale
    menuScale: Math.min(MENU_SCALE_MAX, persisted.menuScale ?? 1), // clamp a stale 1.25 down
    gameScale: snapped(), // whole screen pixels per art pixel (or the half stop the player picked)
    dockOrientation: persisted.dockOrientation ?? 'bottom',
    retryStage: persisted.retryStage ?? false,
    hideSocketWarning: persisted.hideSocketWarning ?? false,
    stripTip: null,
    setStripTip: (tip) => {
      const now = get().stripTip;
      const same = now === tip || (now !== null && tip !== null && now.x === tip.x && now.y === tip.y && JSON.stringify(now.effects) === JSON.stringify(tip.effects));
      if (!same) set({ stripTip: tip });
    },

    togglePanel: (key) =>
      set((s) =>
        s.openPanels.includes(key)
          ? { openPanels: key === 'party' ? [] : s.openPanels.filter((k) => k !== key) }
          : { openPanels: withPanel(s.openPanels, key) },
      ),

    openPanel: (key) =>
      set((s) => (s.openPanels.includes(key) ? s : { openPanels: withPanel(s.openPanels, key) })),

    // Closing the hero window closes its wings with it.
    closePanel: (key) =>
      set((s) =>
        key === 'party' ? { openPanels: [] } : { openPanels: s.openPanels.filter((k) => k !== key) },
      ),

    toggleMenu: () =>
      set((s) => (s.openPanels.includes('party') ? { openPanels: [] } : { openPanels: ['party'] })),

    closeAllPanels: () => set({ openPanels: [] }),

    setWindowPos: (key, pos) => set((s) => ({ windowPos: { ...s.windowPos, [key]: pos } })),

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

    // Always lands on a stop of the display the window is on (also called when that display changes). `scale` is
    // one of that display's stops (the options offer nothing else): picking its half stop is what allows it.
    setGameScale: (scale) => {
      wantedGameScale = scale;
      wantsHalfStop = !isWholePixelStop(scale, displayPixelRatio());
      set({ gameScale: snapped() });
      persist();
    },
    resnapGameScale: () => {
      const gameScale = snapped();
      if (gameScale !== get().gameScale) set({ gameScale });
    },
  };
};

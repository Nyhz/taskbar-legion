// Lightweight localStorage persistence for UI-only prefs (uiScale, dockOrientation,
// retryStage, hideSocketWarning). Separate from the main save (persistence/saveManager.ts)
// because these are device-local UI choices, and some — retryStage, hideSocketWarning —
// aren't part of SaveV1. localStorage persists in the Tauri webview, so this works on
// desktop too.

import type { DockOrientation, UiScale } from './slices/uiSlice';

const KEY = 'taskbar-legion.settings.v0';

export interface UiSettings {
  uiScale: UiScale;
  menuScale: number; // independent menu zoom (0.75 / 1 / 1.25); 1 = native size
  gameScale: number; // independent strip+topbar zoom (0.75 / 1 / 1.25); 1 = native size
  dockOrientation: DockOrientation;
  retryStage: boolean; // keep the party on its stage after a wipe instead of retreating
  hideSocketWarning: boolean; // skip the "gem can't be recovered" confirm when socketing
}

// Some non-browser runtimes (e.g. vitest under node's --localstorage-file flag)
// define a PARTIAL `localStorage` global where the methods aren't functions, so a
// bare `typeof localStorage === 'undefined'` guard isn't enough — feature-detect
// the actual methods we call.
function hasLocalStorage(): boolean {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

export function loadSettings(): Partial<UiSettings> {
  if (!hasLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return {};
    return JSON.parse(raw) as Partial<UiSettings>;
  } catch (err) {
    console.warn('Failed to read UI settings shim', err);
    return {};
  }
}

export function saveSettings(settings: UiSettings): void {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to persist UI settings shim', err);
  }
}

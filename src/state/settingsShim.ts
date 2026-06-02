// Phase-0 temporary persistence for UI settings only (uiScale, dockOrientation).
// Real, full-state persistence is IndexedDB in Phase 5 (persistence/saveManager.ts).
// This shim is intentionally tiny and will be superseded.

import type { DockOrientation, UiScale } from './slices/uiSlice';

const KEY = 'taskbar-legion.settings.v0';

export interface UiSettings {
  uiScale: UiScale;
  dockOrientation: DockOrientation;
  retryStage: boolean; // keep the party on its stage after a wipe instead of retreating
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

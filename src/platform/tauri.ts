// Runtime platform detection. Everything Tauri-specific is dynamically imported
// INSIDE the functions that use it (see desktopOverlay / storage / quit) so the
// plain-browser build and the vitest (node) suite never pull in `@tauri-apps/*`
// at module-evaluation time. This module stays import-free and safe everywhere.

/** True when running inside the Tauri webview (the desktop app), false in a browser
 *  or under Node/vitest. Tauri injects `__TAURI_INTERNALS__` onto `window`. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

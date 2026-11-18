import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
// Test config lives in vitest.config.ts (keeps Vite and Vitest plugin types from clashing).
export default defineConfig({
  plugins: [react()],
  // .mpeg isn't in Vite's default asset list — treat it as a static asset (URL import)
  // so `import click from '…/click.mpeg'` resolves instead of being parsed as JS.
  assetsInclude: ['**/*.mpeg'],
  build: {
    // Inline ALL PNGs as base64 data: URIs (only ~2.4MB total). In the packaged Tauri app,
    // images served over the tauri:// asset protocol can't be decoded by WebKit webviews
    // (WKWebView/WebKitGTK) — createImageBitmap throws and a CORS <img> is blocked — leaving a
    // black canvas. data: URIs sidestep the protocol entirely (no fetch, no CORS, no canvas
    // taint), so the sprites + backdrops load identically everywhere. Browser/dev unaffected.
    assetsInlineLimit(filePath) {
      // The interface's pixel fonts are inlined for the same reason: no fetch over tauri://, no flash of fallback type.
      if (filePath.endsWith('.png') || filePath.endsWith('.ttf')) return true;
      // The game's effect and interface sounds (src/assets/audio/sfx|ui, ~1 MB) too: the engine fetches and decodes
      // them, and a data: URI behaves the same in every webview, with no tauri:// fetch to go wrong in the packaged app.
      // The ambient beds (~6.5 MB) stay files: audio/soundEngine falls back to an <audio> element if one won't fetch.
      if (/\/assets\/audio\/(sfx|ui)\/.*\.mp3$/.test(filePath)) return true;
      return undefined; // everything else keeps Vite's default 4KB threshold
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

import { loadTextures } from 'pixi.js';
import { isTauri } from '@/platform/tauri';

// The Tauri webviews — WKWebView (macOS) and WebKitGTK (Linux) — fail to decode images
// fetched over the custom `tauri://` asset protocol via createImageBitmap, throwing
// "InvalidStateError: Cannot decode the data in the argument to createImageBitmap". Pixi's
// texture loader uses createImageBitmap by default, so the FIRST sprite/background load throws,
// the scene never builds, and the canvas is left blank — the "game doesn't render" report.
//
// This only happens in the PACKAGED app (assets served over tauri://). `tauri dev` serves
// assets over http://localhost, where createImageBitmap works — which is why it reproduced for
// players but never in dev.
//
// Forcing Pixi onto the <img>-element decode path (preferCreateImageBitmap: false) sidesteps
// it: those webviews load tauri:// URLs into an <img> natively. Browser builds keep the faster
// createImageBitmap path untouched.

let configured = false;

export function configurePixiLoader(): void {
  if (configured) return;
  configured = true;
  if (isTauri()) {
    loadTextures.config = {
      preferCreateImageBitmap: false,
      preferWorkers: false,
      // crossOrigin must be null (NOT 'anonymous'/''): the bundled assets are the app's own
      // files, but the tauri:// asset protocol returns no CORS headers, so an anonymous CORS
      // <img> request is blocked by WebKit (img.onerror) — the second failure we hit. A plain,
      // non-CORS load works and can't taint the canvas for same-origin app assets.
      crossOrigin: null,
    };
  }
}

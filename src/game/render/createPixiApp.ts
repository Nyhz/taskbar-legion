import { Application } from 'pixi.js';
import type { ApplicationOptions } from 'pixi.js';
import { isRenderSafeMode, setRenderSafeMode } from './renderSafeMode';
import { configurePixiLoader } from './configurePixiLoader';

// The ONE place a Pixi Application is created. Both canvases (the game strip + the title
// scene) go through here so they share the same hardened init path:
//
//  - preference: ['webgl'] — the ARRAY form is a blocklist, so WebGPU and the (broken) canvas
//    renderer are never even attempted. WebGPU is absent/buggy in the Tauri webviews
//    (WKWebView on macOS, WebKitGTK on Linux) and was a path to a silent black canvas.
//  - A retry ladder: if the preferred (transparent, hi-dpi) init throws, retry with steadily
//    safer options, ending in an OPAQUE, resolution-1 canvas. On a machine whose transparent
//    window can't composite a GL surface, the overlay loses its see-through area but the game
//    RENDERS instead of dying to a black void.
//  - On total failure it throws PixiInitError (with every attempt's error) so the caller can
//    show a real diagnostics panel instead of nothing.

const OPAQUE_BG = '#14121a';

export interface CreatePixiAppOptions {
  width: number;
  height: number;
  /** Desktop overlay wants a see-through canvas; the browser build + title use an opaque bg. */
  transparent: boolean;
}

export interface InitAttemptFailure {
  label: string;
  error: string;
}

export class PixiInitError extends Error {
  readonly attempts: InitAttemptFailure[];
  constructor(attempts: InitAttemptFailure[]) {
    super(`Pixi renderer init failed after ${attempts.length} attempt(s)`);
    this.name = 'PixiInitError';
    this.attempts = attempts;
  }
}

function cappedResolution(): number {
  return Math.min(2, Math.ceil(window.devicePixelRatio || 1));
}

interface Attempt {
  label: string;
  opts: Partial<ApplicationOptions>;
}

function background(transparent: boolean): Partial<ApplicationOptions> {
  return transparent ? { backgroundAlpha: 0 } : { background: OPAQUE_BG };
}

function buildAttempts(o: CreatePixiAppOptions, safe: boolean): Attempt[] {
  const common: Partial<ApplicationOptions> = {
    width: o.width,
    height: o.height,
    antialias: false,
    roundPixels: true,
    autoDensity: true,
    preference: ['webgl'],
    failIfMajorPerformanceCaveat: false,
    webgl: { preferWebGLVersion: 2 },
  };

  // Safe mode: skip straight to the most conservative config (opaque, resolution 1).
  if (safe) {
    return [{ label: 'safe-opaque-res1', opts: { ...common, ...background(false), resolution: 1 } }];
  }

  const attempts: Attempt[] = [
    { label: 'preferred', opts: { ...common, ...background(o.transparent), resolution: cappedResolution() } },
  ];
  if (o.transparent) {
    // Same transparent canvas, but drop to resolution 1 — hi-dpi alpha surfaces are the
    // fussiest to allocate in the overlay webviews.
    attempts.push({ label: 'transparent-res1', opts: { ...common, backgroundAlpha: 0, resolution: 1 } });
  }
  // Last resort: opaque, resolution 1. Sacrifices the see-through overlay so the game renders.
  attempts.push({ label: 'opaque-res1', opts: { ...common, background: OPAQUE_BG, resolution: 1 } });
  return attempts;
}

export async function createPixiApp(o: CreatePixiAppOptions): Promise<Application> {
  // Must run before any Assets.load (the texture loaders run right after init in both the
  // title + game paths) so the tauri:// createImageBitmap decode bug never bites.
  configurePixiLoader();
  // Safe mode is ONE-SHOT: consume it now so a user who entered it (e.g. during a past
  // failure) isn't stranded in the opaque/low-detail canvas forever — the next launch tries
  // the normal transparent path again, and the panel re-offers safe mode if it's still needed.
  const safe = isRenderSafeMode();
  if (safe) setRenderSafeMode(false);
  const failures: InitAttemptFailure[] = [];
  for (const attempt of buildAttempts(o, safe)) {
    const app = new Application();
    try {
      await app.init(attempt.opts);
      if (failures.length > 0) {
        console.warn(`[render] Pixi init fell back to "${attempt.label}" after ${failures.length} failed attempt(s)`, failures);
      }
      return app;
    } catch (err) {
      failures.push({
        label: attempt.label,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
      try {
        app.destroy(true);
      } catch {
        /* a half-initialised app may throw on teardown — nothing to clean up then */
      }
    }
  }
  throw new PixiInitError(failures);
}

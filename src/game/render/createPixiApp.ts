import { Application } from 'pixi.js';
import type { ApplicationOptions } from 'pixi.js';

// The ONE place a Pixi Application is created — both canvases (the game strip + the title
// scene) share these options. If init throws, it propagates to the caller (GameView /
// TitleStage), which shows the RenderErrorPanel instead of a silent black canvas.

const OPAQUE_BG = '#14121a';

export interface CreatePixiAppOptions {
  width: number;
  height: number;
  /** Desktop overlay wants a see-through canvas; the browser build + title use an opaque bg. */
  transparent: boolean;
}

export async function createPixiApp(o: CreatePixiAppOptions): Promise<Application> {
  const opts: Partial<ApplicationOptions> = {
    ...(o.transparent ? { backgroundAlpha: 0 } : { background: OPAQUE_BG }),
    width: o.width,
    height: o.height,
    antialias: false,
    roundPixels: true,
    autoDensity: true,
    // Always 2: the stage is drawn at ×1.5 (UI_SCALE), so a backing store of ×2 gives every art pixel exactly 3
    // backing pixels on ANY display. The DOM then scales the canvas to a whole number of screen pixels per art
    // pixel (state/pixelScale) with nearest-neighbour sampling, which keeps the blocks even. At ×1 the stage's
    // ×1.5 would already be uneven in the backing store.
    resolution: 2,
    // Force WebGL (Pixi's recommended production renderer); the array form also blocklists
    // WebGPU, which is buggy/absent in the Tauri webviews (WKWebView / WebKitGTK).
    preference: ['webgl'],
  };
  const app = new Application();
  await app.init(opts);
  return app;
}

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
    resolution: Math.min(2, Math.ceil(window.devicePixelRatio || 1)),
    // Force WebGL (Pixi's recommended production renderer); the array form also blocklists
    // WebGPU, which is buggy/absent in the Tauri webviews (WKWebView / WebKitGTK).
    preference: ['webgl'],
  };
  const app = new Application();
  await app.init(opts);
  return app;
}

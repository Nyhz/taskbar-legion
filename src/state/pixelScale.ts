// Whole-pixel game scale. The strip and its HUD are pixel art: they only look right when one art pixel covers a
// WHOLE number of screen pixels. The strip is drawn at UI_SCALE × gameScale CSS px per art pixel, so on a display
// with `dpr` screen pixels per CSS px the allowed gameScale values are k / (UI_SCALE · dpr) for whole k.
// Nothing moves when the scale changes — the strip stays docked bottom-centre with the panels above it — only
// its size steps. Pure: no window access here; callers pass the display's pixel ratio.
//
// The one exception is the HALF stop (2026-11-20, user: on a 2560×1440 screen at 1:1, ×1 is too small and ×2 too
// large). Where two neighbouring whole stops are HALF_STOP_MIN_GAP apart or more (×1 → ×2 on a standard display;
// never on a retina one, whose ×2 → ×3 → ×4 are already close), the stop between them is offered too. It is not
// whole-pixel: the strip is smoothed down from its ×3 backing store (every art pixel exactly 1.5 screen pixels,
// soft edges instead of uneven blocks). It is only ever the player's CHOICE — a default never lands on it.

/** Baseline UI sizing baked into the layout (strip canvas, HUD). The user's game scale multiplies on top. */
export const UI_SCALE = 1.5;
/** Width of the battle strip in art pixels. */
export const STRIP_ART_WIDTH = 600;
/** The strip must stay readable and fit the overlay window (1280 logical px wide): CSS-px bounds for its width. */
export const STRIP_MIN_CSS_WIDTH = 560;
export const STRIP_MAX_CSS_WIDTH = 1240;

/** Screen pixels per art pixel that a `gameScale` yields on a display of pixel ratio `dpr`. */
export function screenPixelsPerArtPixel(gameScale: number, dpr: number): number {
  return UI_SCALE * gameScale * dpr;
}

/** The strip (with its HUD) may take at most this share of the window's height: it is an ambient strip, and the
 *  panels need the rest. On a 720p or 768p screen this leaves ×1 only (×2 would take more than half the window).
 *  Was 0.42 until 2026-11-18, which also hid ×2 on a 900-pt-tall screen (window 820, ×2 = 364 = 44 %): too small to
 *  play there (user). The panels above shrink to fit whatever room is left (fitPanelPixels). */
export const STRIP_MAX_HEIGHT_SHARE = 0.5;
const STRIP_AND_HUD_ART_HEIGHT = 182; // STRIP_ART_HEIGHT + HUD_ART_HEIGHT (declared below)

/** Two neighbouring whole stops this many times apart (or more) get the half stop between them: ×1 → ×2 does
 *  (×1.5), ×2 → ×3 does not. */
export const HALF_STOP_MIN_GAP = 2;

/** True when `gameScale` puts one art pixel on a whole number of screen pixels of a display of ratio `dpr`. */
export function isWholePixelStop(gameScale: number, dpr: number): boolean {
  const pixels = screenPixelsPerArtPixel(gameScale, dpr > 0 && Number.isFinite(dpr) ? dpr : 1);
  return Math.abs(pixels - Math.round(pixels)) < 1e-6;
}

/** The game scales this display offers, smallest first: every whole-pixel one, plus the half stop where two of
 *  them are too far apart (HALF_STOP_MIN_GAP). Never empty, and the smallest is always whole. With
 *  `viewportCssHeight`, stops whose strip would take more than STRIP_MAX_HEIGHT_SHARE of it are left out. */
export function gameScaleStops(dpr: number, viewportCssHeight?: number): number[] {
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const whole: number[] = []; // screen pixels per art pixel
  for (let k = 1; k <= 16; k++) {
    const cssWidth = (STRIP_ART_WIDTH * k) / ratio;
    if (cssWidth < STRIP_MIN_CSS_WIDTH) continue;
    if (cssWidth > STRIP_MAX_CSS_WIDTH) break;
    whole.push(k);
  }
  // An odd ratio can leave no whole-pixel width inside the bounds: take the largest that still fits the window.
  if (whole.length === 0) whole.push(Math.max(1, Math.floor((STRIP_MAX_CSS_WIDTH * ratio) / STRIP_ART_WIDTH)));
  const pixels: number[] = [];
  whole.forEach((k, i) => {
    const before = whole[i - 1];
    if (before !== undefined && k / before >= HALF_STOP_MIN_GAP) pixels.push((before + k) / 2);
    pixels.push(k);
  });
  const stops = pixels.map((k) => k / (UI_SCALE * ratio));
  if (viewportCssHeight === undefined || !(viewportCssHeight > 0)) return stops;
  const cssHeight = (stop: number): number => STRIP_AND_HUD_ART_HEIGHT * UI_SCALE * stop;
  const short = stops.filter((stop) => cssHeight(stop) <= viewportCssHeight * STRIP_MAX_HEIGHT_SHARE);
  return short.length > 0 ? short : stops.slice(0, 1);
}

/** The allowed stop closest to `value` (compared as a ratio, so ×1.33 beats ×0.67 for a stored 1). Only the
 *  whole-pixel stops count unless `half` says the player picked a half stop: a default, an old save or a
 *  window that changed display never lands on one by itself. */
export function snapGameScale(value: number, dpr: number, viewportCssHeight?: number, half = false): number {
  const offered = gameScaleStops(dpr, viewportCssHeight);
  const stops = half ? offered : offered.filter((stop) => isWholePixelStop(stop, dpr));
  const wanted = value > 0 && Number.isFinite(value) ? value : 1;
  let best = stops[0] ?? 1;
  for (const stop of stops) {
    if (Math.abs(Math.log(stop / wanted)) < Math.abs(Math.log(best / wanted)) - 1e-9) best = stop;
  }
  return best;
}

// ── The screens the game must fit (set by the user, 2026-11-15) ──────────────────────────────────────────────
// Sizes in CSS px with the display's pixel ratio. The MacBook Pro M4 is listed at its default scaled
// resolution for both sizes; the 14" is the tighter one. `fitsTargetScreens` tests keep these honest.
export interface TargetScreen {
  name: string;
  width: number;
  height: number;
  dpr: number;
}

export const TARGET_SCREENS: readonly TargetScreen[] = [
  { name: '1280×720', width: 1280, height: 720, dpr: 1 },
  { name: '1920×1080', width: 1920, height: 1080, dpr: 1 },
  { name: '2560×1440', width: 2560, height: 1440, dpr: 1 },
  { name: 'MacBook Pro 14" M4', width: 1512, height: 982, dpr: 2 },
  { name: 'MacBook Pro 16" M4', width: 1728, height: 1117, dpr: 2 },
];

/** Height of the strip plus its HUD rail, in art pixels. */
export const STRIP_ART_HEIGHT = 160;
export const HUD_ART_HEIGHT = 22;
/** Screen height the OS keeps for itself (menu bar / taskbar / dock), in CSS px: a safe allowance. */
export const OS_CHROME_CSS_HEIGHT = 64;

/** The largest whole number of screen pixels per art pixel at which an `artW × artH` piece fits a
 *  `cssW × cssH` area on a display of pixel ratio `dpr` (0 = it does not fit even at one screen pixel). */
export function wholePixelFit(dpr: number, cssW: number, cssH: number, artW: number, artH: number): number {
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  return Math.max(0, Math.floor(Math.min((cssW * ratio) / artW, (cssH * ratio) / artH)));
}

/** Screen pixels per art pixel for the kit panels floating above the strip: the same as the strip's when the
 *  open panels fit the space above it, otherwise the largest whole number that does (never below 1).
 *  `needArt` is the art-pixel box the open panels need side by side; `viewport` and `stripCssHeight` are CSS px. */
export function panelPixelsPerArtPixel(args: {
  dpr: number;
  viewport: { width: number; height: number };
  stripCssHeight: number;
  stripPixels: number;
  needArt: { width: number; height: number };
  marginCss?: number;
}): number {
  const { dpr, viewport, stripCssHeight, stripPixels, needArt } = args;
  const margin = args.marginCss ?? 8;
  if (needArt.width <= 0 || needArt.height <= 0) return Math.max(1, Math.round(stripPixels));
  const fit = wholePixelFit(dpr, viewport.width - margin * 2, viewport.height - stripCssHeight - margin, needArt.width, needArt.height);
  return Math.max(1, Math.min(Math.round(stripPixels), fit));
}

/** The same, asking for the art box at each candidate scale: the largest number of screen pixels per art pixel —
 *  the strip's own (which may be a half stop: the panels then match it), then every whole number below it down
 *  to 1 — at which `needArtAt(pixels)` fits above the strip (1 if none does). */
export function fitPanelPixels(args: {
  dpr: number;
  viewport: { width: number; height: number };
  stripCssHeight: number;
  stripPixels: number;
  needArtAt: (pixels: number) => { width: number; height: number };
  marginCss?: number;
}): number {
  const { dpr, viewport, stripCssHeight, needArtAt } = args;
  const margin = args.marginCss ?? 8;
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const strip = Math.max(1, Math.round(args.stripPixels * 2) / 2);
  for (let pixels = strip; pixels > 1; pixels = Number.isInteger(pixels) ? pixels - 1 : Math.floor(pixels)) {
    const need = needArtAt(pixels);
    const fitsWide = (need.width * pixels) / ratio <= viewport.width - margin * 2;
    const fitsTall = (need.height * pixels) / ratio <= viewport.height - stripCssHeight - margin;
    if (fitsWide && fitsTall) return pixels;
  }
  return 1;
}

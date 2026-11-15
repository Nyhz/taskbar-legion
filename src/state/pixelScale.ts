// Whole-pixel game scale. The strip and its HUD are pixel art: they only look right when one art pixel covers a
// WHOLE number of screen pixels. The strip is drawn at UI_SCALE × gameScale CSS px per art pixel, so on a display
// with `dpr` screen pixels per CSS px the allowed gameScale values are k / (UI_SCALE · dpr) for whole k.
// Nothing moves when the scale changes — the strip stays docked bottom-centre with the panels above it — only
// its size steps. Pure: no window access here; callers pass the display's pixel ratio.

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

/** The strip (with its HUD) may take at most this share of the screen's height: it is an ambient strip, and the
 *  panels need the rest. On a 720p screen this leaves ×1 only (×2 would take half the screen). */
export const STRIP_MAX_HEIGHT_SHARE = 0.42;
const STRIP_AND_HUD_ART_HEIGHT = 182; // STRIP_ART_HEIGHT + HUD_ART_HEIGHT (declared below)

/** The game scales that land on whole screen pixels for this display, smallest first. Never empty. With
 *  `viewportCssHeight`, stops whose strip would take more than STRIP_MAX_HEIGHT_SHARE of it are left out. */
export function gameScaleStops(dpr: number, viewportCssHeight?: number): number[] {
  const ratio = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const stops: number[] = [];
  for (let k = 1; k <= 16; k++) {
    const cssWidth = (STRIP_ART_WIDTH * k) / ratio;
    if (cssWidth < STRIP_MIN_CSS_WIDTH) continue;
    if (cssWidth > STRIP_MAX_CSS_WIDTH) break;
    stops.push(k / (UI_SCALE * ratio));
  }
  // An odd ratio can leave no whole-pixel width inside the bounds: take the largest that still fits the window.
  if (stops.length === 0) {
    const k = Math.max(1, Math.floor((STRIP_MAX_CSS_WIDTH * ratio) / STRIP_ART_WIDTH));
    stops.push(k / (UI_SCALE * ratio));
  }
  if (viewportCssHeight === undefined || !(viewportCssHeight > 0)) return stops;
  const cssHeight = (stop: number): number => STRIP_AND_HUD_ART_HEIGHT * UI_SCALE * stop;
  const short = stops.filter((stop) => cssHeight(stop) <= viewportCssHeight * STRIP_MAX_HEIGHT_SHARE);
  return short.length > 0 ? short : stops.slice(0, 1);
}

/** The allowed stop closest to `value` (compared as a ratio, so ×1.33 beats ×0.67 for a stored 1). */
export function snapGameScale(value: number, dpr: number, viewportCssHeight?: number): number {
  const stops = gameScaleStops(dpr, viewportCssHeight);
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

/** The same, asking for the art box at each candidate scale: the largest whole number of screen pixels per art
 *  pixel, from the strip's down to 1, at which `needArtAt(pixels)` fits above the strip (1 if none does). */
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
  for (let pixels = Math.max(1, Math.round(args.stripPixels)); pixels > 1; pixels--) {
    const need = needArtAt(pixels);
    const fitsWide = (need.width * pixels) / ratio <= viewport.width - margin * 2;
    const fitsTall = (need.height * pixels) / ratio <= viewport.height - stripCssHeight - margin;
    if (fitsWide && fitsTall) return pixels;
  }
  return 1;
}

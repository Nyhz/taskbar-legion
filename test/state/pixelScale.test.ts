import { describe, expect, it } from 'vitest';
import {
  HUD_ART_HEIGHT,
  OS_CHROME_CSS_HEIGHT,
  STRIP_ART_HEIGHT,
  STRIP_ART_WIDTH,
  TARGET_SCREENS,
  fitPanelPixels,
  wholePixelFit,
  STRIP_MAX_CSS_WIDTH,
  STRIP_MIN_CSS_WIDTH,
  gameScaleStops,
  screenPixelsPerArtPixel,
  snapGameScale,
  type TargetScreen,
} from '@/state/pixelScale';
import { BAG_MAX_ROWS, BAG_MIN_ROWS, bagRows, heroWindowArt } from '@/ui/panels/hero/heroLayout';
import {
  CONSTELLATION_ART_WIDTH,
  HERO_ART_WIDTH,
  PANEL_COLS,
  PANEL_CONTENT_ART,
  TABS_ART,
  WING_ART_WIDTH,
  WING_COLS,
  WING_CONTENT_ART,
  WING_MAX_ART_HEIGHT,
} from '@/ui/panels/panelLayout';
import { KIT_WINGS_ART, PANELS_NEED_ART } from '@/ui/panels/panelFit';

const RATIOS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3];

describe('whole-pixel game scale', () => {
  it('every stop puts one art pixel on a whole number of screen pixels', () => {
    for (const dpr of RATIOS) {
      for (const stop of gameScaleStops(dpr)) {
        const px = screenPixelsPerArtPixel(stop, dpr);
        expect(Math.abs(px - Math.round(px))).toBeLessThan(1e-9);
        expect(Math.round(px)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps the strip inside its width bounds, and always offers at least one stop', () => {
    for (const dpr of RATIOS) {
      const stops = gameScaleStops(dpr);
      expect(stops.length).toBeGreaterThan(0);
      for (const stop of stops) {
        const cssWidth = (STRIP_ART_WIDTH * screenPixelsPerArtPixel(stop, dpr)) / dpr;
        expect(cssWidth).toBeLessThanOrEqual(STRIP_MAX_CSS_WIDTH + 1e-9);
      }
    }
    // The common displays all have a stop at or above the minimum width.
    for (const dpr of [1, 1.5, 2, 3]) {
      const widths = gameScaleStops(dpr).map(
        (s) => (STRIP_ART_WIDTH * screenPixelsPerArtPixel(s, dpr)) / dpr,
      );
      expect(Math.min(...widths)).toBeGreaterThanOrEqual(STRIP_MIN_CSS_WIDTH - 1e-9);
    }
  });

  it('a retina display keeps the old default exactly, between a smaller and a larger step', () => {
    const stops = gameScaleStops(2);
    expect(stops.map((s) => Math.round(screenPixelsPerArtPixel(s, 2)))).toEqual([2, 3, 4]);
    expect(snapGameScale(1, 2)).toBe(1);
  });

  it('a standard display offers ×1 and ×2, and a stored default snaps to ×2', () => {
    const stops = gameScaleStops(1);
    expect(stops.map((s) => Math.round(screenPixelsPerArtPixel(s, 1)))).toEqual([1, 2]);
    expect(Math.round(screenPixelsPerArtPixel(snapGameScale(1, 1), 1))).toBe(2);
  });

  it('snaps old stored values (0.75 / 1 / 1.25) to a real stop and survives garbage', () => {
    for (const dpr of RATIOS) {
      for (const stored of [0.75, 1, 1.25, 0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(gameScaleStops(dpr)).toContain(snapGameScale(stored, dpr));
      }
    }
    expect(gameScaleStops(0)).toEqual(gameScaleStops(1));
  });
});

// The user's hard requirements (2026-11-15): the game must fit 1280×720, 1920×1080, 2560×1440 and the MacBook
// Pro M4; the hero window is the fixed centre and every auxiliary panel is a WING of ONE width glued to one of
// its sides ("todos los paneles laterales del mismo ancho … controlaremos los anchos máximos"), narrow and tall
// ("más estrechas y más altas"). So the widest the
// panels can be is known — hero + a wing on EACH side + the bookmarks — and it must fit every target screen at the
// strip's own scale, with the 8 px margins.
const STRIP_AND_HUD = STRIP_ART_HEIGHT + HUD_ART_HEIGHT;
const MARGIN_CSS = 8;

function layoutOn(screen: TargetScreen): {
  stripPixels: number;
  panelPixels: number;
  availArtHeight: number;
} {
  const viewport = { width: screen.width, height: screen.height - OS_CHROME_CSS_HEIGHT };
  const stripPixels = Math.round(
    screenPixelsPerArtPixel(snapGameScale(1, screen.dpr, viewport.height), screen.dpr),
  );
  const stripCssHeight = (STRIP_AND_HUD * stripPixels) / screen.dpr;
  const panelPixels = fitPanelPixels({
    dpr: screen.dpr,
    viewport,
    stripCssHeight,
    stripPixels,
    needArtAt: () => PANELS_NEED_ART,
    marginCss: MARGIN_CSS,
  });
  return {
    stripPixels,
    panelPixels,
    availArtHeight: ((viewport.height - stripCssHeight - MARGIN_CSS) * screen.dpr) / panelPixels,
  };
}

describe('the screens the game must fit', () => {
  it('every wing has one width — six item cells, narrow and tall — and the hero window keeps its eleven', () => {
    expect(PANEL_CONTENT_ART).toBe(PANEL_COLS * 26 - 2);
    expect(heroWindowArt().width).toBe(HERO_ART_WIDTH);
    expect(WING_CONTENT_ART).toBe(WING_COLS * 26 - 2);
    expect(WING_COLS).toBe(6);
    expect(WING_ART_WIDTH).toBe(WING_CONTENT_ART + 14);
    expect(WING_ART_WIDTH).toBeLessThan(HERO_ART_WIDTH);
    for (const wing of Object.values(KIT_WINGS_ART)) {
      expect(wing.width).toBe(WING_ART_WIDTH);
      expect(wing.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
    }
    expect(CONSTELLATION_ART_WIDTH).toBe(HERO_ART_WIDTH + 2 * WING_ART_WIDTH + 2 * TABS_ART + 2);
  });

  it('the tallest a wing may be is the room above the strip on a 1920×1080 screen in the Tauri window', () => {
    expect(WING_MAX_ART_HEIGHT).toBe((1000 - 364 - MARGIN_CSS) / 2);
  });

  it('on every target screen the strip takes a modest share of the height', () => {
    for (const screen of TARGET_SCREENS) {
      const { stripPixels } = layoutOn(screen);
      const stripCssHeight = (STRIP_AND_HUD * stripPixels) / screen.dpr;
      expect(stripCssHeight, screen.name).toBeLessThanOrEqual(
        (screen.height - OS_CHROME_CSS_HEIGHT) * 0.42 + 1e-9,
      );
      expect((STRIP_ART_WIDTH * stripPixels) / screen.dpr, screen.name).toBeLessThanOrEqual(screen.width);
    }
  });

  it("on every target screen hero + a wing on EACH side fits at the strip's own scale, with the margins", () => {
    for (const screen of TARGET_SCREENS) {
      const { stripPixels, panelPixels, availArtHeight } = layoutOn(screen);
      expect(panelPixels, `${screen.name}: panels at the strip's scale`).toBe(stripPixels);
      const cssWidth = (CONSTELLATION_ART_WIDTH * panelPixels) / screen.dpr;
      expect(cssWidth, `${screen.name}: hero + 2 wings + bookmarks`).toBeLessThanOrEqual(
        screen.width - 2 * MARGIN_CSS,
      );
      // The hero window with the rows its bag takes there, and the tallest kit wing, fit above the strip.
      expect(heroWindowArt(bagRows(availArtHeight)).height, `${screen.name}: hero`).toBeLessThanOrEqual(
        availArtHeight,
      );
      for (const [name, wing] of Object.entries(KIT_WINGS_ART)) {
        expect(wing.height, `${screen.name}: ${name}`).toBeLessThanOrEqual(availArtHeight);
      }
    }
  });

  it('picks the scales we expect, and the bag shows between two and five rows', () => {
    const at = (name: string): ReturnType<typeof layoutOn> => {
      const screen = TARGET_SCREENS.find((t) => t.name === name);
      if (screen === undefined) throw new Error(name);
      return layoutOn(screen);
    };
    expect(at('1280×720')).toMatchObject({ stripPixels: 1, panelPixels: 1 }); // ×2 would take half the screen
    expect(at('1920×1080')).toMatchObject({ stripPixels: 2, panelPixels: 2 });
    expect(at('2560×1440')).toMatchObject({ stripPixels: 2, panelPixels: 2 });
    expect(at('MacBook Pro 14" M4')).toMatchObject({ stripPixels: 3, panelPixels: 3 });
    expect(at('MacBook Pro 16" M4')).toMatchObject({ stripPixels: 3, panelPixels: 3 });
    for (const screen of TARGET_SCREENS) {
      const rows = bagRows(layoutOn(screen).availArtHeight);
      expect(rows, screen.name).toBeGreaterThanOrEqual(BAG_MIN_ROWS);
      expect(rows, screen.name).toBeLessThanOrEqual(BAG_MAX_ROWS);
    }
    // The tightest: a 1920×1080 screen inside the Tauri window (1000 px tall) — three rows of bag, 33 cells.
    expect(bagRows((1000 - 364 - MARGIN_CSS) / 2)).toBe(3);
    expect(bagRows(10_000)).toBe(BAG_MAX_ROWS);
    expect(bagRows(0)).toBe(BAG_MIN_ROWS);
  });

  it('a panel that does not fit reports 0, and a bigger area never yields a smaller scale', () => {
    expect(wholePixelFit(1, 500, 300, 520, 240)).toBe(0);
    expect(wholePixelFit(1, 1280, 308, 520, 240)).toBe(1);
    expect(wholePixelFit(2, 1512, 645, 520, 240)).toBeGreaterThanOrEqual(
      wholePixelFit(2, 1512, 400, 520, 240),
    );
  });

  it('never goes below one screen pixel', () => {
    const tiny = { width: 300, height: 200 };
    expect(
      fitPanelPixels({
        dpr: 1,
        viewport: tiny,
        stripCssHeight: 182,
        stripPixels: 2,
        needArtAt: () => PANELS_NEED_ART,
      }),
    ).toBe(1);
  });
});

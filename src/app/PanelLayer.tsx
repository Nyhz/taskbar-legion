import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { LEFT_PANELS, displayPixelRatio, type PanelKey } from '@/state/slices/uiSlice';
import {
  HUD_ART_HEIGHT,
  STRIP_ART_HEIGHT,
  fitPanelPixels,
  screenPixelsPerArtPixel,
} from '@/state/pixelScale';
import { PixelWindow } from '@/ui/components/PixelWindow';
import { TechTreePanel } from '@/ui/panels/TechTreePanel';
import { PetsPanel } from '@/ui/panels/PetsPanel';
import { CubePanel, CubeHelpButton } from '@/ui/panels/CubePanel';
import { MapPanel } from '@/ui/panels/MapPanel';
import { Bookmarks, KitRoot } from '@/ui/kit';
import { PanelSpaceContext } from '@/ui/panels/panelSpace';
import { PANELS_NEED_ART } from '@/ui/panels/panelFit';
import { useWingTabs } from '@/ui/panels/wingTabs';
import { KIT_PANELS } from './kitPanels';

// The panels above the strip. The HERO WINDOW (`party`) is the main panel: centred over the strip, and nothing
// ever moves it. Every other panel is a WING that opens GLUED to its left or right edge (frames touching),
// bottom-aligned with it and unfolding outwards — at most one per side (uiSlice). The wings are children of the
// hero's own wrapper, positioned from its real edges, so there is nothing to measure and no gap to get wrong.
//
// Scale: one whole number of screen pixels per art pixel for all of them — the strip's own when the widest the
// panels can ever be (hero + a wing on EACH side + the bookmarks, ui/panels/panelFit) fits the window, otherwise
// the largest lower one. It does not depend on which wings are open, so opening or swapping one never rescales.
//
// The right-side panels (cube, map, pets, upgrades) are still the OLD ones, drawn through PixelWindow at their
// old size; they stand in the right wing's place until each is rebuilt to the wing width, and they may overflow.
//
// Open/close is animated: each panel mounts with an `-in` class and, when closed, plays an `-out` class before it
// actually unmounts (the entry lifecycle below).

const KIT_MARGIN_CSS = 8; // air between the panels and the window's edges

// The old panels, until they are rebuilt: their title and size in CSS px (× the old menu scale).
const OLD_TITLE: Partial<Record<PanelKey, string>> = {
  cube: 'Cube',
  map: 'Map',
  pets: 'Pets',
  tech: 'Tech Tree',
};
const OLD_WIDTH: Partial<Record<PanelKey, number>> = { cube: 340, map: 340, pets: 340, tech: 520 };
const OLD_HEIGHT: Partial<Record<PanelKey, number>> = { tech: 540, cube: 470 };

type Side = 'left' | 'right';
function sideOf(key: PanelKey): Side {
  return LEFT_PANELS.includes(key) ? 'left' : 'right';
}

interface Entry {
  key: PanelKey;
  // 'in' = playing the open animation, 'steady' = settled (NO animation class, so the panel
  // drops its composited layer and its scaled content re-rasterizes crisply), 'out' = exiting.
  phase: 'in' | 'out' | 'steady';
}

export function PanelLayer(): React.JSX.Element {
  const openPanels = useStore((s) => s.openPanels);
  const closePanel = useStore((s) => s.closePanel);
  const menuScale = useStore((s) => s.menuScale);
  const gameScale = useStore((s) => s.gameScale);

  // Mounted panels with their animation phase. A panel removed from `openPanels`
  // lingers in `out` until its exit animation ends, then it's dropped.
  const [entries, setEntries] = useState<Entry[]>([]);
  const openRef = useRef(openPanels);
  openRef.current = openPanels;

  useEffect(() => {
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.key));
      // Keep an already-shown panel in its current phase (don't restart its open animation);
      // only a panel coming back from 'out' replays 'in'. Closed panels go to 'out'.
      const result: Entry[] = prev.map((e) => ({
        key: e.key,
        phase: openPanels.includes(e.key) ? (e.phase === 'out' ? 'in' : e.phase) : 'out',
      }));
      for (const k of openPanels) if (!seen.has(k)) result.push({ key: k, phase: 'in' });
      return result;
    });
  }, [openPanels]);

  const onExitEnd = (key: PanelKey): void => {
    if (openRef.current.includes(key)) return; // reopened mid-exit — keep it
    setEntries((prev) => prev.filter((e) => e.key !== key));
  };

  // Open animation finished → settle to 'steady', dropping the animation class (and with it the
  // composited layer) so the scaled panel re-rasterizes sharp instead of staying a blurry bitmap.
  const onEnterEnd = (key: PanelKey): void => {
    setEntries((prev) =>
      prev.map((e) => (e.key === key && e.phase === 'in' ? { ...e, phase: 'steady' } : e)),
    );
  };
  const animEnd =
    (key: PanelKey, phase: Entry['phase']) =>
    (e: React.AnimationEvent): void => {
      if (e.target !== e.currentTarget) return; // ignore animations bubbling up from children
      if (phase === 'out') onExitEnd(key);
      else if (phase === 'in') onEnterEnd(key);
    };

  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const update = (): void => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // One scale for every kit panel, whatever is open: the strip's if the whole constellation fits, else lower.
  const dpr = displayPixelRatio();
  const stripPixels = Math.round(screenPixelsPerArtPixel(gameScale, dpr));
  const stripCssHeight = ((STRIP_ART_HEIGHT + HUD_ART_HEIGHT) * stripPixels) / dpr;
  const panelPixels = fitPanelPixels({
    dpr,
    viewport,
    stripCssHeight,
    stripPixels,
    needArtAt: () => PANELS_NEED_ART,
    marginCss: KIT_MARGIN_CSS,
  });
  const kitZoom = panelPixels / dpr;
  const panelSpace = {
    availArtHeight: ((viewport.height - stripCssHeight - KIT_MARGIN_CSS) * dpr) / panelPixels,
  };

  const hero = entries.find((e) => e.key === 'party');
  const wings = entries.filter((e) => e.key !== 'party');

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {hero !== undefined && (
        // The hero's wrapper is as wide as the hero window's frame and is centred by the row: its edges ARE
        // the hero's edges, and the wings hang from them.
        <div
          className={hero.phase === 'steady' ? undefined : `tl-panel-up-${hero.phase}`}
          onAnimationEnd={animEnd('party', hero.phase)}
          style={{ position: 'relative', pointerEvents: 'none' }}
        >
          <div className="tk-raise" style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
            <PanelSpaceContext.Provider value={panelSpace}>
              <KitRoot zoom={kitZoom}>{KIT_PANELS.party?.()}</KitRoot>
            </PanelSpaceContext.Provider>
          </div>
          {wings.map(({ key, phase }) => {
            const side = sideOf(key);
            const kit = KIT_PANELS[key];
            return (
              <div
                key={key}
                className={`tk-raise${phase === 'steady' ? '' : ` tl-panel-${side}-${phase}`}`}
                onAnimationEnd={animEnd(key, phase)}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  [side === 'left' ? 'right' : 'left']: '100%',
                  zIndex: 20,
                  pointerEvents: 'auto',
                }}
              >
                {kit !== undefined ? (
                  <PanelSpaceContext.Provider value={panelSpace}>
                    <KitRoot zoom={kitZoom}>{kit()}</KitRoot>
                  </PanelSpaceContext.Provider>
                ) : (
                  <>
                    <PixelWindow
                      id={`panel-${key}`}
                      title={OLD_TITLE[key] ?? key}
                      width={OLD_WIDTH[key] ?? 340}
                      height={OLD_HEIGHT[key]}
                      scale={menuScale}
                      headerActions={key === 'cube' ? <CubeHelpButton /> : undefined}
                      onClose={() => closePanel(key)}
                    >
                      {renderOldPanel(key)}
                    </PixelWindow>
                    {phase !== 'out' && <OldWingBookmarks side={side} zoom={kitZoom} />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// An old panel is not a kit window, so it cannot carry the side's bookmarks itself: the layer hangs the column on
// its outer edge, at the height the kit windows keep theirs (10 art px above the bottom).
function OldWingBookmarks({ side, zoom }: { side: Side; zoom: number }): React.JSX.Element {
  const { tabs, onTab } = useWingTabs(side);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 10 * zoom,
        [side === 'left' ? 'right' : 'left']: `calc(100% - ${3 * zoom}px)`,
        zIndex: -1,
      }}
    >
      <KitRoot zoom={zoom}>
        <Bookmarks tabs={tabs} onTab={onTab} side={side} solo />
      </KitRoot>
    </div>
  );
}

// Only the panels still on the old window reach this.
function renderOldPanel(key: PanelKey): React.JSX.Element | null {
  switch (key) {
    case 'tech':
      return <TechTreePanel />;
    case 'pets':
      return <PetsPanel />;
    case 'cube':
      return <CubePanel />;
    case 'map':
      return <MapPanel />;
    default:
      return null;
  }
}

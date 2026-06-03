import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { LEFT_PANELS, type PanelKey } from '@/state/slices/uiSlice';
import { PixelWindow } from '@/ui/components/PixelWindow';
import { PartyPanel } from '@/ui/panels/PartyPanel';
import { StashPanel } from '@/ui/panels/StashPanel';
import { TechTreePanel } from '@/ui/panels/TechTreePanel';
import { PetsPanel } from '@/ui/panels/PetsPanel';
import { CubePanel } from '@/ui/panels/CubePanel';
import { MapPanel } from '@/ui/panels/MapPanel';
import { HeroTabsPanel } from '@/ui/panels/party/HeroTabsPanel';
import { SettingsHeaderButton } from '@/ui/hud/OptionsPopover';

// Renders the open panels as a fixed, ANCHORED constellation laid out across a band
// the SAME WIDTH as the strip (measured at runtime). The party menu is centered and
// keeps a fixed size; the side panels FILL the leftover space on each side of it —
// stash/talents to the LEFT, cube/map/pets to the RIGHT. The tech tree is a full
// overlay that slides up from below to cover the party menu. Open/close is animated:
// each panel mounts with an `-in` class and, when closed, plays an `-out` class
// before it actually unmounts (see the entry lifecycle below).

const GAP = 6; // px between the party menu and a flanking side panel
const EDGE = 4; // px margin from the band's left/right edge
const PARTY_W = 380; // logical party width (kept fixed — "the dominant frame")
const PARTY_SCALE = 1.35; // party is enlarged so it dominates
const TECH_W = 520;
const TECH_SCALE = 1.3;
// The panel band is DECOUPLED from the (narrow) game strip: it targets BAND_TARGET px
// centered on the viewport so the party + its two flanking side panels can grow into the
// empty page margins (≈ party 513 + 2×340 ≈ 1200). Capped to the viewport on small screens.
const BAND_TARGET = 1200;
const BAND_MARGIN = 16; // keep the band off the screen edges
// Clamp the computed side-panel width so it can't collapse on a tiny band nor balloon
// on an ultra-wide one. Side panels are unscaled (scale 1.0) so their width fills px.
const SIDE_MIN = 120;
const SIDE_MAX = 360;

const PANEL_TITLES: Record<PanelKey, string> = {
  party: 'Party',
  stash: 'Stash',
  talents: 'Hero',
  cube: 'Cube',
  map: 'Map',
  pets: 'Pets',
  tech: 'Tech Tree',
};

const PANEL_HEIGHT: Partial<Record<PanelKey, number>> = { tech: 540 };

type Side = 'up' | 'left' | 'right' | 'tech';
function sideGroup(key: PanelKey): Side {
  if (key === 'party') return 'up';
  if (key === 'tech') return 'tech';
  return LEFT_PANELS.includes(key) ? 'left' : 'right';
}

interface Entry {
  key: PanelKey;
  phase: 'in' | 'out';
}

export function PanelLayer(): React.JSX.Element {
  const openPanels = useStore((s) => s.openPanels);
  const closePanel = useStore((s) => s.closePanel);

  // Mounted panels with their animation phase. A panel removed from `openPanels`
  // lingers in `out` until its exit animation ends, then it's dropped.
  const [entries, setEntries] = useState<Entry[]>([]);
  const openRef = useRef(openPanels);
  openRef.current = openPanels;

  useEffect(() => {
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.key));
      const result: Entry[] = prev.map((e) => ({ key: e.key, phase: openPanels.includes(e.key) ? 'in' : 'out' }));
      for (const k of openPanels) if (!seen.has(k)) result.push({ key: k, phase: 'in' });
      return result;
    });
  }, [openPanels]);

  const onExitEnd = (key: PanelKey): void => {
    if (openRef.current.includes(key)) return; // reopened mid-exit — keep it
    setEntries((prev) => prev.filter((e) => e.key !== key));
  };

  // The band targets BAND_TARGET px (centered on the viewport), capped to the viewport on
  // small screens — so the side panels fill the leftover space beside the fixed party menu.
  const [bandW, setBandW] = useState(BAND_TARGET);
  useEffect(() => {
    const update = (): void => setBandW(Math.min(BAND_TARGET, window.innerWidth - BAND_MARGIN));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Party is fixed and centered; each side panel fills its half of the leftover space.
  const partyRendered = PARTY_W * PARTY_SCALE;
  const techRendered = TECH_W * TECH_SCALE;
  const partyLeft = (bandW - partyRendered) / 2;
  const sideW = Math.max(SIDE_MIN, Math.min(SIDE_MAX, partyLeft - GAP - EDGE));

  const layoutOf = (key: PanelKey, group: Side): { left: number; width: number; scale: number; height?: number } => {
    if (key === 'party') return { left: partyLeft, width: PARTY_W, scale: PARTY_SCALE };
    if (key === 'tech') return { left: (bandW - techRendered) / 2, width: TECH_W, scale: TECH_SCALE, height: PANEL_HEIGHT.tech };
    if (group === 'left') return { left: EDGE, width: sideW, scale: 1 };
    return { left: bandW - EDGE - sideW, width: sideW, scale: 1 }; // right
  };

  return (
    <div
      style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 0, bottom: 0,
        width: bandW, pointerEvents: 'none',
      }}
    >
      {entries.map(({ key, phase }) => {
        const group = sideGroup(key);
        const z = group === 'tech' ? 50 : key === 'party' ? 10 : 20;
        const anim = group === 'tech' ? `tl-tech-${phase}` : `tl-panel-${group}-${phase}`;
        const { left, width, scale, height } = layoutOf(key, group);
        return (
          <div
            key={key}
            className={anim}
            onAnimationEnd={() => { if (phase === 'out') onExitEnd(key); }}
            style={{ position: 'absolute', left, bottom: 0, zIndex: z, pointerEvents: 'auto' }}
          >
            <PixelWindow
              id={`panel-${key}`}
              title={PANEL_TITLES[key]}
              width={width}
              height={height}
              scale={scale}
              headerActions={key === 'party' ? <SettingsHeaderButton /> : undefined}
              onClose={() => closePanel(key)}
            >
              {renderPanel(key)}
            </PixelWindow>
          </div>
        );
      })}
    </div>
  );
}

function renderPanel(key: PanelKey): React.JSX.Element {
  switch (key) {
    case 'party':
      return <PartyPanel />;
    case 'stash':
      return <StashPanel />;
    case 'tech':
      return <TechTreePanel />;
    case 'pets':
      return <PetsPanel />;
    case 'cube':
      return <CubePanel />;
    case 'map':
      return <MapPanel />;
    case 'talents':
      return <HeroTabsPanel />;
  }
}

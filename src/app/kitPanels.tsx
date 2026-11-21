import type { PanelKey } from '@/state/slices/uiSlice';
import { HeroWindow } from '@/ui/panels/hero/HeroWindow';
import { TalentsWindow } from '@/ui/panels/hero/TalentsWindow';
import { SheetWindow } from '@/ui/panels/hero/SheetWindow';
import { StashWindow } from '@/ui/panels/stash/StashWindow';
import { CubeWindow } from '@/ui/panels/cube/CubeWindow';
import { MapWindow } from '@/ui/panels/map/MapWindow';
import { PetsWindow } from '@/ui/panels/pets/PetsWindow';
import { TechWindow } from '@/ui/panels/tech/TechWindow';
import { CodexWindow } from '@/ui/panels/codex/CodexWindow';

// Panels already rebuilt on the interface kit (src/ui/kit). PanelLayer wraps each in a KitRoot at a whole number
// of screen pixels per art pixel; a panel NOT listed here still renders through the old PixelWindow path. A kit
// panel renders its own kit `Window` (and closes itself through the store). The hero window is the main panel;
// every other kit panel is a wing of exactly WING_ART_WIDTH (ui/panels/panelLayout), so the layer never has to
// measure one.

export const KIT_PANELS: Partial<Record<PanelKey, () => React.JSX.Element>> = {
  party: () => <HeroWindow />,
  stash: () => <StashWindow />,
  talents: () => <TalentsWindow />,
  sheet: () => <SheetWindow />,
  cube: () => <CubeWindow />,
  map: () => <MapWindow />,
  pets: () => <PetsWindow />,
  codex: () => <CodexWindow />,
  tech: () => <TechWindow />,
};

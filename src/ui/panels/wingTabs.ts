import { useStore } from '@/state/store';
import { LEFT_PANELS, RIGHT_PANELS, type PanelKey } from '@/state/slices/uiSlice';
import { useT, type TextKey } from '@/i18n';
import type { WindowTab } from '@/ui/kit';

// The launchers of the auxiliary panels: bookmarks on the outer edge of the hero window — or of the wing that is
// open on that side, like the handle of a drawer. Left: stash, talents, sheet. Right: cube, map, pets, upgrades.
// One wing per side: pressing another bookmark swaps it, pressing the lit one closes it (uiSlice).

const SIGN: Record<PanelKey, string> = {
  party: 'hud_party',
  stash: 'hud_stash',
  talents: 'tab_talents',
  sheet: 'bag_sheet',
  cube: 'hud_cube',
  map: 'hud_map',
  pets: 'hud_pets',
  codex: 'codex_book',
  tech: 'hud_tech',
};

const LABEL: Record<PanelKey, TextKey> = {
  party: 'hud.panelParty',
  stash: 'hud.panelStash',
  talents: 'hud.panelTalents',
  sheet: 'hud.panelSheet',
  cube: 'hud.panelCube',
  map: 'hud.panelMap',
  pets: 'hud.panelPets',
  codex: 'hud.panelCodex',
  tech: 'hud.panelTech',
};

export type WingSide = 'left' | 'right';

export function wingsOf(side: WingSide): readonly PanelKey[] {
  return side === 'left' ? LEFT_PANELS : RIGHT_PANELS;
}

/** The wing open on a side, if any. */
export function useOpenWing(side: WingSide): PanelKey | undefined {
  return useStore((s) => wingsOf(side).find((k) => s.openPanels.includes(k)));
}

/** The bookmarks of one side (the open wing lit) and what pressing one does. */
export function useWingTabs(side: WingSide): { tabs: WindowTab[]; onTab: (key: string) => void } {
  const t = useT();
  const open = useOpenWing(side);
  const togglePanel = useStore((s) => s.togglePanel);
  const keys = wingsOf(side);
  return {
    tabs: keys.map((key) => ({
      key,
      sign: SIGN[key],
      label: t(LABEL[key]),
      state: open === key ? 'on' : 'idle',
    })),
    onTab: (key) => {
      const panel = keys.find((k) => k === key);
      if (panel !== undefined) togglePanel(panel);
    },
  };
}

import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Sign, TipTag } from '@/ui/kit';

// The one launcher on the rail: it opens the hero window — the main panel — or closes it with its wings. The
// auxiliary panels (stash, talents, sheet, cube, map, pets, upgrades) open from the bookmarks on the hero
// window's own edges (ui/panels/wingTabs).

export function HudDock(): React.JSX.Element {
  const t = useT();
  const open = useStore((s) => s.openPanels.includes('party'));
  const toggleMenu = useStore((s) => s.toggleMenu);
  return (
    <button
      type="button"
      className={`tk-hud-key has${open ? ' on' : ''}`}
      aria-label={t('hud.panelParty')}
      aria-pressed={open}
      onClick={toggleMenu}
    >
      <Sign name="hud_party" />
      <TipTag side="below">{t('hud.panelParty')}</TipTag>
    </button>
  );
}

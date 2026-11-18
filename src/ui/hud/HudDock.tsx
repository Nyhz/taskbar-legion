import { useStore } from '@/state/store';
import { getLanguage, useT } from '@/i18n';
import { Sign, TipTag } from '@/ui/kit';

// The one launcher on the rail: it opens the hero window — the main panel — or closes it with its wings. It is a small
// sign-board with the word MENU on it, in the game's language (2026-11-18; the plumed helm did not say it was the
// menu: tools/assets icon set s96_hud `hud_menu_*`). The auxiliary panels (stash, talents, sheet, cube, map, pets, upgrades) open from the bookmarks on the hero
// window's own edges (ui/panels/wingTabs).

export function HudDock(): React.JSX.Element {
  const t = useT();
  const open = useStore((s) => s.openPanels.includes('party'));
  const toggleMenu = useStore((s) => s.toggleMenu);
  return (
    <button
      type="button"
      className={`tk-hud-key tk-hud-menu has${open ? ' on' : ''}`}
      aria-label={t('hud.menu')}
      aria-pressed={open}
      onClick={toggleMenu}
    >
      <Sign name={getLanguage() === 'es' ? 'hud_menu_es' : 'hud_menu_en'} alt={t('hud.menu')} />
      <TipTag side="below">{t('hud.menuTip')}</TipTag>
    </button>
  );
}

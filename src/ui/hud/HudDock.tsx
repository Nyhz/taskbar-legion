import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Sign, TipTag } from '@/ui/kit';

// The one launcher on the rail: it opens the hero window — the main panel — or closes it with its wings. A sign of
// three bars and the word, in the rail's own steel and type, lit like its other keys (2026-11-18: the plumed helm did
// not say it was the menu; the gold sign-board that came after it stood out of the rail). The auxiliary panels (stash, talents, sheet, cube, map, pets, upgrades) open from the bookmarks on the hero
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
      <Sign name="hud_menu" alt={t('hud.menu')} />
      <span className="w">{t('hud.menu')}</span>
      <TipTag side="below">{t('hud.menuTip')}</TipTag>
    </button>
  );
}

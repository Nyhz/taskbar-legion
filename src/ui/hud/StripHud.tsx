import { useStore } from '@/state/store';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { KitRoot, Sign, Tip, TipTag, TipText, TipTitle } from '@/ui/kit';
import { HudDock } from './HudDock';
import { HudStage } from './HudStage';
import { HudChests } from './HudChests';
import { ScaleControls } from './ScaleControls';
import { SettingsHeaderButton } from './OptionsPopover';
import { QuitGameButton } from '@/ui/components/QuitGameButton';
import { isTauri } from '@/platform/tauri';
import './hud.css';

// The rail above the battle strip (mock-up: docs/redesign/mockups/05_hud.html), driven by the live HUD snapshot
// the engine pushes. Left: the panel launchers. Middle: where the party is. Right: chests, keys, the purse and
// the options. It is authored at the art's pixel and zoomed by the UI baseline, like the strip under it.

export function StripHud(): React.JSX.Element {
  const t = useT();
  const uiScale = useStore((s) => s.uiScale);
  const gold = useStore((s) => s.hud.gold);
  const keys = useStore((s) => s.hud.zoneKeysHeld);

  return (
    <KitRoot zoom={uiScale} data-interactive="true">
      <div className="tk-hud">
        <HudDock />
        <div className="tk-hud-mid">
          <HudStage />
        </div>
        <HudChests />
        <div className={`tk-hud-res has${keys > 0 ? '' : ' zero'}`}>
          <Sign name="hud_key" alt={t('hud.keys')} />
          {keys}
          <Tip side="below-end">
            <TipTitle>{t('hud.keys')}</TipTitle>
            <TipText>{t('hud.keysHelp')}</TipText>
          </Tip>
        </div>
        <div className="tk-gold has">
          <Sign name="ui_gold" alt={t('hud.gold')} />
          {format(gold)}
          <TipTag side="below-end">{t('hud.gold')}</TipTag>
        </div>
        {/* Settings, scale and quit are still the old popovers, authored at screen size: undo the rail's zoom
            for them. They are replaced when the Options panel is rebuilt on the kit. */}
        <div
          style={{ zoom: 1 / uiScale, display: 'flex', alignItems: 'center', gap: 4 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <SettingsHeaderButton />
          <ScaleControls />
          {isTauri() && <QuitGameButton />}
        </div>
      </div>
    </KitRoot>
  );
}

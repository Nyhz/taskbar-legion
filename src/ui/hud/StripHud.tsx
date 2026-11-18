import { useState } from 'react';
import { useStore } from '@/state/store';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { KitRoot, Sign, Tip, TipTag, TipText, TipTitle } from '@/ui/kit';
import { HudDock } from './HudDock';
import { HudStage } from './HudStage';
import { HudChests } from './HudChests';
import { OptionsAnchor } from '@/ui/options/OptionsAnchor';
import { OptionsWindow } from '@/ui/options/OptionsWindow';
import './hud.css';

// The rail above the battle strip (mock-up: docs/redesign/mockups/05_hud.html), driven by the live HUD snapshot
// the engine pushes. Left: the panel launchers. Middle: where the party is. Right: chests, keys, the purse and
// the cog that opens the options. It is authored at the art's pixel and zoomed by the UI baseline, like the
// strip under it.

export function StripHud(): React.JSX.Element {
  const t = useT();
  const uiScale = useStore((s) => s.uiScale);
  const gold = useStore((s) => s.hud.gold);
  const keys = useStore((s) => s.hud.zoneKeysHeld);
  // The options hang from the cog at the rail's end (a window of their own, above the rail).
  const gameScale = useStore((s) => s.gameScale);
  const [cog, setCog] = useState<HTMLButtonElement | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

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
          <span className="tk-hud-n">{keys}</span>
          <Tip side="below-end">
            <TipTitle>{t('hud.keys')}</TipTitle>
            <TipText>{t('hud.keysHelp')}</TipText>
          </Tip>
        </div>
        <div className="tk-gold has">
          <Sign name="ui_gold" alt={t('hud.gold')} />
          <span className="tk-hud-n gold">{format(gold)}</span>
          <TipTag side="below-end">{t('hud.gold')}</TipTag>
        </div>
        <button
          ref={setCog}
          type="button"
          className={`tk-hud-key has${optionsOpen ? ' on' : ''}`}
          aria-label={t('options.settings')}
          aria-pressed={optionsOpen}
          onPointerDown={(e) => e.stopPropagation()} // a press here must not start dragging the strip
          onClick={() => setOptionsOpen((open) => !open)}
        >
          <Sign name="hud_options" />
          {!optionsOpen && <TipTag side="below-end">{t('options.settings')}</TipTag>}
        </button>
      </div>
      {optionsOpen && (
        <OptionsAnchor anchor={cog} zoom={uiScale * gameScale}>
          <OptionsWindow onClose={() => setOptionsOpen(false)} />
        </OptionsAnchor>
      )}
    </KitRoot>
  );
}

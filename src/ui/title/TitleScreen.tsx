import { useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { quitGame } from '@/platform/quit';
import { setupTitleWindow } from '@/platform/desktopOverlay';
import { armGestureUnlock, initTitleMusic, playClick, toggleMute } from '@/platform/audio';
import { difficultyOf, stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { difficultyName, useT } from '@/i18n';
import { Key, KitRoot, Sign, Tip, TipLine, TipTag, TipTitle } from '@/ui/kit';
import { OptionsAnchor } from '@/ui/options/OptionsAnchor';
import { OptionsWindow } from '@/ui/options/OptionsWindow';
import { useMusic } from '@/ui/options/useMusic';
import { classCrestStem } from '@/ui/itemArt';
import { useSaveSummary } from './useSaveSummary';
import { TitleReel } from './TitleReel';
import './title.css';

// The start screen. The title lives in the strip's own format, docked bottom-centre exactly where the game's
// strip will stand: the party fighting each world's boss in turn (TitleReel, user 2026-11-19), the name as a drawn
// logo and ONE gold key to enter — Start, or Continue when there is a save. Options, the music and the way out are
// three signs beside it. Everything above the strip stays transparent (the desktop shows through under Tauri). On
// mount it sets up the desktop overlay (Tauri) and kicks off the looping music; when the game takes over, App keeps
// it mounted on top and `exiting` fades it away over the live strip.

export function TitleScreen({
  hasSave,
  onStart,
  exiting = false,
}: {
  hasSave: boolean;
  onStart: () => void;
  exiting?: boolean;
}): React.JSX.Element {
  const t = useT();
  // The strip's scale: the UI baseline times the player's whole-pixel game scale, like the HUD and the strip.
  const zoom = useStore((s) => s.uiScale * s.gameScale);
  const music = useMusic();
  const summary = useSaveSummary(hasSave);
  const [cog, setCog] = useState<HTMLElement | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  useEffect(() => {
    void setupTitleWindow();
    initTitleMusic();
    armGestureUnlock();
  }, []);

  const press = (action: () => void) => (): void => {
    playClick();
    action();
  };

  return (
    // Full window: transparent and non-interactive, so everything but the strip clicks through to the desktop.
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div
        className={exiting ? 'tk-ts-wrap out' : 'tk-ts-wrap'}
        style={{ pointerEvents: exiting ? 'none' : 'auto' }}
      >
        <KitRoot zoom={zoom} data-interactive="true">
          <div className="tk-ts">
            <TitleReel />
            <Sign name="title_logo" alt="Taskbar Legion" className="logo" />

            <div className="tk-ts-menu">
              <span ref={setCog}>
                <Key
                  sign="opt_gear"
                  label={t('options.settings')}
                  onClick={press(() => setOptionsOpen((open) => !open))}
                  tip={optionsOpen ? undefined : <TipTag side="above">{t('options.settings')}</TipTag>}
                />
              </span>
              {music.available && (
                <Key
                  sign={music.muted ? 'opt_mute' : 'opt_sound'}
                  label={music.muted ? t('title.unmute') : t('title.mute')}
                  onClick={() => toggleMute()}
                  tip={<TipTag side="above">{music.muted ? t('title.unmute') : t('title.mute')}</TipTag>}
                />
              )}
              <Key
                sign="opt_quit"
                label={t('title.quit')}
                onClick={press(() => void quitGame())}
                tip={<TipTag side="above">{t('title.quit')}</TipTag>}
              />
              <button
                type="button"
                className={summary !== null ? 'tk-ts-play has' : 'tk-ts-play'}
                onClick={press(onStart)}
              >
                <Sign name="title_play" />
                {hasSave ? t('title.continue') : t('title.start')}
                {summary !== null && (
                  <Tip side="above-end">
                    <TipTitle>{t('title.yourGame')}</TipTitle>
                    <TipLine
                      label={difficultyName(difficultyOf(summary.globalStage).key)}
                      value={`${worldInDifficulty(summary.globalStage)}-${stageInWorldOf(summary.globalStage)}`}
                    />
                    <div className="tk-ts-party">
                      {summary.heroes.map((h, i) => (
                        <span key={i} style={{ display: 'contents' }}>
                          <Sign name={classCrestStem(h.classKey) ?? 'ui_all'} />
                          {h.level}
                        </span>
                      ))}
                    </div>
                  </Tip>
                )}
              </button>
            </div>
          </div>
          {optionsOpen && !exiting && (
            <OptionsAnchor anchor={cog} zoom={zoom}>
              <OptionsWindow onClose={() => setOptionsOpen(false)} />
            </OptionsAnchor>
          )}
        </KitRoot>
      </div>
    </div>
  );
}

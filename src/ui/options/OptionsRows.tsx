import { useStore } from '@/state/store';
import { displayPixelRatio, displayViewportHeight } from '@/state/slices/uiSlice';
import { gameScaleStops, screenPixelsPerArtPixel } from '@/state/pixelScale';
import { toggleMute } from '@/platform/audio';
import { LANGS, LANG_NAMES, setLanguage, useLanguage, useT } from '@/i18n';
import { Sign, Tip, TipText, TipTitle } from '@/ui/kit';
import { useMusic } from './useMusic';

// The settings themselves, one row each: its sign, then its control. Language; the game's size (the whole-pixel
// stops this display allows — state/pixelScale); and the one sound setting the game has today, the title music.

export function OptionsRows(): React.JSX.Element {
  const t = useT();
  const language = useLanguage();
  const gameScale = useStore((s) => s.gameScale);
  const setGameScale = useStore((s) => s.setGameScale);
  const music = useMusic();
  const dpr = displayPixelRatio();
  const stops = gameScaleStops(dpr, displayViewportHeight());

  return (
    <div className="tk-opt-rows">
      <div className="tk-opt-row has">
        <Sign name="opt_lang" alt={t('options.language')} />
        <div className="tk-opt-seg names">
          {LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              className={lang === language ? 'on' : undefined}
              aria-pressed={lang === language}
              onClick={() => setLanguage(lang)}
            >
              {LANG_NAMES[lang]}
            </button>
          ))}
        </div>
        <Tip side="left">
          <TipTitle>{t('options.language')}</TipTitle>
          <TipText>{t('options.languageHelp')}</TipText>
        </Tip>
      </div>

      <div className="tk-opt-row has">
        <Sign name="opt_game_scale" alt={t('options.gameScale')} />
        <div className="tk-opt-seg">
          {stops.map((stop) => {
            const on = Math.abs(stop - gameScale) < 0.001;
            return (
              <button
                key={stop}
                type="button"
                className={on ? 'on' : undefined}
                aria-pressed={on}
                onClick={() => setGameScale(stop)}
              >
                ×{Math.round(screenPixelsPerArtPixel(stop, dpr))}
              </button>
            );
          })}
        </div>
        <Tip side="left">
          <TipTitle>{t('options.gameScale')}</TipTitle>
          <TipText>{t('options.gameScaleHelp')}</TipText>
        </Tip>
      </div>

      {music.available && (
        <div className="tk-opt-row has">
          <Sign name={music.muted ? 'opt_mute' : 'opt_sound'} alt={t('options.music')} />
          <div>
            <button
              type="button"
              role="switch"
              aria-checked={!music.muted}
              aria-label={t('options.music')}
              className="tk-opt-switch"
              onClick={() => toggleMute()}
            >
              <Sign name={music.muted ? 'opt_switch_off' : 'opt_switch_on'} />
            </button>
          </div>
          <Tip side="left">
            <TipTitle>{t('options.music')}</TipTitle>
            <TipText>{t('options.musicHelp')}</TipText>
          </Tip>
        </div>
      )}
    </div>
  );
}

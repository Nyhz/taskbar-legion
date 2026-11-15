import { useStore } from '@/state/store';
import { displayPixelRatio, displayViewportHeight } from '@/state/slices/uiSlice';
import { gameScaleStops, screenPixelsPerArtPixel } from '@/state/pixelScale';
import { toggleMute } from '@/platform/audio';
import { LANGS, LANG_NAMES, setLanguage, useLanguage, useT } from '@/i18n';
import { Segment, Sign, Switch, Tip, TipText, TipTitle } from '@/ui/kit';
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
        <Segment
          names
          items={LANGS.map((lang) => ({ key: lang, label: LANG_NAMES[lang], on: lang === language, onPick: () => setLanguage(lang) }))}
        />
        <Tip side="left">
          <TipTitle>{t('options.language')}</TipTitle>
          <TipText>{t('options.languageHelp')}</TipText>
        </Tip>
      </div>

      <div className="tk-opt-row has">
        <Sign name="opt_game_scale" alt={t('options.gameScale')} />
        <Segment
          items={stops.map((stop) => ({
            key: stop,
            label: <>×{Math.round(screenPixelsPerArtPixel(stop, dpr))}</>,
            on: Math.abs(stop - gameScale) < 0.001,
            onPick: () => setGameScale(stop),
          }))}
        />
        <Tip side="left">
          <TipTitle>{t('options.gameScale')}</TipTitle>
          <TipText>{t('options.gameScaleHelp')}</TipText>
        </Tip>
      </div>

      {music.available && (
        <div className="tk-opt-row has">
          <Sign name={music.muted ? 'opt_mute' : 'opt_sound'} alt={t('options.music')} />
          <div>
            <Switch on={!music.muted} onChange={() => toggleMute()} label={t('options.music')} />
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

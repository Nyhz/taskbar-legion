import { useEffect, useState } from 'react';
import { setSoundPrefs, soundPrefs, subscribeSound } from '@/audio/soundEngine';
import type { CombatSounds, SoundChannel } from '@/audio/soundPrefs';
import { useT, type TextKey } from '@/i18n';
import { Segment, Sign, Switch, Tip, TipText, TipTitle } from '@/ui/kit';

// The game's sound in the options: on or off, a volume per channel (five stops) and when the sounds of every blow
// play (audio/soundRules). Device-local settings (audio/soundPrefs), like the rest of the options.

const STOPS = [0, 0.25, 0.5, 0.75, 1] as const;

const CHANNEL_ROWS: { ch: SoundChannel; sign: string; name: TextKey; help: TextKey }[] = [
  { ch: 'sfx', sign: 'opt_effects', name: 'options.effects', help: 'options.effectsHelp' },
  { ch: 'ui', sign: 'opt_click', name: 'options.interface', help: 'options.interfaceHelp' },
  { ch: 'ambient', sign: 'opt_ambience', name: 'options.ambience', help: 'options.ambienceHelp' },
];

const COMBAT: { key: CombatSounds; name: TextKey }[] = [
  { key: 'attention', name: 'options.combatWatching' },
  { key: 'always', name: 'options.combatAlways' },
  { key: 'off', name: 'options.combatNever' },
];

/** The stop nearest a stored volume. */
const nearest = (v: number): number => STOPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), STOPS[0]);

function useSoundPrefs(): ReturnType<typeof soundPrefs> {
  const [, force] = useState(0);
  useEffect(() => subscribeSound(() => force((n) => n + 1)), []);
  return soundPrefs();
}

export function SoundRows(): React.JSX.Element {
  const t = useT();
  const prefs = useSoundPrefs();

  return (
    <>
      <div className="tk-opt-row has">
        <Sign name={prefs.muted ? 'opt_mute' : 'opt_sound'} alt={t('options.sound')} />
        <div>
          <Switch on={!prefs.muted} onChange={(on) => setSoundPrefs({ muted: !on })} label={t('options.sound')} />
        </div>
        <Tip side="left">
          <TipTitle>{t('options.sound')}</TipTitle>
          <TipText>{t('options.soundHelp')}</TipText>
        </Tip>
      </div>
      {CHANNEL_ROWS.map((row) => (
        <div key={row.ch} className="tk-opt-row has">
          <Sign name={row.sign} alt={t(row.name)} />
          <Segment
            items={STOPS.map((stop) => ({
              key: stop,
              label: <>{Math.round(stop * 100)}</>,
              on: nearest(prefs[row.ch]) === stop,
              onPick: () => setSoundPrefs({ [row.ch]: stop }),
            }))}
          />
          <Tip side="left">
            <TipTitle>{t(row.name)}</TipTitle>
            <TipText>{t(row.help)}</TipText>
          </Tip>
        </div>
      ))}
      <div className="tk-opt-row has">
        <Sign name="opt_watch" alt={t('options.combatSounds')} />
        <Segment items={COMBAT.map((c) => ({ key: c.key, label: t(c.name), on: prefs.combat === c.key, onPick: () => setSoundPrefs({ combat: c.key }) }))} />
        <Tip side="left">
          <TipTitle>{t('options.combatSounds')}</TipTitle>
          <TipText>{t('options.combatSoundsHelp')}</TipText>
        </Tip>
      </div>
    </>
  );
}

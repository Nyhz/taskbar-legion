import { useState } from 'react';
import { useStore } from '@/state/store';
import { importSave, resetGame } from '@/persistence/saveManager';
import { isTauri } from '@/platform/tauri';
import { quitGame } from '@/platform/quit';
import { useT } from '@/i18n';
import { Head, Key, Rule, TipTag, Tip, TipText, TipTitle, Title, Window } from '@/ui/kit';
import { version } from '../../../package.json';
import { OptionsRows } from './OptionsRows';
import { OptionsAsk } from './OptionsAsk';
import { useBackup } from './useBackup';
import './options.css';

// The options: a small window of its own, opened from the cog on the HUD rail or on the title screen (it does not
// need the hero window). Rows of sign + control, then the keys of the save — export, import, new game — and the
// way out of the desktop app. Anything that cannot be undone asks first, in place of the rows.

/** Width of the content in art pixels: the same six cells as a side panel. */
const CONTENT_ART = 154;

type Ask = { kind: 'newGame' } | { kind: 'import'; text: string } | { kind: 'quit' };

export function OptionsWindow({ onClose }: { onClose: () => void }): React.JSX.Element {
  const t = useT();
  // On the title screen the game is not loaded into the store yet: an export would write an empty game.
  const inGame = useStore((s) => s.screen === 'game');
  const [ask, setAsk] = useState<Ask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const backup = useBackup(setError, (text) => setAsk({ kind: 'import', text }));

  const confirmImport = (text: string): void => {
    setAsk(null);
    void importSave(text).then((err) => {
      if (err !== null) setError(t('options.importFailed', { message: err })); // null ⇒ it reloads
    });
  };

  return (
    <Window id="options" closeLabel={t('options.close')} onClose={onClose} width={CONTENT_ART}>
      {ask?.kind === 'newGame' && (
        <OptionsAsk
          title={t('options.newGameAsk')}
          text={t('options.newGameConfirm')}
          back={t('options.back')}
          confirm={t('options.newGameDo')}
          confirmSign="opt_new"
          danger
          onBack={() => setAsk(null)}
          onConfirm={() => void resetGame()}
        />
      )}
      {ask?.kind === 'import' && (
        <OptionsAsk
          title={t('options.importAsk')}
          text={t('options.importConfirm')}
          back={t('options.back')}
          confirm={t('options.importDo')}
          confirmSign="opt_import"
          onBack={() => setAsk(null)}
          onConfirm={() => confirmImport(ask.text)}
        />
      )}
      {ask?.kind === 'quit' && (
        <OptionsAsk
          title={t('options.quitAsk')}
          text={t('options.quitConfirm')}
          back={t('options.back')}
          confirm={t('options.quitDo')}
          confirmSign="opt_quit"
          danger
          onBack={() => setAsk(null)}
          onConfirm={() => void quitGame()}
        />
      )}
      {ask === null && (
        <>
          <Head>
            <Title>{t('options.title')}</Title>
            <span className="note">v{version}</span>
          </Head>
          <OptionsRows />
          <Rule />
          <div className="tk-opt-foot">
            {inGame && (
              <Key
                sign="opt_export"
                label={t('options.exportSave')}
                onClick={() => {
                  setError(null);
                  backup.exportNow();
                }}
                tip={
                  <Tip side="above">
                    <TipTitle>{t('options.exportSave')}</TipTitle>
                    <TipText>{t('options.exportHelp')}</TipText>
                  </Tip>
                }
              />
            )}
            <Key
              sign="opt_import"
              label={t('options.importSave')}
              onClick={() => {
                setError(null);
                backup.pickImport();
              }}
              tip={
                <Tip side="above">
                  <TipTitle>{t('options.importSave')}</TipTitle>
                  <TipText>{t('options.importHelp')}</TipText>
                </Tip>
              }
            />
            <Key
              sign="opt_new"
              tone="danger"
              className="gap"
              label={t('options.newGame')}
              onClick={() => setAsk({ kind: 'newGame' })}
              tip={
                <Tip side="above">
                  <TipTitle>{t('options.newGame')}</TipTitle>
                  <TipText>{t('options.newGameHelp')}</TipText>
                </Tip>
              }
            />
            {isTauri() && (
              <Key
                sign="opt_quit"
                className="last"
                label={t('options.quit')}
                onClick={() => setAsk({ kind: 'quit' })}
                tip={<TipTag side="above-end">{t('options.quit')}</TipTag>}
              />
            )}
          </div>
          {error !== null && <div className="tk-opt-err">{error}</div>}
          <input
            ref={backup.fileRef}
            type="file"
            accept="application/json,.json"
            onChange={backup.onFile}
            style={{ display: 'none' }}
          />
        </>
      )}
    </Window>
  );
}

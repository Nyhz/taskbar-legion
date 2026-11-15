import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Key, Tip, TipText, TipTitle } from '@/ui/kit';

// A persistent warning shown while a save WRITE has failed (saveManager.saveFailed). A silent persist failure —
// like the macOS app-data dir never being created — could lose hours of progress without the player noticing:
// this crimson key sits on the strip's top-left corner and blinks until saving works again. It does nothing
// when pressed; its tooltip says what is wrong.

export function SaveErrorBadge(): React.JSX.Element | null {
  const t = useT();
  const saveFailed = useStore((s) => s.saveFailed);
  if (!saveFailed) return null;
  return (
    <div className="tk-save" role="alert" data-interactive="true">
      <Key
        sign="opt_export"
        tone="danger"
        label={t('overlay.saveFailedTitle')}
        tip={
          <Tip side="below">
            <TipTitle>{t('overlay.saveFailedTitle')}</TipTitle>
            <TipText>{t('overlay.saveFailedHelp')}</TipText>
          </Tip>
        }
      >
        {t('overlay.saveFailed')}
      </Key>
    </div>
  );
}

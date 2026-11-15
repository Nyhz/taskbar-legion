import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Sign, Tip, TipText, TipTitle } from '@/ui/kit';

// Bottom-right sign on the strip. When ON, a wipe keeps the party on its current stage (it re-attempts it)
// instead of retreating one — see Simulation.handleWipe.

export function RetryKey(): React.JSX.Element {
  const t = useT();
  const active = useStore((s) => s.retryStage);
  const setRetryStage = useStore((s) => s.setRetryStage);
  return (
    <button
      type="button"
      data-interactive="true"
      className={`tk-corner has${active ? ' on' : ''}`}
      aria-label={active ? t('hud.retryOn') : t('hud.retryOff')}
      aria-pressed={active}
      onPointerDown={(e) => e.stopPropagation()} // a press here must not start dragging the strip
      onClick={() => setRetryStage(!active)}
    >
      <Sign name="hud_retry" />
      <Tip>
        <TipTitle>{active ? t('hud.retryOn') : t('hud.retryOff')}</TipTitle>
        <TipText>{active ? t('hud.retryOnHelp') : t('hud.retryOffHelp')}</TipText>
      </Tip>
    </button>
  );
}

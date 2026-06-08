import { useStore } from '@/state/store';
import { PALETTE } from '@/styles/palette';

// A small, persistent warning shown when a save WRITE has failed (saveManager.saveFailed).
// A silent persist failure — like the macOS app-data dir never being created — could lose
// hours of progress without the player noticing; this makes it impossible to miss.

export function SaveErrorBadge(): React.JSX.Element | null {
  const saveFailed = useStore((s) => s.saveFailed);
  if (!saveFailed) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        background: PALETTE.titleRed,
        border: `1px solid ${PALETTE.titleRedHi}`,
        color: PALETTE.textLight,
        font: '700 10px monospace',
        letterSpacing: 0.3,
        padding: '3px 8px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
        boxShadow: `0 1px 0 ${PALETTE.ink}`,
        pointerEvents: 'none',
      }}
    >
      ⚠ Progress isn&apos;t saving — see the developer
    </div>
  );
}

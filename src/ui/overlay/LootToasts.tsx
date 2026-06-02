import { useEffect } from 'react';
import { useStore } from '@/state/store';
import type { LootToast } from '@/state/slices/lootToastSlice';

// Floating loot text over the strip — one per item pulled from a chest. Tinted to
// the item's tier color and tagged with its gear slot in parens. Toasts are stacked
// in a bottom-anchored column: each new one appears at the bottom and pushes the
// older ones up (a rising ticker), so they NEVER overlap no matter the size/cadence.
// Each toast self-removes once its fade finishes.

const LIFETIME_MS = 2600;
const FONT_SIZE = 22;

export function LootToasts(): React.JSX.Element {
  const toasts = useStore((s) => s.lootToasts);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        // Anchor just above the strip (100% = strip top; +30px clears the HUD row),
        // so the stack rises into the dark area over the strip, never over the HUD.
        bottom: 'calc(100% + 30px)',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column', // oldest (first) on top, newest (last) at bottom
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function Toast({ toast }: { toast: LootToast }): React.JSX.Element {
  const removeLootToast = useStore((s) => s.removeLootToast);
  useEffect(() => {
    const handle = window.setTimeout(() => removeLootToast(toast.id), LIFETIME_MS);
    return () => window.clearTimeout(handle);
  }, [toast.id, removeLootToast]);

  return (
    <span
      className="tl-loot-toast"
      style={{
        animationDuration: `${LIFETIME_MS}ms`,
        color: toast.color,
        fontFamily: 'monospace',
        fontSize: FONT_SIZE,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        textShadow: '0 2px 0 #0d0b12, 0 0 6px #0d0b12',
      }}
    >
      {toast.text}
    </span>
  );
}

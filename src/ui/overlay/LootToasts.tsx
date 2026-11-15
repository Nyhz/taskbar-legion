import { useEffect } from 'react';
import { useStore } from '@/state/store';
import type { LootToast } from '@/state/slices/lootToastSlice';
import { ItemIcon, KitRoot, Sign } from '@/ui/kit';
import { decodeLootLine } from '@/ui/loot/lootLine';
import './overlay.css';

// Floating loot lines over the strip — one per entry pulled from a chest: the piece in its rarity frame and what
// it is, lettered in the rarity's colour. Lines are stacked in a bottom-anchored column: each new one appears at
// the bottom and pushes the older ones up (a rising ticker), so they NEVER overlap no matter the size / cadence.
// Each line removes itself once its fade finishes. Drawn with the kit at the strip's own scale.

const LIFETIME_MS = 2600;

export function LootToasts(): React.JSX.Element {
  const toasts = useStore((s) => s.lootToasts);
  const zoom = useStore((s) => s.uiScale * s.gameScale);
  return (
    // Anchored to the bottom of the panel zone (just above the strip / HUD) so the stack rises into the area over
    // the strip. Its z-index lifts it ABOVE the open panels, so an open menu can't hide the loot.
    <div className="tk-loot-zone">
      <KitRoot zoom={zoom} className="tk-loot">
        {toasts.map((toast) => (
          <Line key={toast.id} toast={toast} />
        ))}
      </KitRoot>
    </div>
  );
}

function Line({ toast }: { toast: LootToast }): React.JSX.Element {
  const removeLootToast = useStore((s) => s.removeLootToast);
  useEffect(() => {
    const handle = window.setTimeout(() => removeLootToast(toast.id), LIFETIME_MS);
    return () => window.clearTimeout(handle);
  }, [toast.id, removeLootToast]);

  const line = decodeLootLine(toast.text);
  return (
    <div
      className="tk-loot-line tl-loot-toast"
      style={{ animationDuration: `${LIFETIME_MS}ms`, color: toast.color }}
    >
      {line.art !== undefined && <ItemIcon tier={line.tier ?? 0} art={line.art} />}
      {line.art === undefined && line.sign !== undefined && <Sign name={line.sign} />}
      <span className="nm tk-ink">{line.text}</span>
      {Array.from({ length: line.stars ?? 0 }, (_, i) => (
        <Sign key={i} name="mark_star" />
      ))}
    </div>
  );
}

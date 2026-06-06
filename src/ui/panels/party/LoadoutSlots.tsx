import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/state/store';
import { useContextMenu } from '@/ui/components/ContextMenu';
import { LOADOUT_COUNT, LOADOUT_LABELS } from '@/state/slices/partySlice';
import { LoadoutTooltip, LOADOUT_TIP_W } from './LoadoutTooltip';
import { PALETTE } from '@/styles/palette';

// Two gear+talent presets per hero (Farm / Boss), shown to the RIGHT of the active abilities.
// Left-click a saved slot to restore that equipment + talent set; right-click to save the
// current setup into it (or clear it). Saving stores item IDs, so restoring re-equips whatever
// of the saved gear is still around (inventory/stash/own) and skips anything sold or worn elsewhere.
// Hovering shows a rich LoadoutTooltip (portaled to <body>, since the native title attr doesn't
// render in the Tauri overlay webview).

const TIP_H = 240;

export function LoadoutSlots({ heroId }: { heroId: string }): React.JSX.Element {
  const loadouts = useStore((s) => s.roster.find((h) => h.id === heroId)?.loadouts);
  const saveLoadout = useStore((s) => s.saveLoadout);
  const applyLoadout = useStore((s) => s.applyLoadout);
  const clearLoadout = useStore((s) => s.clearLoadout);
  const openMenu = useContextMenu();
  const [tip, setTip] = useState<{ index: number; left: number; top: number } | null>(null);

  // Open the card to the RIGHT of the slot, clamped on-screen (matches the item tooltip).
  const showTip = (index: number, e: React.MouseEvent): void => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({
      index,
      left: Math.max(4, Math.min(r.right + 6, window.innerWidth - LOADOUT_TIP_W - 4)),
      top: Math.max(4, Math.min(window.innerHeight - TIP_H, r.top - 2)),
    });
  };

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {Array.from({ length: LOADOUT_COUNT }, (_, i) => {
        const saved = (loadouts?.[i] ?? null) !== null;
        return (
          <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute', top: -13, left: -4, right: -4, textAlign: 'center',
                fontSize: 8, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                color: saved ? PALETTE.gold : PALETTE.textMute, pointerEvents: 'none',
              }}
            >
              {LOADOUT_LABELS[i]}
            </span>
            <div
              onMouseEnter={(e) => showTip(i, e)}
              onMouseLeave={() => setTip(null)}
              onClick={() => { setTip(null); if (saved) applyLoadout(heroId, i); }}
              onContextMenu={(e) => {
                e.preventDefault();
                setTip(null);
                openMenu(e.clientX, e.clientY, [
                  { label: 'Save current loadout', icon: '💾', onClick: () => saveLoadout(heroId, i) },
                  ...(saved ? [{ label: 'Clear loadout', icon: '🗑️', danger: true, onClick: () => clearLoadout(heroId, i) }] : []),
                ]);
              }}
              style={{
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15,
                background: saved ? 'radial-gradient(circle at 38% 32%, #34304a 0%, #1b1726 80%)' : PALETTE.bgInset,
                border: saved ? `2px solid ${PALETTE.gold}` : `2px dashed ${PALETTE.goldDim}`,
                boxShadow: saved ? `0 0 6px ${PALETTE.gold}` : 'none',
                color: saved ? PALETTE.textLight : PALETTE.goldDim,
                cursor: saved ? 'pointer' : 'default',
              }}
            >
              {saved ? '⚔️' : '＋'}
            </div>
          </div>
        );
      })}
      {tip !== null &&
        createPortal(
          <div style={{ position: 'fixed', left: tip.left, top: tip.top, zIndex: 9999, pointerEvents: 'none' }}>
            <LoadoutTooltip heroId={heroId} index={tip.index} />
          </div>,
          document.body,
        )}
    </div>
  );
}

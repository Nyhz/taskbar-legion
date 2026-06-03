import { useStore } from '@/state/store';
import type { GemInstance } from '@/data/gems';
import { GEMS } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { SLOTS, type SlotKey } from '@/data/itemSlots';
import { tierName } from '@/ui/tierStyle';
import { STAT_ICON } from '@/ui/icons';
import { StatRow } from './StatRow';
import { PALETTE } from '@/styles/palette';

// Confirmation for socketing a gem — raised by a paper-doll drop or a gem's right-click
// menu. Shows exactly what the gem grants in THIS item's category and warns that
// socketing binds the item permanently (SPEC §12.4). Commit or cancel.

export interface PendingSocket {
  gem: GemInstance;
  heroId: string;
  slot: SlotKey;
  socketIdx: number;
}

export function SocketConfirmModal({ pending, onClose }: { pending: PendingSocket; onClose: () => void }): React.JSX.Element | null {
  const socketGem = useStore((s) => s.socketGem);
  const item = useStore((s) => s.roster.find((h) => h.id === pending.heroId)?.equipment[pending.slot]);
  if (item === undefined) return null; // target vanished (unequipped mid-flow)

  const def = GEMS[pending.gem.key];
  const grants = gemGrants(pending.gem);
  const confirm = (): void => {
    socketGem(pending.heroId, pending.slot, pending.socketIdx, pending.gem.id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', zIndex: 10002,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 240, background: PALETTE.bgPanel, border: `2px solid ${def.color}`, boxShadow: `0 0 0 1px ${PALETTE.ink}, 4px 4px 0 rgba(0,0,0,0.6)`, padding: 12, color: PALETTE.textLight }}
      >
        <div style={{ fontWeight: 700, color: PALETTE.gold, letterSpacing: 0.5, marginBottom: 8 }}>SOCKET GEM</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: def.color, border: `2px solid ${PALETTE.ink}`, boxShadow: `0 0 6px ${def.color}` }} />
          <div style={{ fontSize: 11 }}>
            <span style={{ color: def.color, fontWeight: 700 }}>{def.name} T{pending.gem.tier}</span>
            <span style={{ color: PALETTE.textMute }}> → {SLOTS[pending.slot].label}</span>
          </div>
        </div>

        <div style={{ color: PALETTE.textMute, fontSize: 10, marginBottom: 2 }}>
          Grants on this {tierName(item.tier)} {item.category}:
        </div>
        {grants.map((g) => (
          <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{STAT_ICON[g.key]}</span>
            <div style={{ flex: 1 }}><StatRow statKey={g.key} value={g.value} /></div>
          </div>
        ))}

        <div style={{ color: PALETTE.enemyAccent, fontSize: 10, margin: '8px 0 2px' }}>
          ⚠ Socketing binds this item permanently — it can no longer be traded, and the gem cannot be removed.
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 6, background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: PALETTE.textLight }}>
            Cancel
          </button>
          <button onClick={confirm} style={{ flex: 1, padding: 6, background: PALETTE.titleRed, border: `1px solid ${PALETTE.ink}`, color: PALETTE.textLight, fontWeight: 700 }}>
            Socket
          </button>
        </div>
      </div>
    </div>
  );
}

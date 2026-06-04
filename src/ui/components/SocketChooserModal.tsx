import { useStore } from '@/state/store';
import type { GemInstance } from '@/data/gems';
import { GEMS } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { SLOTS, type SlotKey } from '@/data/itemSlots';
import { tierName } from '@/ui/tierStyle';
import { STAT_ICON } from '@/ui/icons';
import { ItemSlot } from './ItemSlot';
import { StatRow } from './StatRow';
import { PALETTE } from '@/styles/palette';

// Socket CHOOSER — raised when a gem is dropped onto an item that already has a socketed
// gem. Shows one square per socket: an EMPTY one offers "Socket", a FILLED one shows its
// current gem + "Swap" (which DESTROYS that gem and sockets the dragged one in its place).
// Lets the player pick exactly which socket the new gem goes into. WoW-style swap.

export interface PendingChoice {
  gem: GemInstance;
  heroId: string;
  slot: SlotKey;
}

export function SocketChooserModal({ pending, onClose }: { pending: PendingChoice; onClose: () => void }): React.JSX.Element | null {
  const socketGem = useStore((s) => s.socketGem);
  const item = useStore((s) => s.roster.find((h) => h.id === pending.heroId)?.equipment[pending.slot]);
  if (item === undefined) return null; // target vanished (unequipped mid-flow)

  const def = GEMS[pending.gem.key];
  const grants = gemGrants(pending.gem);
  const choose = (socketIdx: number): void => {
    socketGem(pending.heroId, pending.slot, socketIdx, pending.gem.id);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', zIndex: 10002 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 264, background: PALETTE.bgPanel, border: `2px solid ${def.color}`, boxShadow: `0 0 0 1px ${PALETTE.ink}, 4px 4px 0 rgba(0,0,0,0.6)`, padding: 12, color: PALETTE.textLight }}
      >
        <div style={{ fontWeight: 700, color: PALETTE.gold, letterSpacing: 0.5, marginBottom: 8 }}>CHOOSE A SOCKET</div>

        {/* the dragged gem + what it grants on this item */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
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

        {/* one square per socket — empty: Socket; filled: shows its gem + Swap */}
        <div style={{ color: PALETTE.textMute, fontSize: 10, margin: '8px 0 4px' }}>Pick a socket:</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {item.sockets.map((so, idx) => {
            const filled = so.gem !== null;
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <ItemSlot item={null} gem={so.gem ?? undefined} size={40} label="·" />
                <button
                  onClick={() => choose(idx)}
                  style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer',
                    background: filled ? PALETTE.titleRed : PALETTE.bgInset,
                    border: `1px solid ${filled ? PALETTE.gold : PALETTE.ink}`,
                    color: filled ? PALETTE.gold : PALETTE.textLight,
                  }}
                >
                  {filled ? 'Swap' : 'Socket'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ color: PALETTE.enemyAccent, fontSize: 10, margin: '8px 0 2px' }}>
          ⚠ The dragged gem is consumed. Swapping also destroys the gem already in that socket — both are permanent.
        </div>

        <div style={{ display: 'flex', marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 6, background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: PALETTE.textLight }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

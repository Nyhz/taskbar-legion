import { useStore } from '@/state/store';
import type { GemInstance } from '@/data/gems';
import type { SlotKey } from '@/data/itemSlots';
import { gemName, useT } from '@/i18n';
import { Check, ItemIcon, Key, Sign, Slot } from '@/ui/kit';
import { gemArtStem, itemArtStem } from '@/ui/itemArt';
import { GemGrants, SocketDialog } from '@/ui/panels/items/SocketDialog';
import { itemKindName } from '@/ui/panels/items/itemText';

// Confirmation for socketing a gem — raised by a paper-doll drop or a gem's right-click menu. Shows the gem, the
// piece it goes into and exactly what it grants, and warns that the gem stays in the piece for good. Commit or
// go back; a checkbox suppresses the question from then on. (Drawn with the kit; same props as ever.)

export interface PendingSocket {
  gem: GemInstance;
  heroId: string;
  slot: SlotKey;
  socketIdx: number;
}

export function SocketConfirmModal({
  pending,
  onClose,
}: {
  pending: PendingSocket;
  onClose: () => void;
}): React.JSX.Element | null {
  const t = useT();
  const socketGem = useStore((s) => s.socketGem);
  const hideWarning = useStore((s) => s.hideSocketWarning);
  const setHideSocketWarning = useStore((s) => s.setHideSocketWarning);
  const item = useStore((s) => s.roster.find((h) => h.id === pending.heroId)?.equipment[pending.slot]);
  if (item === undefined) return null; // target vanished (unequipped mid-flow)

  const confirm = (): void => {
    socketGem(pending.heroId, pending.slot, pending.socketIdx, pending.gem.id);
    onClose();
  };

  return (
    <SocketDialog id="dialog-socket-confirm" title={t('items.socketTitle')} width={150} onClose={onClose}>
      <div className="tk-socket-pair">
        <Slot
          icon={
            <ItemIcon tier={pending.gem.tier} art={gemArtStem(pending.gem)} alt={gemName(pending.gem.key)} />
          }
          interactive={false}
        />
        <Sign name="cube_arrow" />
        <Slot
          icon={<ItemIcon tier={item.tier} art={itemArtStem(item)} alt={itemKindName(item)} />}
          interactive={false}
        />
      </div>
      <GemGrants gem={pending.gem} />
      <p className="tk-socket-warn">{t('items.socketWarn')}</p>
      <div style={{ marginTop: 5 }}>
        <Check checked={hideWarning} onChange={setHideSocketWarning}>
          {t('items.socketDontAsk')}
        </Check>
      </div>
      <div className="tk-socket-keys">
        <Key onClick={onClose}>{t('items.back')}</Key>
        <Key tone="gold" className="end" onClick={confirm}>
          {t('items.socketDo')}
        </Key>
      </div>
    </SocketDialog>
  );
}

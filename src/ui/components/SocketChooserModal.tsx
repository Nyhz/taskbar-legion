import { useStore } from '@/state/store';
import type { GemInstance } from '@/data/gems';
import type { SlotKey } from '@/data/itemSlots';
import { gemName, useT } from '@/i18n';
import { ItemIcon, Key, Slot } from '@/ui/kit';
import { gemArtStem } from '@/ui/itemArt';
import { GemGrants, SocketDialog } from '@/ui/panels/items/SocketDialog';

// Socket CHOOSER — raised when a gem is dropped onto a piece that already holds a gem. One cell per socket: an
// EMPTY one offers "Socket", a FILLED one shows its gem and offers "Swap" (which DESTROYS that gem and sets the
// dragged one in its place). Lets the player pick exactly which socket the new gem goes into. (Drawn with the
// kit; same props as ever.)

const PICK_WIDTH = 56; // art px a socket's cell + key needs, so up to four sit on one row

export interface PendingChoice {
  gem: GemInstance;
  heroId: string;
  slot: SlotKey;
}

export function SocketChooserModal({
  pending,
  onClose,
}: {
  pending: PendingChoice;
  onClose: () => void;
}): React.JSX.Element | null {
  const t = useT();
  const socketGem = useStore((s) => s.socketGem);
  const item = useStore((s) => s.roster.find((h) => h.id === pending.heroId)?.equipment[pending.slot]);
  if (item === undefined) return null; // target vanished (unequipped mid-flow)

  const choose = (socketIdx: number): void => {
    socketGem(pending.heroId, pending.slot, socketIdx, pending.gem.id);
    onClose();
  };
  const anyFilled = item.sockets.some((so) => so.gem !== null);

  return (
    <SocketDialog
      id="dialog-socket-chooser"
      title={t('items.chooserTitle')}
      width={Math.max(166, item.sockets.length * PICK_WIDTH)}
      onClose={onClose}
    >
      <p className="tk-socket-text">{t('items.chooserText', { gem: gemName(pending.gem.key) })}</p>
      <div style={{ marginTop: 4 }}>
        <GemGrants gem={pending.gem} />
      </div>
      <div className="tk-socket-picks">
        {item.sockets.map((so, idx) => (
          <div key={idx} className="tk-socket-pick">
            <Slot
              icon={
                so.gem === null ? undefined : (
                  <ItemIcon tier={so.gem.tier} art={gemArtStem(so.gem)} alt={gemName(so.gem.key)} />
                )
              }
              interactive={false}
            />
            <Key tone={so.gem === null ? 'gold' : 'danger'} onClick={() => choose(idx)}>
              {so.gem === null ? t('items.socketDo') : t('items.chooserSwap')}
            </Key>
          </div>
        ))}
      </div>
      <p className="tk-socket-warn">
        {t('items.socketWarn')}
        {anyFilled ? ` ${t('items.chooserWarn')}` : ''}
      </p>
      <div className="tk-socket-keys">
        <Key onClick={onClose}>{t('items.back')}</Key>
      </div>
    </SocketDialog>
  );
}

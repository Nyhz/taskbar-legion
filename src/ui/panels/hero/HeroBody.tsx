import { useState } from 'react';
import { useStore } from '@/state/store';
import type { SlotKey } from '@/data/itemSlots';
import type { GemInstance } from '@/data/gems';
import { SocketConfirmModal, type PendingSocket } from '@/ui/components/SocketConfirmModal';
import { SocketChooserModal, type PendingChoice } from '@/ui/components/SocketChooserModal';
import { PaperDoll } from './PaperDoll';
import { AbilityRow } from './AbilityRow';
import { Presets } from './Presets';
import { ItemLevel } from './ItemLevel';
import { Bag } from './Bag';

// The body of the hero window: the paper doll, the hero's combat kit, item level and presets under it, and the
// bag under those. It also
// owns the two socket dialogs: a gem dropped on (or sent to) a worn piece is confirmed first — or, when the piece
// already holds a gem, goes through the chooser (pick a free socket, or swap one out).

export function HeroBody({ heroId }: { heroId: string }): React.JSX.Element {
  const [pending, setPending] = useState<PendingSocket | null>(null);
  const [choice, setChoice] = useState<PendingChoice | null>(null);
  const hideSocketWarning = useStore((s) => s.hideSocketWarning);
  const socketGem = useStore((s) => s.socketGem);

  // Socket straight away once the player has dismissed the warning for good.
  const requestSocket = (gem: GemInstance, slot: SlotKey, socketIdx: number): void => {
    if (hideSocketWarning) socketGem(heroId, slot, socketIdx, gem.id);
    else setPending({ gem, heroId, slot, socketIdx });
  };
  const requestSocketChoice = (gem: GemInstance, slot: SlotKey): void => setChoice({ gem, heroId, slot });

  return (
    <>
      <PaperDoll heroId={heroId} requestSocket={requestSocket} requestSocketChoice={requestSocketChoice} />
      <div className="tk-hero-kit">
        <AbilityRow heroId={heroId} />
        <ItemLevel heroId={heroId} />
        <Presets heroId={heroId} />
      </div>
      <Bag heroId={heroId} requestSocket={requestSocket} />
      {pending !== null && <SocketConfirmModal pending={pending} onClose={() => setPending(null)} />}
      {choice !== null && <SocketChooserModal pending={choice} onClose={() => setChoice(null)} />}
    </>
  );
}

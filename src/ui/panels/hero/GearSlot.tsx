import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import type { SlotKey } from '@/data/itemSlots';
import type { GemInstance } from '@/data/gems';
import { isGem } from '@/sim/items';
import { findEntry } from '@/sim/slots';
import { slotGhostStem } from '@/ui/itemArt';
import { slotLabel, useT } from '@/i18n';
import { Slot, TipTag } from '@/ui/kit';
import { useContextMenu } from '@/ui/components/ContextMenu';
import { ItemCell } from '@/ui/panels/items/ItemCell';
import { DropZone, type DragPayload } from './drop';

// One gear slot of the paper doll. Worn piece: click or drag it out to take it off, right-click for the menu.
// A piece dragged from the bag is equipped here; a gem dragged from the bag OR the stash is socketed into the
// piece worn here — into its first free socket, or through the chooser when the piece already holds a gem.

export type SocketRequest = (gem: GemInstance, slot: SlotKey, socketIdx: number) => void;
export type ChoiceRequest = (gem: GemInstance, slot: SlotKey) => void;

export function GearSlot({
  heroId,
  slot,
  tipSide,
  requestSocket,
  requestSocketChoice,
}: {
  heroId: string;
  slot: SlotKey;
  tipSide: 'right' | 'left';
  requestSocket: SocketRequest;
  requestSocketChoice: ChoiceRequest;
}): React.JSX.Element | null {
  const t = useT();
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const equip = useStore((s) => s.equip);
  const unequip = useStore((s) => s.unequip);
  const openMenu = useContextMenu();
  const item = hero?.equipment[slot] ?? null;
  const flash = useEquipFlash(`${heroId}-${slot}`, item?.id ?? null);
  if (hero === undefined) return null;

  const onDrop = (d: DragPayload): void => {
    if (d.id === undefined) return;
    const { inventory, stash } = useStore.getState();
    const entry = findEntry(d.from === 'stash' ? stash : inventory, d.id);
    if (entry !== undefined && isGem(entry)) {
      if (item === null || item.sockets.length === 0) return; // nothing to socket into
      if (item.sockets.some((so) => so.gem !== null)) {
        requestSocketChoice(entry, slot); // already holds a gem → choose a socket or swap one out
      } else {
        const idx = item.sockets.findIndex((so) => so.gem === null);
        if (idx >= 0) requestSocket(entry, slot, idx);
      }
      return;
    }
    if (d.from === 'inv') equip(hero.id, d.id, slot); // gear is equipped from the bag only
  };

  return (
    <DropZone cell accept={(d) => d.from === 'inv' || d.from === 'stash'} onDrop={onDrop}>
      {item === null ? (
        <Slot ghost={slotGhostStem(slot, hero.classKey)}>
          <TipTag side={tipSide}>{slotLabel(slot)}</TipTag>
        </Slot>
      ) : (
        <ItemCell
          item={item}
          label={slotLabel(slot)}
          draggable
          dragData={`equip|${slot}`}
          onClick={() => unequip(hero.id, slot)}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu(e.clientX, e.clientY, [
              { label: t('hero.menuUnequip'), sign: 'bag_pack', onClick: () => unequip(hero.id, slot) },
            ]);
          }}
        />
      )}
      {flash > 0 && <span key={flash} className="tk-hero-flash" />}
    </DropZone>
  );
}

// A gold ring that flashes over the slot the moment a NEW piece lands in it, so an instant equip is visibly
// confirmed. `scope` (hero + slot) resets it, so switching hero does not flash every slot.
function useEquipFlash(scope: string, itemId: string | null): number {
  const [tick, setTick] = useState(0);
  const prev = useRef<{ scope: string; id: string | null } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = { scope, id: itemId };
    if (before === null || before.scope !== scope) return; // first mount, or another hero / slot
    if (itemId !== null && itemId !== before.id) setTick((n) => n + 1);
  }, [scope, itemId]);
  return tick;
}

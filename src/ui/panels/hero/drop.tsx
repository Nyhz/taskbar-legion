import type { ReactNode } from 'react';
import type { SlotKey } from '@/data/itemSlots';
import { useDropZone } from '@/ui/components/dnd';

// Drop zones of the hero window, on the existing drag protocol (ui/components/dnd): a drag is a payload string
// — `inv|<id>`, `stash|<id>` or `equip|<slot>` — and a zone says whether it takes it. The zone under the pointer
// lights up while it would accept what is in the hand (hero.css `.tk-hero-drop.over`).

export interface DragPayload {
  from: string;
  id?: string;
  slot?: SlotKey;
}

export function parseDrag(payload: string): DragPayload {
  const [from, rest] = payload.split('|');
  if (from === 'equip') return { from: 'equip', slot: rest as SlotKey };
  return { from: from ?? '', id: rest };
}

/** A drop zone around `children`. `cell` makes it exactly one 24×24 slot (the highlight rings the slot). */
export function DropZone({
  accept,
  onDrop,
  cell = false,
  className,
  children,
}: {
  accept: (d: DragPayload) => boolean;
  onDrop: (d: DragPayload) => void;
  cell?: boolean;
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  const { ref, over } = useDropZone(
    (p) => accept(parseDrag(p)),
    (p) => onDrop(parseDrag(p)),
  );
  const cls = `tk-hero-drop${cell ? ' cell' : ''}${over ? ' over' : ''}${className === undefined ? '' : ` ${className}`}`;
  return (
    <div ref={ref} className={cls}>
      {children}
    </div>
  );
}

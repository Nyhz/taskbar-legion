import type { ReactNode } from 'react';
import { useDragPayload, useDropZone } from '@/ui/components/dnd';

// A drop zone around ONE cell (a gear slot, an exact bag / stash position). It adds no box of its own
// (`display: contents`), so grids lay out as if it were not there, and it tells its child two things:
//   candidate — something that fits here is being dragged right now: light the cell (ItemCell `dropTarget`);
//   over      — and the pointer is on it.
// The payload protocol is that of ui/components/dnd (a string the caller parses).
//
//   <DropSlot accept={(p) => fits(p)} onDrop={(p) => equip(p)}>
//     {({ candidate }) => <ItemCell item={worn} slot="helmet" dropTarget={candidate} … />}
//   </DropSlot>

export interface DropState {
  candidate: boolean;
  over: boolean;
}

export function DropSlot({
  accept,
  onDrop,
  children,
}: {
  accept: (payload: string) => boolean;
  onDrop: (payload: string) => void;
  children: (state: DropState) => ReactNode;
}): React.JSX.Element {
  const { ref, over } = useDropZone(accept, onDrop);
  const payload = useDragPayload();
  const candidate = payload !== null && accept(payload);
  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {children({ candidate, over })}
    </div>
  );
}

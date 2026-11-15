import { useStore } from '@/state/store';
import { useDropZone } from '@/ui/components/dnd';
import { useContextMenu } from '@/ui/components/ContextMenu';
import { isGem, type InvEntry } from '@/sim/items';
import type { Slots } from '@/sim/slots';
import { useT } from '@/i18n';
import { SlotGrid } from '@/ui/kit';
import { ItemCell } from '@/ui/panels/items/ItemCell';
import { DropSlot } from '@/ui/panels/items/DropSlot';
import { STASH_COLS, type StashFilter } from './stashLayout';

// One page of the stash as a grid of cells. A piece goes to the bag with a click, a drag or its right-click
// menu (refused while the bag is full). Bag pieces dropped here land in the stash: on the exact cell in the
// unfiltered view — where the grid maps 1:1 onto the sparse stash array, later pages included — and in the first
// free slot when a filter is on (a filter is a compacted lens, so a cell's index means nothing there).

export function StashGrid({
  shown,
  filter,
  start,
  perPage,
  bagFull,
}: {
  shown: Slots; // the entries the grid pages over (the stash itself, or its lens)
  filter: StashFilter;
  start: number; // index of the page's first cell in `shown`
  perPage: number;
  bagFull: boolean;
}): React.JSX.Element {
  const t = useT();
  const heroClass = useStore((s) => s.roster.find((h) => h.id === s.selectedHeroId)?.classKey);
  const moveToInventory = useStore((s) => s.moveToInventory);
  const moveToStash = useStore((s) => s.moveToStash);
  const moveEntryToSlot = useStore((s) => s.moveEntryToSlot);
  const openMenu = useContextMenu();
  const drop = useDropZone(
    (p) => p.startsWith('inv|'),
    (p) => {
      const id = p.split('|')[1];
      if (id !== undefined) moveToStash(id);
    },
  );

  const cell = (entry: InvEntry | null, j: number, lit = false): React.JSX.Element => {
    if (entry === null) return <ItemCell key={`slot-${j}`} item={null} dropTarget={lit} />;
    const foreign =
      !isGem(entry) &&
      entry.classKey !== undefined &&
      heroClass !== undefined &&
      entry.classKey !== heroClass;
    return (
      <ItemCell
        key={`slot-${j}`}
        item={isGem(entry) ? null : entry}
        gem={isGem(entry) ? entry : undefined}
        dropTarget={lit}
        unequippable={foreign}
        wrongClass={foreign}
        draggable
        dragData={`stash|${entry.id}`}
        onClick={() => moveToInventory(entry.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY, [
            {
              label: t('stash.toBag'),
              sign: 'bag_pack',
              onClick: () => moveToInventory(entry.id),
              disabled: bagFull,
            },
          ]);
        }}
      />
    );
  };

  return (
    <div ref={drop.ref} className={`tk-stash-grid${drop.over ? ' over' : ''}`}>
      <SlotGrid cols={STASH_COLS}>
        {Array.from({ length: perPage }, (_, j) => {
          const index = start + j;
          const entry = shown[index] ?? null;
          if (filter !== 'all') return cell(entry, j);
          // The cell under the pointer lights while it would take what is in the hand.
          return (
            <DropSlot
              key={`cell-${j}`}
              accept={(p) => p.startsWith('inv|') || p.startsWith('stash|')}
              onDrop={(p) => {
                const id = p.split('|')[1];
                if (id !== undefined) moveEntryToSlot(id, 'stash', index);
              }}
            >
              {({ over }) => cell(entry, j, over)}
            </DropSlot>
          );
        })}
      </SlotGrid>
    </div>
  );
}

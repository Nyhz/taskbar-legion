import { useState } from 'react';
import { useStore } from '@/state/store';
import { ItemSlot } from '@/ui/components/ItemSlot';
import { useDropZone } from '@/ui/components/dnd';
import { useContextMenu } from '@/ui/components/ContextMenu';
import {
  stashSlotCost, stashPageCost, STASH_PER_PAGE, STASH_MAX_PAGES, STASH_MAX_SLOTS,
} from '@/data/inventory';
import { SLOTS, type SlotCategory } from '@/data/itemSlots';
import { isGem, isItem } from '@/sim/items';
import { countFilled } from '@/sim/slots';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// The Stash: paged overflow storage. Items move to/from the inventory (drag, click,
// or right-click). Expand with gold (per-page slots + new pages).

type Filter = 'all' | SlotCategory | 'gems';

export function StashPanel(): React.JSX.Element {
  const stash = useStore((s) => s.stash);
  const pages = useStore((s) => s.stashPages);
  const slotUpgrades = useStore((s) => s.stashSlotUpgrades);
  const gold = useStore((s) => s.gold);
  const cap = useStore((s) => s.stashCap());
  const invCap = useStore((s) => s.inventoryCap());
  const invLen = useStore((s) => countFilled(s.inventory));
  const moveToInventory = useStore((s) => s.moveToInventory);
  const moveToStash = useStore((s) => s.moveToStash);
  const sortStash = useStore((s) => s.sortStash);
  const buySlot = useStore((s) => s.buyStashSlot);
  const buyPage = useStore((s) => s.buyStashPage);
  const openMenu = useContextMenu();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  // Drop zone: an inventory item dropped onto the stash grid moves to the stash.
  const stashDrop = useDropZone(
    (p) => p.startsWith('inv|'),
    (p) => {
      const id = p.split('|')[1];
      if (id !== undefined) moveToStash(id);
    },
  );

  const perPage = STASH_PER_PAGE + slotUpgrades;
  // "all" keeps the sparse layout (holes render as empty cells, so positions are
  // fixed); a category filter is a lens that compacts to matching gear, and "gems"
  // is a lens onto loose gems (which have no gear category).
  const filtered = filter === 'all'
    ? stash
    : filter === 'gems'
      ? stash.filter((e) => e !== null && isGem(e))
      : stash.filter((e) => e !== null && isItem(e) && SLOTS[e.slot].category === filter);
  const start = (page - 1) * perPage;
  const invFull = invLen >= invCap;

  const slotCost = stashSlotCost(slotUpgrades);
  const pageCost = stashPageCost(pages + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14 }}>🧰</span>
        <span style={{ color: PALETTE.textMute, fontSize: 11 }}>{countFilled(stash)}/{cap}</span>
        <IconBtn active={false} title="Sort by tier" onClick={sortStash}>⇅</IconBtn>
        <div style={{ flex: 1 }} />
        {(['all', 'armor', 'weapon', 'jewelry', 'gems'] as Filter[]).map((f) => (
          <IconBtn key={f} active={filter === f} title={f} onClick={() => setFilter(f)}>{FILTER_ICON[f]}</IconBtn>
        ))}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <IconBtn key={p} active={page === p} title={`Page ${p}`} onClick={() => setPage(p)}>{p}</IconBtn>
          ))}
        </div>
      )}

      <div
        ref={stashDrop.ref}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: 3, justifyItems: 'center', minHeight: 120, alignContent: 'start', outline: stashDrop.over ? `2px solid ${PALETTE.gold}` : 'none' }}
      >
        {/* Fixed slots: render every cell on the page; holes (null) stay empty in place. */}
        {Array.from({ length: perPage }, (_, j) => {
          const entry = filtered[start + j] ?? null;
          if (entry === null) return <ItemSlot key={`slot-${j}`} item={null} size={32} />;
          return (
            <ItemSlot
              key={`slot-${j}`}
              item={isGem(entry) ? null : entry}
              gem={isGem(entry) ? entry : undefined}
              size={32}
              draggable
              dragData={`stash|${entry.id}`}
              onClick={() => moveToInventory(entry.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenu(e.clientX, e.clientY, [
                  { label: 'Send to Inventory', icon: '🎒', onClick: () => moveToInventory(entry.id), disabled: invFull },
                ]);
              }}
            />
          );
        })}
      </div>

      <div style={{ color: PALETTE.textMute, fontSize: 10 }}>
        Click or drag an item to move it to your inventory{invFull ? ' (inventory full)' : ''}.
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <ExpandBtn disabled={slotUpgrades >= STASH_MAX_SLOTS || gold < slotCost} maxed={slotUpgrades >= STASH_MAX_SLOTS} onClick={buySlot}>
          +1 slot/page ({format(slotCost)}g)
        </ExpandBtn>
        <ExpandBtn disabled={pages >= STASH_MAX_PAGES || gold < pageCost} maxed={pages >= STASH_MAX_PAGES} onClick={buyPage}>
          + page ({format(pageCost)}g)
        </ExpandBtn>
      </div>
    </div>
  );
}

const FILTER_ICON: Record<Filter, string> = { all: '▣', armor: '🛡️', weapon: '🗡️', jewelry: '💍', gems: '💎' };

function IconBtn({ active, title, onClick, children }: { active: boolean; title: string; onClick: () => void; children: React.ReactNode }): React.JSX.Element {
  return (
    <button onClick={onClick} title={title} style={{ minWidth: 24, height: 22, fontSize: 12, padding: 0, background: active ? PALETTE.titleRed : PALETTE.bgInset, border: `1px solid ${active ? PALETTE.gold : PALETTE.ink}`, color: PALETTE.textLight }}>
      {children}
    </button>
  );
}

function ExpandBtn({ disabled, maxed, onClick, children }: { disabled: boolean; maxed: boolean; onClick: () => void; children: React.ReactNode }): React.JSX.Element {
  return (
    <button disabled={disabled} onClick={onClick} style={{ flex: 1, padding: 3, fontSize: 10, background: disabled ? '#1a141f' : PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: maxed ? PALETTE.hpGreen : disabled ? PALETTE.textMute : PALETTE.gold }}>
      {maxed ? 'MAX' : children}
    </button>
  );
}

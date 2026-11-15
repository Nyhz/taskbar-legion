import { useRef, type ReactNode } from 'react';
import type { ItemInstance } from '@/sim/items';
import { hasPerfect } from '@/sim/items';
import type { RoleKey, RoleScores } from '@/sim/roleScore';
import type { GemInstance } from '@/data/gems';
import type { SlotKey } from '@/data/itemSlots';
import { gemName, useT } from '@/i18n';
import { ItemIcon, KitRoot, Slot, TipGroup, TipTag } from '@/ui/kit';
import { cellCrestStem, gemArtStem, itemArtStem, slotGhostStem } from '@/ui/itemArt';
import { beginItemDrag, useDragPayload } from '@/ui/components/dnd';
import { ItemCard } from './ItemCard';
import { GemCard } from './GemCard';
import { itemKindName } from './itemText';
import { useCellHover } from './useCellHover';
import './items.css';

// The item slot bound to the game, drawn with the interface kit: a cell holding an item OR a loose gem — the
// frame of its rarity with its picture, a hover card (side by side with the worn piece when `compare` is given;
// Shift leaves the gems out of the comparison), pointer drag (`dragData` payload, see ui/components/dnd), click
// and right-click. It must live inside a KitRoot (any kit Window is): the card is a child of the cell and scales
// with its panel.
//
// The props are those of the old `ItemSlot` (ui/components/ItemSlot), so a caller only swaps the name. Three were
// about the old look and are kept but mapped: `size` is ignored (a cell is 24 art px; the panel's zoom sizes it),
// `emptyIcon` (an emoji) is ignored, and `label` names an EMPTY cell (read by assistive tech and shown as its
// one-word tooltip). Three are new: `slot` + `ghostClass` draw, in an empty gear slot, the faint silhouette of
// what goes there; `dropTarget` lights the cell while something that fits it is being dragged (DropSlot gives it).

const DRAG_THRESHOLD = 5; // px of movement before a press becomes a drag (vs. a click)
const CELL_ART = 24;

export interface ItemCellProps {
  item: ItemInstance | null;
  /** A loose gem occupying this cell instead of an item (bag / stash). */
  gem?: GemInstance;
  /** The worn piece(s) this one would be compared against in its card (the slots it could fill); empty or
   *  omitted ⇒ no comparison. */
  compare?: ItemInstance[];
  /** The item is above the hero's level: dimmed, and the card says so. (No level gate exists today.) */
  locked?: boolean;
  /** The SELECTED hero cannot wear this: dimmed, with the crest of the class it belongs to in the corner. */
  unequippable?: boolean;
  /** The reason is the class lock: the card says so. */
  wrongClass?: boolean;
  /** What an EMPTY cell is (the slot's name): its accessible name and one-word tooltip. */
  label?: string;
  /** Old look only (an emoji): ignored — pass `slot` for the silhouette instead. */
  emptyIcon?: string;
  /** Old look only: ignored — a cell is 24 art px and the panel's zoom sizes it. */
  size?: number;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  dragData?: string;
  selected?: boolean;
  badge?: ReactNode;
  /** Net change of each role if this piece replaced the worn one. Computed lazily: only the hovered cell
   *  renders its card. */
  roleImpact?: (newItem: ItemInstance, equipped: ItemInstance, ignoreGems: boolean) => RoleScores;
  /** Which role lines to show (per hero class). */
  roleKeys?: RoleKey[];
  /** NEW — the gear slot this cell is: an empty cell shows the silhouette of what goes there. */
  slot?: SlotKey;
  /** NEW — the class whose piece the silhouette shows (the selected hero's). */
  ghostClass?: string;
  /** NEW — something that fits this cell is being dragged: light it. */
  dropTarget?: boolean;
}

export function ItemCell({
  item,
  gem,
  compare,
  locked = false,
  unequippable = false,
  wrongClass = false,
  label,
  onClick,
  onContextMenu,
  draggable = false,
  dragData,
  selected = false,
  badge,
  roleImpact,
  roleKeys,
  slot,
  ghostClass,
  dropTarget = false,
}: ItemCellProps): React.JSX.Element {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false); // true after a drag this press → swallow the trailing click
  const filled = item ?? gem ?? null;
  const worn = item !== null && compare !== undefined && compare.length > 0 ? compare : [];
  const dragging = useDragPayload();
  const gone = filled !== null && dragData !== undefined && dragging === dragData;
  const hover = useCellHover(rootRef, `${filled?.id ?? ''}|${worn.length}`);
  const canDrag = draggable && filled !== null && dragData !== undefined;
  const unusable = item !== null && (locked || unequippable);

  const picture =
    item !== null ? (
      <ItemIcon tier={item.tier} art={itemArtStem(item)} alt={itemKindName(item)} />
    ) : gem !== undefined ? (
      <ItemIcon tier={gem.tier} art={gemArtStem(gem)} alt={gemName(gem.key)} />
    ) : undefined;

  // Pointer-based drag (native HTML5 DnD does not work in the Tauri overlay — see dnd.tsx). A press that moves
  // past a small threshold starts the drag; the piece itself rides the cursor, at this panel's zoom.
  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0 || !canDrag || picture === undefined) return;
    draggedRef.current = false;
    const start = { x: e.clientX, y: e.clientY };
    const zoom = (rootRef.current?.getBoundingClientRect().width ?? CELL_ART) / CELL_ART;
    const move = (ev: PointerEvent): void => {
      if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_THRESHOLD) return;
      stop();
      draggedRef.current = true;
      hover.leave();
      beginItemDrag(dragData, <KitRoot zoom={zoom}>{picture}</KitRoot>, ev);
    };
    const stop = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  };

  const card = (): ReactNode => {
    if (dragging !== null || !hover.hot) return null; // no cards while a piece is in the hand
    if (gem !== undefined && item === null) return <GemCard gem={gem} side={hover.side} />;
    if (item === null) return null;
    const first = worn[0];
    if (first === undefined)
      return <ItemCard item={item} locked={locked} wrongClass={wrongClass} side={hover.side} />;
    // Side by side: the worn piece(s), then the hovered one with the differences in its own column.
    return (
      <TipGroup side={hover.side}>
        {worn.map((piece, i) => (
          <ItemCard
            key={piece.id}
            item={piece}
            worn={worn.length > 1 ? t('items.wornN', { n: i + 1 }) : t('items.worn')}
            still
          />
        ))}
        <ItemCard
          item={item}
          compareTo={first}
          locked={locked}
          wrongClass={wrongClass}
          roleDelta={roleImpact?.(item, first, hover.shift)}
          roleKeys={roleKeys}
          ignoreGems={hover.shift}
          still
        />
      </TipGroup>
    );
  };

  return (
    <Slot
      icon={picture}
      ghost={filled === null && slot !== undefined ? slotGhostStem(slot, ghostClass) : undefined}
      selected={selected}
      unusable={unusable}
      crest={unusable ? cellCrestStem(item?.classKey) : undefined}
      gone={gone}
      target={dropTarget}
      mark={item !== null && hasPerfect(item) ? 'mark_star' : undefined}
      interactive={onClick !== undefined || canDrag}
      aria-label={filled === null ? label : undefined}
      onMouseEnter={hover.enter}
      onMouseMove={hover.move}
      onMouseLeave={hover.leave}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false; // this "click" is the tail of a drag — swallow it
          return;
        }
        onClick?.();
      }}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      style={canDrag ? { touchAction: 'none' } : undefined} // let the pointer drag own the gesture
    >
      <span ref={rootAnchor(rootRef)} hidden />
      {item !== null && item.sockets.length > 0 && (
        <span className="tk-cell-sockets">
          {item.sockets.map((socket, i) => (
            <i key={i} className={socket.gem !== null ? 'on' : undefined} />
          ))}
        </span>
      )}
      {badge}
      {filled === null && label !== undefined && dragging === null && <TipTag>{label}</TipTag>}
      {card()}
    </Slot>
  );
}

// The kit's Slot does not forward a ref, and the hover / drag code needs the cell's element. A hidden child
// hands it over: its parent IS the slot.
function rootAnchor(
  target: React.MutableRefObject<HTMLDivElement | null>,
): (el: HTMLSpanElement | null) => void {
  return (el) => {
    target.current = el === null ? null : (el.parentElement as HTMLDivElement | null);
  };
}

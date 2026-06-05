import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import { GEMS } from '@/data/gems';
import { tierStyle } from '@/ui/tierStyle';
import { itemGlyph } from '@/ui/icons';
import { ItemTooltip } from './ItemTooltip';
import { GemTooltip } from './GemTooltip';
import { PALETTE } from '@/styles/palette';
import { setItemDragging } from '@/platform/dragState';

// A tier-colored cell holding an item OR a loose gem: slot ICON / gem disc, tier
// border + T# corner. Supports native drag (dragData payload) and right-click
// (onContextMenu). The tooltip is a PORTAL to <body> in viewport coords, clamped
// on-screen, so it never clips.

const TIP_W = 224;
const TIP_H = 280;

export function ItemSlot({
  item,
  gem,
  compare,
  locked = false,
  unequippable = false,
  wrongClass = false,
  label,
  emptyIcon,
  size = 34,
  onClick,
  onContextMenu,
  draggable = false,
  dragData,
  selected = false,
  badge,
}: {
  item: ItemInstance | null;
  /** a loose gem occupying this cell instead of an item (inventory/stash). */
  gem?: GemInstance;
  /** item is above the hero's level (can't be equipped) — dims it and flags the level
   *  requirement red in the tooltip. The on-item indicator is the shared ✕ (unequippable). */
  locked?: boolean;
  /** the SELECTED hero can't equip this item (too low level OR wrong class) — dim it
   *  and stamp a red ✕ in the bottom-right corner. */
  unequippable?: boolean;
  /** the unequippable reason is a class lock (wrong class) — highlights the class line
   *  red in the tooltip. */
  wrongClass?: boolean;
  /** equipped item(s) this one would be compared against in its tooltip (the slots
   *  it could fill); empty/omitted ⇒ no comparison (all stats shown as gains). */
  compare?: ItemInstance[];
  label?: string;
  emptyIcon?: string; // glyph shown when the cell is empty (e.g. a gear-slot icon)
  size?: number;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  dragData?: string;
  selected?: boolean;
  badge?: ReactNode;
}): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const filled = item ?? gem ?? null; // the entry occupying this cell, if any
  const ts = item ? tierStyle(item.tier) : gem ? tierStyle(gem.tier) : null;
  const border = selected ? PALETTE.gold : ts ? ts.color : PALETTE.ink;

  const onEnter = (): void => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect === undefined) return;
    // A comparison shows the equipped card(s) side-by-side, so reserve their combined width.
    const cards = item !== null && compare !== undefined && compare.length > 0 ? 1 + compare.length : 1;
    const totalW = cards * TIP_W + (cards - 1) * 8;
    // Always open to the RIGHT of the cell (never flip to the left, even in the last
    // column) — only nudge left as far as needed to keep it on-screen.
    const left = Math.max(4, Math.min(rect.right + 6, window.innerWidth - totalW - 4));
    const top = Math.max(4, Math.min(window.innerHeight - TIP_H, rect.top - 2));
    setTip({ left, top });
  };

  // Safety net so the portal tooltip can NEVER get stuck (a dropped React mouseleave —
  // the slot re-rendering or unmounting from under the cursor): while it's open, watch
  // the real pointer and dismiss the instant it leaves the cell, and on any scroll /
  // click / tab-away. Only active while a tip is showing, so it's cheap.
  useEffect(() => {
    if (tip === null) return;
    const clear = (): void => setTip(null);
    const onMove = (e: MouseEvent): void => {
      const r = rootRef.current?.getBoundingClientRect();
      if (r === undefined || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        clear();
      }
    };
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('scroll', clear, true);
    window.addEventListener('pointerdown', clear, true);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', clear);
    return () => {
      window.removeEventListener('mousemove', onMove, true);
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('pointerdown', clear, true);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', clear);
    };
  }, [tip]);

  return (
    <div
      ref={rootRef}
      onMouseEnter={onEnter}
      onMouseLeave={() => setTip(null)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={label}
      draggable={draggable && filled !== null}
      onDragStart={(e) => {
        if (dragData !== undefined) e.dataTransfer.setData('text/plain', dragData);
        setTip(null);
        setItemDragging(true); // pin the desktop overlay interactive for the whole gesture
      }}
      onDragEnd={() => setItemDragging(false)}
      style={{
        position: 'relative',
        width: size,
        height: size,
        background: PALETTE.bgInset,
        border: `2px solid ${border}`,
        boxShadow: selected ? `0 0 6px ${PALETTE.gold}` : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : draggable && filled ? 'grab' : 'default',
        fontSize: size > 30 ? 18 : 15,
      }}
    >
      {item ? (
        <span className={ts?.iridescent ? 'tl-iridescent' : undefined} style={{ opacity: locked || unequippable ? 0.4 : 1, filter: locked || unequippable ? 'grayscale(0.7)' : undefined }}>{itemGlyph(item)}</span>
      ) : gem ? (
        <span
          style={{
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: '50%',
            background: GEMS[gem.key].color,
            border: `1px solid ${PALETTE.ink}`,
            boxShadow: `0 0 5px ${GEMS[gem.key].color}`,
          }}
        />
      ) : emptyIcon !== undefined ? (
        <span style={{ opacity: 0.28, filter: 'grayscale(1)' }}>{emptyIcon}</span>
      ) : (
        <span style={{ color: PALETTE.textMute, fontSize: 9 }}>{label}</span>
      )}
      {filled && (
        // Tier number stays in the bottom-RIGHT corner; the red ✕ tucks to the bottom-left instead.
        <span style={{ position: 'absolute', bottom: -2, right: 1, fontSize: 8, color: ts?.color, fontWeight: 700, textShadow: `0 1px 0 ${PALETTE.ink}` }}>
          T{filled.tier}
        </span>
      )}
      {item && !unequippable && (
        // Item level in the bottom-LEFT — the corner the red ✕ takes over for a wrong-class
        // item, so a usable item shows its ilvl and an unusable one shows the ✕ instead.
        <span style={{ position: 'absolute', bottom: -2, left: 1, fontSize: 8, color: ts?.color ?? PALETTE.parchment, fontWeight: 700, textShadow: `0 1px 0 ${PALETTE.ink}` }}>
          {item.ilvl}
        </span>
      )}
      {unequippable && item && (
        <span
          title="Can't equip: wrong class or level too low"
          style={{ position: 'absolute', bottom: -3, left: -1, fontSize: 13, lineHeight: 1, color: '#ff5757', fontWeight: 900, textShadow: `0 0 2px ${PALETTE.ink}, 0 1px 0 ${PALETTE.ink}`, pointerEvents: 'none' }}
        >
          ✕
        </span>
      )}
      {item && item.sockets.length > 0 && (
        <span style={{ position: 'absolute', top: 1, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 1, pointerEvents: 'none' }}>
          {item.sockets.map((so, idx) => {
            const c = so.gem ? GEMS[so.gem.key].color : null;
            const pip = Math.max(4, Math.round(size * 0.18));
            return (
              <span
                key={idx}
                style={{
                  width: pip,
                  height: pip,
                  background: c ?? PALETTE.bgDeep,
                  border: `1px solid ${c ? PALETTE.ink : PALETTE.goldDim}`,
                  boxShadow: c ? `0 0 3px ${c}` : undefined,
                }}
              />
            );
          })}
        </span>
      )}
      {badge}
      {tip !== null && (item || gem) &&
        createPortal(
          <div style={{ position: 'fixed', left: tip.left, top: tip.top, zIndex: 9999, pointerEvents: 'none' }}>
            {item ? (
              compare !== undefined && compare.length > 0 ? (
                // Side-by-side: the hovered ("New") card with green/red deltas, then the
                // equipped card(s) so the two can be read directly against each other.
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <TipColumn caption="New">
                    <ItemTooltip item={item} compareTo={compare[0]} locked={locked} wrongClass={wrongClass} />
                  </TipColumn>
                  {compare.map((eq, i) => (
                    <TipColumn key={eq.id} caption={compare.length > 1 ? `Equipped ${i + 1}` : 'Equipped'}>
                      <ItemTooltip item={eq} />
                    </TipColumn>
                  ))}
                </div>
              ) : (
                <ItemTooltip item={item} locked={locked} wrongClass={wrongClass} />
              )
            ) : gem ? (
              <GemTooltip gem={gem} />
            ) : null}
          </div>,
          document.body,
        )}
    </div>
  );
}

// A small caption above a tooltip card in a side-by-side comparison ("New" / "Equipped").
function TipColumn({ caption, children }: { caption: string; children: ReactNode }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase', color: caption === 'New' ? PALETTE.gold : PALETTE.textMute }}>
        {caption}
      </div>
      {children}
    </div>
  );
}

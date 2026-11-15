import type { HTMLAttributes, ReactNode } from 'react';
import { art } from './art';

// The 24×24 slot of a grid or of the paper doll (every item cell in the game is this size). It is presentation only: the caller spreads its own pointer /
// drag / context-menu handlers on it (every other prop goes to the element) and puts a tooltip in `children`.
//
//   <Slot icon={<ItemIcon tier={3} art="sm_sword_3" alt="Hoja de caballero" />} selected>…tooltip…</Slot>
//   <Slot />                                              an empty well
//   <Slot ghost="sm_trinket_1" />                         an empty gear slot showing what goes there
//   <Slot icon={…} unusable crest="mark_crest_priest" />  a piece this hero cannot wear
//
// Drag: give the ORIGIN slot `gone` while its piece is in the hand, and every slot that would accept the piece
// `target`. The floating ghost itself is the drag layer's job (ui/components/dnd), not the slot's.

export interface SlotProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What sits in the slot (an `ItemIcon`, or any 24×24 picture). Omitted ⇒ an empty well. */
  icon?: ReactNode;
  /** Art stem (a bare 22×22 icon, `sm_…`) drawn as a faint silhouette in an EMPTY slot. */
  ghost?: string;
  /** Gold corner brackets: the slot the panel is talking about. */
  selected?: boolean;
  /** Not usable by the current hero: dimmed. Pass the owner's crest in `crest`. */
  unusable?: boolean;
  /** Art stem of a 9×9 mark in the bottom-right corner (the owning class's small crest, `mark_crest_…`). */
  crest?: string;
  /** The origin of a drag: its piece is in the hand. */
  gone?: boolean;
  /** A valid place to drop what is being dragged: lit. */
  target?: boolean;
  /** A number in the corner (a stack, a level). */
  count?: ReactNode;
  /** Art stem of a 7×7 mark in the top-left corner (`mark_star`). */
  mark?: string;
  /** The slot reacts to the pointer (hover light, pointer cursor). Default: true when it holds something. */
  interactive?: boolean;
  /** A tooltip (`Tip` / `TipGroup`): shown on hover. */
  children?: ReactNode;
}

export function Slot({
  icon,
  ghost,
  selected = false,
  unusable = false,
  crest,
  gone = false,
  target = false,
  count,
  mark,
  interactive,
  className,
  children,
  ...rest
}: SlotProps): React.JSX.Element {
  const live = interactive ?? icon !== undefined;
  const cls =
    'tk-slot' +
    (children !== undefined && children !== null && children !== false ? ' has' : '') +
    (selected ? ' sel' : '') +
    (unusable ? ' no' : '') +
    (gone ? ' gone' : '') +
    (target ? ' ok' : '') +
    (live ? ' can' : '') +
    (className === undefined ? '' : ` ${className}`);
  return (
    <div className={cls} {...rest}>
      {icon ?? <img src={art('mark_well')} alt="" draggable={false} />}
      {icon === undefined && ghost !== undefined && (
        <img className="ghost" src={art(ghost)} alt="" draggable={false} />
      )}
      {crest !== undefined && <img className="cls" src={art(crest)} alt="" draggable={false} />}
      {mark !== undefined && <img className="mark" src={art(mark)} alt="" draggable={false} />}
      {count !== undefined && <b>{count}</b>}
      {children}
    </div>
  );
}

/** An item (or a gem) as a picture: the 24 px frame of its tier with the bare 22 px icon on top. `art` is the
 *  icon's stem (see ui/itemArt.ts for the mapping from a game item). */
export function ItemIcon({
  tier,
  art: stem,
  alt = '',
}: {
  tier: number;
  art: string;
  alt?: string;
}): React.JSX.Element {
  const frame = `smframe_${Math.max(0, Math.min(8, Math.round(tier)))}`;
  return (
    <div className="tk-item">
      <img src={art(frame)} alt="" draggable={false} />
      <img src={art(stem)} alt={alt} draggable={false} />
    </div>
  );
}

/** A grid of slots, `cols` wide (24 px cells, 2 px apart). */
export function SlotGrid({
  cols = 6,
  className,
  children,
}: {
  cols?: number;
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  const style = { '--cols': cols } as React.CSSProperties;
  return (
    <div className={className === undefined ? 'tk-grid' : `tk-grid ${className}`} style={style}>
      {children}
    </div>
  );
}

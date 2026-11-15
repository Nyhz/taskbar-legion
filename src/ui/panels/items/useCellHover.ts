import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import type { TipSide } from '@/ui/kit';

// Hover state of an item cell. The kit shows a tooltip with plain CSS (`.has:hover > .tt`), so nothing can get
// stuck; this hook only decides WHEN the card is worth rendering (while the pointer is on the cell — the role
// comparison is not cheap), WHERE it opens (beside the cell, flipped to the other side or anchored by its bottom
// when it would leave the screen), and whether Shift is held (compare without counting the gems).

const EDGE = 2; // px kept clear of the viewport's edge
const GAP = 8; // px between the cell and its card, an upper bound at any zoom

export interface CellHover {
  /** The pointer is on the cell: render the card. */
  hot: boolean;
  /** Where the card opens. */
  side: TipSide;
  /** Shift is held while hovering. */
  shift: boolean;
  enter: (e: { shiftKey: boolean }) => void;
  move: (e: { shiftKey: boolean }) => void;
  leave: () => void;
}

export function useCellHover(rootRef: RefObject<HTMLElement>, remeasureKey: unknown): CellHover {
  const [hot, setHot] = useState(false);
  const [left, setLeft] = useState(false);
  const [up, setUp] = useState(false);
  const [shift, setShift] = useState(false);

  // Once the card is laid out, measure it against the viewport and pick the side on which less of it is lost.
  // Decided from the card's size and the cell's place only, so it settles in one pass (no flip-flopping).
  useLayoutEffect(() => {
    if (!hot) return;
    const root = rootRef.current;
    const card = root?.querySelector<HTMLElement>(':scope > .tt');
    if (root === null || root === undefined || card === null || card === undefined) return;
    const size = card.getBoundingClientRect();
    if (size.width === 0 || size.height === 0) return; // not displayed (no real hover): nothing to measure
    const cell = root.getBoundingClientRect();
    const lostRight = Math.max(0, cell.right + GAP + size.width - (window.innerWidth - EDGE));
    const lostLeft = Math.max(0, size.width + GAP + EDGE - cell.left);
    const lostDown = Math.max(0, cell.top + size.height - (window.innerHeight - EDGE));
    const lostUp = Math.max(0, size.height + EDGE - cell.bottom);
    setLeft(lostRight > 0 && lostLeft < lostRight);
    setUp(lostDown > 0 && lostUp < lostDown);
  }, [hot, remeasureKey, rootRef]);

  // Shift held or released while hovering.
  useEffect(() => {
    if (!hot) return;
    const sync = (e: KeyboardEvent): void => setShift(e.shiftKey);
    // Safety net for a dropped mouseleave (the cell re-rendering from under the pointer): the real pointer leaving
    // the cell, a press anywhere, or the window losing focus all close it.
    const watch = (e: MouseEvent): void => {
      const r = rootRef.current?.getBoundingClientRect();
      if (
        r === undefined ||
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        setHot(false);
    };
    const close = (): void => setHot(false);
    window.addEventListener('keydown', sync);
    window.addEventListener('keyup', sync);
    window.addEventListener('mousemove', watch, true);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('keydown', sync);
      window.removeEventListener('keyup', sync);
      window.removeEventListener('mousemove', watch, true);
      window.removeEventListener('blur', close);
    };
  }, [hot, rootRef]);

  return {
    hot,
    side: left ? (up ? 'left-up' : 'left') : up ? 'right-up' : 'right',
    shift: hot && shift,
    enter: (e) => {
      setShift(e.shiftKey);
      setHot(true);
    },
    move: (e) => setShift(e.shiftKey), // picks up a Shift already held before the hover began
    leave: () => {
      setHot(false);
      setLeft(false);
      setUp(false);
    },
  };
}

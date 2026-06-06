import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { setItemDragging } from '@/platform/dragState';
import { PALETTE } from '@/styles/palette';

// Pointer-based drag-and-drop for inventory/stash/equipment items. NATIVE HTML5 DnD is
// unreliable in the Tauri/WKWebView desktop overlay (the click-through window can't initiate
// a drag image and the drop's dataTransfer comes back empty), so we roll our own: a drag is a
// payload STRING that follows the cursor as a floating ghost; on release we hit-test the drop
// zone under the pointer and hand it the payload. No native `draggable`/dataTransfer at all.
//
// Lives in ui/ (it touches the DOM + React). It pins the desktop overlay interactive for the
// whole gesture via setItemDragging so the click-through poll never drops the drag.

interface Zone {
  el: HTMLElement;
  accept: (payload: string) => boolean;
  onDrop: (payload: string) => void;
  setOver: (over: boolean) => void;
}

const zones = new Set<Zone>();

interface DragData {
  payload: string;
  ghost: ReactNode;
  x: number;
  y: number;
}
let drag: DragData | null = null;
const subs = new Set<() => void>();
function emit(): void {
  for (const f of subs) f();
}

// The registered drop zone whose element is the nearest ancestor of the point (the ghost is
// pointer-events:none, so elementFromPoint sees straight through it to the real UI).
function zoneAt(x: number, y: number): Zone | null {
  let el = document.elementFromPoint(x, y) as HTMLElement | null;
  while (el !== null) {
    for (const z of zones) if (z.el === el) return z;
    el = el.parentElement;
  }
  return null;
}

/** Suppress native text selection for the duration of a drag (pointer drags otherwise sweep-
 *  select every bit of text the cursor crosses). Call with false to restore. */
export function lockSelection(on: boolean): void {
  document.body.style.userSelect = on ? 'none' : '';
  document.body.style.setProperty('-webkit-user-select', on ? 'none' : '');
  if (on) window.getSelection()?.removeAllRanges(); // clear anything already half-selected
}

/** Begin dragging `payload` (e.g. "inv|<id>"), showing `ghost` under the cursor until release. */
export function beginItemDrag(payload: string, ghost: ReactNode, e: { clientX: number; clientY: number }): void {
  drag = { payload, ghost, x: e.clientX, y: e.clientY };
  setItemDragging(true);
  lockSelection(true);
  emit();

  let hovered: Zone | null = null;
  const setHover = (z: Zone | null): void => {
    if (z === hovered) return;
    hovered?.setOver(false);
    hovered = z;
    hovered?.setOver(true);
  };
  const move = (ev: PointerEvent): void => {
    if (drag === null) return;
    drag = { ...drag, x: ev.clientX, y: ev.clientY };
    emit();
    const z = zoneAt(ev.clientX, ev.clientY);
    setHover(z !== null && z.accept(payload) ? z : null);
  };
  const up = (ev: PointerEvent): void => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    const z = zoneAt(ev.clientX, ev.clientY);
    setHover(null);
    drag = null;
    emit();
    setItemDragging(false);
    lockSelection(false);
    if (z !== null && z.accept(payload)) z.onDrop(payload);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/** Register a div as a drop zone. Returns a ref to attach + a live `over` highlight flag. */
export function useDropZone(
  accept: (payload: string) => boolean,
  onDrop: (payload: string) => void,
): { ref: React.RefObject<HTMLDivElement>; over: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  // Keep the latest callbacks without re-registering the zone every render.
  const acceptRef = useRef(accept);
  acceptRef.current = accept;
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const zone: Zone = {
      el,
      accept: (p) => acceptRef.current(p),
      onDrop: (p) => onDropRef.current(p),
      setOver,
    };
    zones.add(zone);
    return () => {
      zones.delete(zone);
    };
  }, []);
  return { ref, over };
}

/** A single-cell drop zone wrapping one inventory/stash cell, so an item can be dropped onto an
 *  EXACT slot instead of falling into the first free one. A nested zone wins over its container
 *  zone (zoneAt returns the nearest ancestor), and it flashes a gold outline while hovered. */
export function DropCell({
  accept,
  onDrop,
  children,
}: {
  accept: (payload: string) => boolean;
  onDrop: (payload: string) => void;
  children: ReactNode;
}): React.JSX.Element {
  const { ref, over } = useDropZone(accept, onDrop);
  return (
    // Shrink to the cell's own size and center within its grid track — otherwise a stretched
    // grid item (e.g. the inventory's 1fr columns) draws the highlight outline wider than the
    // slot. Sized to content, the outline rings the slot exactly; offset 1 keeps it just OUTSIDE
    // the slot so the cell's own opaque background can't paint over it (a negative offset hides
    // it behind the slot).
    <div ref={ref} style={{ display: 'flex', justifySelf: 'center', alignSelf: 'center', outline: over ? `2px solid ${PALETTE.gold}` : undefined, outlineOffset: 1 }}>
      {children}
    </div>
  );
}

/** The floating ghost that follows the cursor while dragging. Mount once near the app root. */
export function DragOverlay(): React.JSX.Element | null {
  const [, force] = useState(0);
  useEffect(() => {
    const f = (): void => force((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  if (drag === null) return null;
  return createPortal(
    <div style={{ position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 100000, opacity: 0.9 }}>
      {drag.ghost}
    </div>,
    document.body,
  );
}

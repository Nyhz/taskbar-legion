// Tiny shared flag: true while the user is dragging the strip around the desktop.
// The drag handler (App) sets it; GameStrip reads it so a drag that happens to end
// over the portal doesn't fire a spurious portal tap. Kept here (platform/) so the
// game/ layer can read it without importing app/ or ui/.

let dragging = false;

export function setStripDragging(value: boolean): void {
  dragging = value;
}

export function isStripDragging(): boolean {
  return dragging;
}

// True while an inventory/stash/paper-doll item is being dragged (native HTML5 DnD).
// The desktop overlay's click-through poll reads this and PINS the window interactive
// for the whole gesture — otherwise, when the cursor crosses a pointer-events:none gap
// between panels mid-drag, the poll would toggle setIgnoreCursorEvents(true) and the
// webview would drop the drag (the reason item drag was broken in the desktop client).
let itemDragging = false;

export function setItemDragging(value: boolean): void {
  itemDragging = value;
}

export function isItemDragging(): boolean {
  return itemDragging;
}

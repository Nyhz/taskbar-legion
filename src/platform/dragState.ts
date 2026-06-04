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

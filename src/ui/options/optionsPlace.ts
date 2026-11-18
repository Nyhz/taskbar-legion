// Where the options window goes: hung from its sign (right edge on the sign's, opening upwards), unless that would
// cover an open panel — then it steps right, past the panels it would cover, as far as the window allows. On a
// wide screen the strip (and the sign at its right end) can be narrower than the hero window above it, and the
// options would sit on top of the hero's stats (user, 2026-11-18). Pure: rectangles in CSS px.

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function placeOptions(args: {
  /** The sign's rectangle. */
  sign: Box;
  /** The options window's size. */
  size: { width: number; height: number };
  /** The open panels' rectangles. */
  panels: readonly Box[];
  viewport: { width: number; height: number };
  gap: number;
  edge: number;
}): { right: number; bottom: number } {
  const { sign, size, panels, viewport, gap, edge } = args;
  const bottom = Math.max(edge, viewport.height - sign.top + gap);
  const top = viewport.height - bottom - size.height;
  let right = Math.max(edge, viewport.width - sign.right);
  for (let i = 0; i < 4; i++) {
    const left = viewport.width - right - size.width;
    const covered = panels.filter((p) => p.top < viewport.height - bottom && p.bottom > top && p.right > left && p.left < viewport.width - right);
    if (covered.length === 0) break;
    const clear = Math.max(...covered.map((p) => p.right)) + gap;
    const next = Math.max(edge, viewport.width - clear - size.width);
    if (next >= right) break; // no room further right: stay (the options still draw on top)
    right = next;
  }
  return { right, bottom };
}

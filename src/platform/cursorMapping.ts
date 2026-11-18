// Where the OS cursor sits inside the overlay's viewport (CSS px), from what Tauri reports.
//
// Tauri hands both the cursor and the window position over as "physical" pixels, but on macOS they are not the same
// unit: tao converts the cursor from points with the PRIMARY monitor's scale factor, and the window's position with
// the scale of the monitor the WINDOW is on (tao 0.35 macos/util cursor_position vs window outer_position). On a
// second screen with a different scale (a Retina MacBook ×2 beside a ×1 monitor) the plain difference lands outside
// the viewport, the hit-test sees nothing, and the whole window stays click-through — it can't be clicked or dragged.
// So each is turned back into points with its own scale before subtracting. Windows and Linux report both in the
// same physical space, where both scales are the window's.

export interface CursorScales {
  /** The scale the cursor's physical position was made with (macOS: the primary monitor's). */
  cursor: number;
  /** The scale the window's physical position was made with (the window's own). */
  window: number;
}

export function cursorInViewport(
  cursor: { x: number; y: number },
  origin: { x: number; y: number },
  scales: CursorScales,
): { x: number; y: number } {
  const c = scales.cursor > 0 ? scales.cursor : 1;
  const w = scales.window > 0 ? scales.window : 1;
  return { x: cursor.x / c - origin.x / w, y: cursor.y / c - origin.y / w };
}

/** Is this the macOS webview (WKWebView)? Only there does the cursor use the primary monitor's scale. */
export function isMacWebview(userAgent: string): boolean {
  return /Macintosh|Mac OS X/i.test(userAgent) && !/iPhone|iPad/i.test(userAgent);
}

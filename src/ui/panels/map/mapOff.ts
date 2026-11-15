import type { CSSProperties } from 'react';

/** How far an element sits from the wing's left edge, in art px: map.css pushes its tooltip that much further
 *  left, so the tooltip clears the whole wing (it opens over the hero window) instead of covering neighbours. */
export function offStyle(artPx: number): CSSProperties {
  return { ['--off' as string]: `${artPx}px` } as CSSProperties;
}

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { KIT_VARS } from './tokens';
import './kit.css';

// The root of anything built with the kit. Everything inside is authored at the game's 1× art pixel and this
// element's `zoom` brings it to screen size, so nine-slices, signs and lettering all share one pixel grid.
// Proportions between the pieces are fixed by the ART (an item cell is 24 art px, a sign 16, a letter 10): the
// zoom scales all of them together, whatever the screen.

export interface KitRootProps extends HTMLAttributes<HTMLDivElement> {
  /** CSS pixels per art pixel (the panel layer picks a whole number of SCREEN pixels and divides by the display's ratio). */
  zoom: number;
  children: ReactNode;
}

export function KitRoot({ zoom, className, style, children, ...rest }: KitRootProps): React.JSX.Element {
  const vars = KIT_VARS as CSSProperties;
  return (
    <div
      className={className === undefined ? 'tk' : `tk ${className}`}
      style={{ ...vars, zoom, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

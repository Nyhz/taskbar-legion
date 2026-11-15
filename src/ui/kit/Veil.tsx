import type { MouseEventHandler, ReactNode } from 'react';
import './kit.css';

// A veil: the dark layer over the whole page that a dialog sits on, centred. It stands OUTSIDE a KitRoot (the
// dialog inside it brings its own, at its own zoom). Levels, by what it must cover:
//   page → over the game (the summary of an absence)
//   top  → over everything, nearly opaque (the graphics failure: there is nothing behind it to go back to)
//   over → over the panels' own floating layers (a dialog opened from a context menu)
// It is marked `data-interactive` so the desktop overlay keeps the pointer on it.

export type VeilLevel = 'page' | 'top' | 'over';

const LEVEL_CLASS: Record<VeilLevel, string> = { page: 'tk-veil', top: 'tk-veil top', over: 'tk-veil over' };

export function Veil({
  level = 'page',
  onClick,
  children,
}: {
  level?: VeilLevel;
  /** A click on the veil itself (usually: close). The dialog must stop its own clicks from reaching it. */
  onClick?: MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className={LEVEL_CLASS[level]} onClick={onClick} data-interactive="true">
      {children}
    </div>
  );
}

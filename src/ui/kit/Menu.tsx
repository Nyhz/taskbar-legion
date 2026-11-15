import type { MouseEventHandler, ReactNode } from 'react';
import { Sign } from './Sign';

// The context-menu plate: a dark plate with one line per action. Presentation only — where it appears and when it
// closes is the caller's business (ui/components/ContextMenu owns that today; to draw its menu with this, render
// `<KitRoot zoom={…}><Menu>…</Menu></KitRoot>` inside its portal). Also used for pickers (recruiting a class):
// a row may carry a blackletter name and something at its far end.

export function Menu({
  tall = false,
  className,
  children,
}: {
  tall?: boolean;
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={`tk-menu${tall ? ' tall' : ''}${className === undefined ? '' : ` ${className}`}`}
      role="menu"
    >
      {children}
    </div>
  );
}

export interface MenuRowProps {
  /** Art stem of the row's sign. Omitted ⇒ the text still lines up with rows that have one. */
  sign?: string;
  /** The action, in words. */
  children: ReactNode;
  /** Set the words in the blackletter face (a name, not an action). */
  name?: boolean;
  /** Something at the far end of the row (a price, the verb of a picker). */
  end?: ReactNode;
  /** Shown but not available (greyed, no click): say why in the words. */
  disabled?: boolean;
  /** A destructive action (red). */
  danger?: boolean;
  /** Drawn highlighted without the pointer (the default action). */
  active?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function MenuRow({
  sign,
  children,
  name = false,
  end,
  disabled = false,
  danger = false,
  active = false,
  onClick,
}: MenuRowProps): React.JSX.Element {
  const cls = `it${active ? ' on' : ''}${disabled ? ' off' : ''}${danger ? ' bad' : ''}`;
  return (
    <button
      type="button"
      role="menuitem"
      className={cls}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {sign !== undefined ? <Sign name={sign} /> : <i />}
      {name ? <span className="nm">{children}</span> : children}
      {end !== undefined && <span className="end">{end}</span>}
    </button>
  );
}

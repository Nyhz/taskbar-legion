import type { MouseEventHandler, ReactNode } from 'react';
import { Sign } from './Sign';

// Keys. `Key` is a raised key: with only a `sign` it is the square 24×24 key; with a word (children) and / or a
// price it is the worded key. `Chip` is a bare sign that toggles (a filter, a small action). `Check` is the
// labelled pixel checkbox. All are real buttons; `label` is what assistive tech reads when there is no word.

export type KeyTone = 'plum' | 'gold' | 'danger';

export interface KeyProps {
  /** Art stem of the sign on the key (before the word, on a worded key). */
  sign?: string;
  /** The word on the key. Words only where a sign cannot carry the action. */
  children?: ReactNode;
  /** A price after the word: the coin and this amount. */
  price?: ReactNode;
  tone?: KeyTone;
  /** Cannot be pressed now: greyed, no click. (It still shows its tooltip, to say why.) */
  disabled?: boolean;
  /** A small counter on the corner. */
  badge?: ReactNode;
  /** A green lamp on the corner: this switch is on. */
  lamp?: boolean;
  /** Read by assistive tech (required when the key has no word). */
  label?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onContextMenu?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  /** A tooltip (`Tip`): shown on hover. Goes inside the key. */
  tip?: ReactNode;
}

export function Key({
  sign,
  children,
  price,
  tone = 'plum',
  disabled = false,
  badge,
  lamp = false,
  label,
  onClick,
  onContextMenu,
  className,
  tip,
}: KeyProps): React.JSX.Element {
  const worded = children !== undefined || price !== undefined;
  const cls =
    (worded ? 'tk-key' : 'tk-btn') +
    (tone === 'plum' ? '' : ` ${tone}`) +
    (disabled ? ' off' : '') +
    (tip !== undefined ? ' has' : '') +
    (className === undefined ? '' : ` ${className}`);
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onContextMenu={disabled ? undefined : onContextMenu}
      onPointerDown={(e) => e.stopPropagation()} // a press on a key never starts dragging what is under it
    >
      {sign !== undefined && <Sign name={sign} />}
      {children}
      {price !== undefined && (
        <>
          <Sign name="ui_gold" />
          <b className="price">{price}</b>
        </>
      )}
      {badge !== undefined && <b className={worded ? 'badge' : undefined}>{badge}</b>}
      {lamp && <u />}
      {tip}
    </button>
  );
}

export interface ChipProps {
  sign: string;
  label: string;
  on?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  tip?: ReactNode;
}

/** A bare sign that toggles or acts: dim until hovered, underlined while on. */
export function Chip({ sign, label, on = false, onClick, tip }: ChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={`tk-chip${on ? ' on' : ''}${tip !== undefined ? ' has' : ''}`}
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Sign name={sign} />
      {tip}
    </button>
  );
}

export interface CheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The label beside the box. */
  children: ReactNode;
  tip?: ReactNode;
}

/** A pixel checkbox with its label. */
export function Check({ checked, onChange, children, tip }: CheckProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={`tk-check${tip !== undefined ? ' has' : ''}`}
      onClick={() => onChange(!checked)}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Sign name={checked ? 'cube2_tick_on' : 'cube2_tick_off'} />
      <span>{children}</span>
      {tip}
    </button>
  );
}

/** The purse, wherever it shows: the coin and an amount. */
export function Gold({ children, tip }: { children: ReactNode; tip?: ReactNode }): React.JSX.Element {
  return (
    <div className={tip !== undefined ? 'tk-gold has' : 'tk-gold'} style={{ position: 'relative' }}>
      <Sign name="ui_gold" />
      {children}
      {tip}
    </div>
  );
}

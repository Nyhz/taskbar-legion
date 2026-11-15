import type { ReactNode } from 'react';

// Tooltips: the only place where things are spelled out. A tooltip is a CHILD of what it explains: give the
// parent the class `has` and it shows on hover (kit.css) — no state, no portal, and it scales with its panel.
// `side` says where it opens from the parent; `size` picks the width recipe. A `still` tip is not a hover tip:
// it is laid out where it stands (a pinned card, or a card inside a TipGroup).

export type TipSide =
  | 'right' // beside the parent, tops aligned (the default)
  | 'right-up' // beside it, bottoms aligned: for things near the bottom of a window
  | 'left'
  | 'left-up'
  | 'above'
  | 'above-end' // above, right edges aligned
  | 'below'
  | 'below-end';
export type TipSize = 'item' | 'wide' | 'mini' | 'tag';

const SIDE_CLASS: Record<TipSide, string> = {
  right: '',
  'right-up': ' up',
  left: ' left',
  'left-up': ' left up',
  above: ' above',
  'above-end': ' above end',
  below: ' below',
  'below-end': ' below end',
};
const SIZE_CLASS: Record<TipSize, string> = { item: '', wide: ' wide', mini: ' mini', tag: ' tag' };

/** Classes that place a hover layer (`tt`) on a side of its parent. For a custom layer that is not a Tip. */
export function tipSideClass(side: TipSide): string {
  return `tt${SIDE_CLASS[side]}`;
}

export interface TipProps {
  side?: TipSide;
  size?: TipSize;
  /** Item tier 0–8: colours the name (`TipName`) like the item's rarity. */
  tier?: number;
  /** Laid out in place instead of shown on hover. */
  still?: boolean;
  children: ReactNode;
}

export function Tip({
  side = 'right',
  size = 'mini',
  tier,
  still = false,
  children,
}: TipProps): React.JSX.Element {
  const place = still ? ' still' : ` ${tipSideClass(side)}`;
  const rarity = tier === undefined ? '' : ` t${Math.max(0, Math.min(8, Math.round(tier)))}`;
  return <div className={`tk-tip${SIZE_CLASS[size]}${place}${rarity}`}>{children}</div>;
}

/** Several cards shown together on hover (the worn piece beside the hovered one): put `still` Tips inside. */
export function TipGroup({
  side = 'right',
  children,
}: {
  side?: TipSide;
  children: ReactNode;
}): React.JSX.Element {
  return <div className={`tk-cmp ${tipSideClass(side)}`}>{children}</div>;
}

/** The heading of a tooltip: what the thing is called. */
export function TipTitle({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="hd">{children}</div>;
}

/** A label and its value on one line. `tone` colours the value; `bad` on the line colours the label. */
export function TipLine({
  label,
  value,
  tone,
  here = false,
}: {
  label: ReactNode;
  value?: ReactNode;
  tone?: 'good' | 'bad' | 'gold';
  /** Marks the line that applies now (gold). */
  here?: boolean;
}): React.JSX.Element {
  return (
    <div className={here ? 'ln here' : 'ln'}>
      <span>{label}</span>
      {value !== undefined && <b className={tone}>{value}</b>}
    </div>
  );
}

/** A sentence of explanation. */
export function TipText({ children }: { children: ReactNode }): React.JSX.Element {
  return <p>{children}</p>;
}

/** A dim closing note (a hint, a flavour line). */
export function TipNote({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="note">{children}</div>;
}

/** A warning sentence (why something cannot be done). */
export function TipWarn({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="ln bad">
      <span>{children}</span>
    </div>
  );
}

/** A one-word tooltip: just the name of a sign. */
export function TipTag({
  side = 'right',
  children,
}: {
  side?: TipSide;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Tip side={side} size="tag">
      <div className="hd solo">{children}</div>
    </Tip>
  );
}

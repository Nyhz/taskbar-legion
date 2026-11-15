import type { ReactNode } from 'react';
import { Sign } from './Sign';

// Controls of a settings row. `Segment` is a choice between a few: keys side by side, the chosen one lit.
// `Switch` is on or off: the pixel switch, read by assistive tech as a switch.

export interface SegmentItem {
  key: string | number;
  label: ReactNode;
  on: boolean;
  onPick: () => void;
}

/** A choice between a few. `names` letters the keys in the blackletter (for names of things, like languages). */
export function Segment({ items, names = false }: { items: readonly SegmentItem[]; names?: boolean }): React.JSX.Element {
  return (
    <div className={names ? 'tk-seg names' : 'tk-seg'}>
      {items.map((item) => (
        <button key={item.key} type="button" className={item.on ? 'on' : undefined} aria-pressed={item.on} onClick={item.onPick}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** On or off. `label` is what assistive tech reads. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }): React.JSX.Element {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="tk-switch" onClick={() => onChange(!on)}>
      <Sign name={on ? 'opt_switch_on' : 'opt_switch_off'} />
    </button>
  );
}

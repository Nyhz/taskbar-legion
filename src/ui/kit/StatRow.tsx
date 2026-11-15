import type { ReactNode } from 'react';
import { Sign } from './Sign';

// A stat as a sign and a number. What it is, and where it comes from, lives in its tooltip (`children`).

export interface StatRowProps {
  /** Art stem of the stat's sign (`stat_armor`). */
  sign: string;
  /** What the sign stands for (assistive tech). */
  alt: string;
  value: ReactNode;
  /** Something dim after the value (a derived figure: "−41 %"). */
  extra?: ReactNode;
  /** Colours the value: it just went up. */
  tone?: 'up';
  /** Leaves a gap above (the start of a group). */
  gap?: boolean;
  children?: ReactNode;
}

export function StatRow({
  sign,
  alt,
  value,
  extra,
  tone,
  gap = false,
  children,
}: StatRowProps): React.JSX.Element {
  return (
    <div className={`tk-stat${gap ? ' gap' : ''}${children !== undefined ? ' has' : ''}`}>
      <Sign name={sign} alt={alt} />
      <b className={tone}>
        {value}
        {extra !== undefined && <em>{extra}</em>}
      </b>
      {children}
    </div>
  );
}

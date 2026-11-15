import type { ReactNode } from 'react';

// A bar with stepped corners and a lit top row. `value` is 0–1; `tone` picks the fill; `children` is lettering
// drawn inside it.

export type BarTone = 'xp' | 'progress' | 'danger';

export function Bar({
  value,
  tone = 'xp',
  className,
  children,
}: {
  value: number;
  tone?: BarTone;
  className?: string;
  children?: ReactNode;
}): React.JSX.Element {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`tk-bar ${tone}${className === undefined ? '' : ` ${className}`}`}>
      <u style={{ width: `calc((100% - 2px) * ${pct / 100})` }} />
      {children !== undefined && <b>{children}</b>}
    </div>
  );
}

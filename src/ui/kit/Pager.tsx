import type { ReactNode } from 'react';

// Pages of a grid (a stash, a picker): a few pages are numbers, the shown one lit and underlined; more than
// `listed` of them is a stepper — "< 5 / 8 >" — so the line keeps its width. Anything passed as children sits
// after the pages on the same line (the stash's lock of the next page).

export interface PagerProps {
  /** The shown page, counted from 1. */
  page: number;
  pages: number;
  onPage: (page: number) => void;
  /** Up to this many pages are listed as numbers. 0 (the default) is always a stepper. */
  listed?: number;
  /** What assistive tech reads for page `n` (a number key, and the stepper's keys unless they have their own). */
  pageLabel: (n: number) => string;
  prevLabel?: string;
  nextLabel?: string;
  /** What assistive tech reads for the stepper's "5 / 8". */
  atLabel?: string;
  className?: string;
  children?: ReactNode;
}

export function Pager({
  page,
  pages,
  onPage,
  listed = 0,
  pageLabel,
  prevLabel,
  nextLabel,
  atLabel,
  className,
  children,
}: PagerProps): React.JSX.Element {
  const prev = Math.max(1, page - 1);
  const next = Math.min(pages, page + 1);
  return (
    <div className={className === undefined ? 'tk-pager' : `tk-pager ${className}`}>
      {pages <= listed ? (
        Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i + 1 === page ? 'on' : undefined}
            aria-label={pageLabel(i + 1)}
            aria-pressed={i + 1 === page}
            onClick={() => onPage(i + 1)}
          >
            {i + 1}
          </button>
        ))
      ) : (
        <>
          <button type="button" className="step" disabled={page <= 1} aria-label={prevLabel ?? pageLabel(prev)} onClick={() => onPage(prev)}>
            {'<'}
          </button>
          <span className="at" aria-label={atLabel ?? pageLabel(page)}>
            {page} / {pages}
          </span>
          <button type="button" className="step" disabled={page >= pages} aria-label={nextLabel ?? pageLabel(next)} onClick={() => onPage(next)}>
            {'>'}
          </button>
        </>
      )}
      {children}
    </div>
  );
}

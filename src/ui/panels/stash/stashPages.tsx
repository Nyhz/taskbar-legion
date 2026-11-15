import { useStore } from '@/state/store';
import { STASH_MAX_PAGES, stashPageCost } from '@/data/inventory';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { Chip, Tip, TipLine, TipText, TipTitle, TipWarn } from '@/ui/kit';
import { STASH_PAGES_LISTED } from './stashLayout';

// The stash's pages, in its footer: up to STASH_PAGES_LISTED owned pages as numbers (the shown one lit); more than
// that, a stepper ("‹ 5 / 8 ›") so the line still fits a six-cell wing. After them, the lock of the next page —
// its price is in the tooltip and a click buys it. Pages further ahead are not shown.

export function StashPages({
  shown,
  onPage,
}: {
  shown: number;
  onPage: (page: number) => void;
}): React.JSX.Element {
  const t = useT();
  const pages = useStore((s) => s.stashPages);
  const gold = useStore((s) => s.gold);
  const buyPage = useStore((s) => s.buyStashPage);
  const next = pages + 1;
  const cost = stashPageCost(next);
  const affordable = gold >= cost;
  return (
    <div className="tk-stash-pages">
      {pages <= STASH_PAGES_LISTED ? (
        Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            className={i + 1 === shown ? 'on' : undefined}
            aria-label={t('stash.page', { n: i + 1 })}
            aria-pressed={i + 1 === shown}
            onClick={() => onPage(i + 1)}
          >
            {i + 1}
          </button>
        ))
      ) : (
        <>
          <button
            type="button"
            className="step"
            disabled={shown <= 1}
            aria-label={t('stash.page', { n: Math.max(1, shown - 1) })}
            onClick={() => onPage(Math.max(1, shown - 1))}
          >
            {'<'}
          </button>
          <span className="at" aria-label={t('stash.page', { n: shown })}>
            {shown} / {pages}
          </span>
          <button
            type="button"
            className="step"
            disabled={shown >= pages}
            aria-label={t('stash.page', { n: Math.min(pages, shown + 1) })}
            onClick={() => onPage(Math.min(pages, shown + 1))}
          >
            {'>'}
          </button>
        </>
      )}
      {next <= STASH_MAX_PAGES && (
        <Chip
          sign="map_lock_s"
          label={t('stash.page', { n: next })}
          on={affordable}
          onClick={() => buyPage()}
          tip={
            <Tip side="above">
              <TipTitle>{t('stash.page', { n: next })}</TipTitle>
              <TipLine
                label={t('stash.price')}
                value={t('stash.goldAmount', { amount: format(cost) })}
                tone="gold"
              />
              {affordable ? (
                <TipText>{t('stash.pageBuy')}</TipText>
              ) : (
                <TipWarn>{t('stash.short', { amount: format(cost - gold) })}</TipWarn>
              )}
            </Tip>
          }
        />
      )}
    </div>
  );
}

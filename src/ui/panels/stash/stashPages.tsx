import { useStore } from '@/state/store';
import { STASH_MAX_PAGES, stashPageCost } from '@/data/inventory';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { Chip, Pager, Tip, TipLine, TipText, TipTitle, TipWarn } from '@/ui/kit';
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
    <Pager page={shown} pages={pages} onPage={onPage} listed={STASH_PAGES_LISTED} pageLabel={(n) => t('stash.page', { n })}>
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
    </Pager>
  );
}

import { useStore } from '@/state/store';
import { STASH_MAX_SLOTS, STASH_PER_PAGE, stashSlotCost } from '@/data/inventory';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { Key, Tip, TipLine, TipTitle, TipWarn } from '@/ui/kit';
import { StashPages } from './stashPages';

// The stash's footer, one line of a six-cell wing: its pages (the next one is bought there) and the key that buys
// one more slot on every page — a "+" and its price; what it is lives in its tooltip. It is greyed when the gold
// does not reach or every slot is bought.

export function StashFoot({
  page,
  onPage,
}: {
  page: number;
  onPage: (page: number) => void;
}): React.JSX.Element {
  const t = useT();
  const gold = useStore((s) => s.gold);
  const slotUpgrades = useStore((s) => s.stashSlotUpgrades);
  const buySlot = useStore((s) => s.buyStashSlot);
  const maxed = slotUpgrades >= STASH_MAX_SLOTS;
  const cost = stashSlotCost(slotUpgrades);
  const perPage = `${STASH_PER_PAGE + slotUpgrades} / ${STASH_PER_PAGE + STASH_MAX_SLOTS}`;

  return (
    <div className="tk-stash-foot">
      <StashPages shown={page} onPage={onPage} />
      <Key
        className="end"
        label={t('stash.slotTitle')}
        price={maxed ? undefined : format(cost)}
        disabled={maxed || gold < cost}
        onClick={buySlot}
        tip={
          <Tip side="above-end">
            <TipTitle>{t('stash.slotTitle')}</TipTitle>
            {!maxed && (
              <TipLine
                label={t('stash.price')}
                value={t('stash.goldAmount', { amount: format(cost) })}
                tone="gold"
              />
            )}
            <TipLine label={t('stash.slotsPerPage')} value={perPage} />
            {!maxed && gold < cost && <TipWarn>{t('stash.short', { amount: format(cost - gold) })}</TipWarn>}
          </Tip>
        }
      >
        {maxed ? t('stash.slotMax') : '+'}
      </Key>
    </div>
  );
}

import { useState } from 'react';
import { useStore } from '@/state/store';
import { STASH_PER_PAGE } from '@/data/inventory';
import { countFilled } from '@/sim/slots';
import { useT, type TextKey } from '@/i18n';
import { Chip, Head, Sign, Tip, TipTag, TipText, TipTitle, TipWarn, Title, Window } from '@/ui/kit';
import { StashGrid } from './StashGrid';
import { StashFoot } from './StashFoot';
import { STASH_FILTERS, stashLens, type StashFilter } from './stashLayout';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import './stash.css';

// The stash: paged overflow storage, a LEFT WING of the hero window — narrow and tall like every wing: six cells
// edge to edge, growing in rows as slots are bought. Top line: the name, the count and (while the bag is full) a
// red bag. Second line: the five filters and the sort. Then one page of the grid, and a one-line footer that
// turns pages (and buys the next one) and buys a slot per page. Its left edge carries the bookmarks of the left
// wings. Every rule is the store's.

const FILTER_SIGN: Record<StashFilter, string> = {
  all: 'bag_f_all',
  armor: 'stat_armor',
  weapon: 'stat_attackDamage',
  jewelry: 'bag_f_jewel',
  gems: 'ui_gem',
};
const FILTER_NAME: Record<StashFilter, TextKey> = {
  all: 'stash.filterAll',
  armor: 'stash.filterArmor',
  weapon: 'stash.filterWeapon',
  jewelry: 'stash.filterJewelry',
  gems: 'stash.filterGems',
};

export function StashWindow(): React.JSX.Element {
  const t = useT();
  const stash = useStore((s) => s.stash);
  const pages = useStore((s) => s.stashPages);
  const slotUpgrades = useStore((s) => s.stashSlotUpgrades);
  const cap = useStore((s) => s.stashCap());
  const bagFull = useStore((s) => countFilled(s.inventory) >= s.inventoryCap());
  const closePanel = useStore((s) => s.closePanel);
  const sortStash = useStore((s) => s.sortStash);
  const [filter, setFilter] = useState<StashFilter>('all');
  const [page, setPage] = useState(1);

  const perPage = STASH_PER_PAGE + slotUpgrades;
  const shownPage = Math.min(page, pages);
  const held = countFilled(stash);
  const full = held >= cap;

  const wings = useWingTabs('left');

  return (
    <Window
      id="panel-stash"
      closeLabel={t('stash.close')}
      onClose={() => closePanel('stash')}
      tabs={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      <Head>
        <Title>{t('stash.title')}</Title>
        <span className={`note tk-stash-count has${full ? ' bad' : ''}`}>
          {held} / {cap}
          <Tip side="below">
            <TipTitle>{t('stash.title')}</TipTitle>
            <TipText>{t('stash.howTo')}</TipText>
            {full && <TipWarn>{t('stash.full')}</TipWarn>}
          </Tip>
        </span>
        {bagFull && (
          <span className="tk-stash-bagfull has">
            <Sign name="bag_pack" alt={t('stash.bagFull')} />!
            <Tip side="below">
              <TipWarn>{t('stash.bagFull')}</TipWarn>
            </Tip>
          </span>
        )}
      </Head>
      <div className="tk-stash-filters">
        {STASH_FILTERS.map((f) => (
          <Chip
            key={f}
            sign={FILTER_SIGN[f]}
            label={t(FILTER_NAME[f])}
            on={filter === f}
            onClick={() => setFilter(f)}
            tip={<TipTag side="below">{t(FILTER_NAME[f])}</TipTag>}
          />
        ))}
        <span className="end">
          <Chip
            sign="btn_sort"
            label={t('stash.sort')}
            onClick={sortStash}
            tip={<TipTag side="below-end">{t('stash.sort')}</TipTag>}
          />
        </span>
      </div>
      <StashGrid
        shown={stashLens(stash, filter)}
        filter={filter}
        start={(shownPage - 1) * perPage}
        perPage={perPage}
        bagFull={bagFull}
      />
      <StashFoot page={shownPage} onPage={setPage} />
    </Window>
  );
}

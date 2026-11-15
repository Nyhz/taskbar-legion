import { useState } from 'react';
import { isGem, isItem, type InvEntry } from '@/sim/items';
import { useT } from '@/i18n';
import { Pager, Sign, SlotGrid } from '@/ui/kit';
import { ItemCell } from '../items/ItemCell';
import { PICK_COLS, PICK_PER_PAGE } from './cubeLayout';
import { pageOf } from './cubeLogic';

// Where the Cube's pieces come from: the entries of the bag (and of the stash, when a recipe asks for it) that
// the recipe can take, six cells across. Click one to load it, click it again to take it out; the loaded ones
// carry the gold brackets and the ones that cannot join what is loaded step back. More than a page → pages.

export function CubePicker<T extends InvEntry>({
  label,
  pool,
  selected,
  isOff,
  onPick,
}: {
  /** Where they come from, in words ("Bag", "Bag and stash"). */
  label: string;
  pool: readonly T[];
  selected: readonly string[];
  /** Cannot be loaded now (it stays visible, dimmed). */
  isOff?: (entry: T) => boolean;
  onPick: (entry: T) => void;
}): React.JSX.Element {
  const t = useT();
  const [wanted, setWanted] = useState(0);
  const { shown, pages, page } = pageOf(pool, wanted, PICK_PER_PAGE);

  return (
    <>
      <div className="tk-cube-pick-head">
        <Sign name="bag_pack" />
        {label}
        {pages > 1 && (
          <Pager
            className="end"
            page={page + 1}
            pages={pages}
            onPage={(n) => setWanted(n - 1)}
            pageLabel={(n) => t('cube.page', { n, total: pages })}
            prevLabel={t('cube.prevPage')}
            nextLabel={t('cube.nextPage')}
          />
        )}
      </div>
      {pool.length === 0 ? (
        <p className="tk-cube-note">{t('cube.nothing')}</p>
      ) : (
        <SlotGrid cols={PICK_COLS} className="tk-cube-pick">
          {shown.map((entry) => {
            const loaded = selected.includes(entry.id);
            const off = !loaded && isOff?.(entry) === true;
            const cell = (
              <ItemCell
                key={entry.id}
                item={isItem(entry) ? entry : null}
                gem={isGem(entry) ? entry : undefined}
                selected={loaded}
                onClick={off ? undefined : () => onPick(entry)}
              />
            );
            return off ? (
              <div key={entry.id} className="tk-cube-off">
                {cell}
              </div>
            ) : (
              cell
            );
          })}
        </SlotGrid>
      )}
    </>
  );
}

import { useState } from 'react';
import { useStore } from '@/state/store';
import { CUBE_INPUT_COUNT, alchemyTotal } from '@/sim/cube';
import { isItem, type ItemInstance } from '@/sim/items';
import { entries } from '@/sim/slots';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { Key, Rule, Sign, Tip, TipText } from '@/ui/kit';
import { AutoMelt } from './AutoMelt';
import { CubeFace } from './CubeFace';
import { CubePicker } from './CubePicker';
import { fillMelt, toggleMelt } from './cubeLogic';

// Melt (alchemy): pieces of the bag — any rarities together, up to nine at a time — become gold; each is worth
// more the rarer and the higher its level. Gems are not melted.

export function MeltRecipe(): React.JSX.Element {
  const t = useT();
  const items = entries(useStore((s) => s.inventory)).filter(isItem);
  const cubeAlchemy = useStore((s) => s.cubeAlchemy);
  const [selected, setSelected] = useState<string[]>([]);
  const [said, setSaid] = useState<string | null>(null);

  const loaded = selected
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is ItemInstance => i !== undefined);
  const total = alchemyTotal(loaded);
  const full = loaded.length >= CUBE_INPUT_COUNT;
  const toggle = (item: ItemInstance): void => {
    setSaid(null);
    setSelected((cur) => toggleMelt(cur, item.id));
  };
  const melt = (): void => {
    if (loaded.length === 0) return;
    const gold = cubeAlchemy(loaded.map((i) => i.id));
    setSaid(t('cube.melted', { n: loaded.length, gold: format(gold) }));
    setSelected([]);
  };

  return (
    <>
      <div className="tk-cube-eq">
        {t('cube.eqMeltIn')}
        <Sign name="cube_arrow" />
        <Sign name="ui_gold" />
        {t('cube.eqMeltOut')}
      </div>
      <div className="tk-cube-work">
        <CubeFace loaded={loaded} onRemove={toggle} />
        <Sign name="cube_arrow" />
        <div className="tk-cube-out">
          <div className="tk-cube-total has">
            <Sign name="ui_gold" />
            <span>{format(total)}</span>
            <Tip side="left" size="tag">
              <div className="hd solo">{t('cube.total')}</div>
            </Tip>
          </div>
          <span className={`tk-cube-count has${full ? ' full' : ''}`}>
            {loaded.length} / {CUBE_INPUT_COUNT}
            <Tip side="left" size="tag">
              <div className="hd solo">{t('cube.loaded')}</div>
            </Tip>
          </span>
        </div>
      </div>
      <div className="tk-cube-keys">
        <Key
          disabled={items.length === 0}
          onClick={() => {
            setSaid(null);
            setSelected(fillMelt(items));
          }}
          tip={
            <Tip side="below">
              <TipText>{t('cube.fillMeltHelp')}</TipText>
            </Tip>
          }
        >
          {t('cube.fill')}
        </Key>
        <span className="end">
          <Key tone="gold" disabled={loaded.length === 0} onClick={melt}>
            {t('cube.melt')}
          </Key>
        </span>
      </div>
      {said !== null && <p className="tk-cube-note good">{said}</p>}
      <AutoMelt />
      <Rule />
      <CubePicker
        label={t('cube.fromBag')}
        pool={items}
        selected={selected}
        isOff={() => full}
        onPick={toggle}
      />
    </>
  );
}

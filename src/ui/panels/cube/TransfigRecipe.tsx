import { useState } from 'react';
import { useStore } from '@/state/store';
import {
  canTransfigure,
  transfigCostOptions,
  transfigPool,
  transfigureRoll,
  type TransfigCost,
} from '@/sim/cube';
import { isGem, isItem, type ItemInstance } from '@/sim/items';
import { entries } from '@/sim/slots';
import type { StatKey } from '@/data/stats';
import type { GemInstance } from '@/data/gems';
import type { ItemTier } from '@/data/tiers';
import { statLabel, tierName, useT } from '@/i18n';
import { Key, Sign, art } from '@/ui/kit';
import { ItemCell } from '../items/ItemCell';
import { itemKindName, statGain } from '../items/itemText';
import { CubePicker } from './CubePicker';

// Transfigure: change ONE affix of a piece into a different stat, paid with gems of the bag (one of the piece's
// rarity, or two of the rarity below; any colours). Once per piece. Three steps, top to bottom: the piece, the
// affix, the payment. The gems are spent and the piece is branded when the key is pressed; then the player keeps
// the new affix or the old one.

interface Pending {
  itemId: string;
  affixIndex: number;
  oldStat: { key: StatKey; value: number };
  newStat: { key: StatKey; value: number; perfect?: boolean };
}

function Affix({
  stat,
  tag,
  perfect,
}: {
  stat: { key: StatKey; value: number };
  tag?: string;
  perfect?: boolean;
}): React.JSX.Element {
  const t = useT();
  return (
    <div className="tk-cube-aff still">
      <Sign name={`stat_${stat.key}`} />
      <b>{statGain(stat.key, stat.value)}</b>
      <span>
        {statLabel(stat.key)}
        {perfect === true && (
          <img src={art('mark_star')} alt={t('cube.perfect')} style={{ display: 'inline', marginLeft: 3 }} />
        )}
        {tag !== undefined && <span className="tag"> · {tag}</span>}
      </span>
    </div>
  );
}

export function TransfigRecipe(): React.JSX.Element {
  const t = useT();
  const bag = entries(useStore((s) => s.inventory));
  const cubeTransfigure = useStore((s) => s.cubeTransfigure);
  const cubeApplyTransfigure = useStore((s) => s.cubeApplyTransfigure);
  const [itemId, setItemId] = useState<string | null>(null);
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  const [costIdx, setCostIdx] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  const gear = bag.filter(isItem);
  const gems = bag.filter(isGem);
  const item = gear.find((i) => i.id === itemId) ?? null;
  const gemsAt = (tier: number): GemInstance[] => gems.filter((g) => g.tier === tier);
  const options: { cost: TransfigCost; have: number }[] =
    item === null ? [] : transfigCostOptions(item).map((cost) => ({ cost, have: gemsAt(cost.tier).length }));
  const chosen = options[costIdx] ?? null;
  const pay = chosen === null ? [] : gemsAt(chosen.cost.tier).slice(0, chosen.cost.count);
  const afford = chosen !== null && pay.length === chosen.cost.count;
  const canDo =
    item !== null && affixIndex !== null && afford && pending === null && canTransfigure(item, pay);

  const pick = (piece: ItemInstance): void => {
    setSaid(null);
    setPending(null);
    setAffixIndex(null);
    setItemId(piece.id);
    // Start on the first payment the bag can afford.
    const idx = transfigCostOptions(piece).findIndex((o) => gemsAt(o.tier).length >= o.count);
    setCostIdx(idx >= 0 ? idx : 0);
  };
  const transfigure = (): void => {
    if (item === null || affixIndex === null || !afford) return;
    const oldStat = item.stats[affixIndex];
    const newStat = transfigureRoll(item, affixIndex);
    if (oldStat === undefined || newStat === null) return;
    const spent = cubeTransfigure(
      item.id,
      pay.map((g) => g.id),
      affixIndex,
    );
    if (spent) setPending({ itemId: item.id, affixIndex, oldStat, newStat });
  };
  const finish = (line: string): void => {
    setPending(null);
    setAffixIndex(null);
    setItemId(null);
    setSaid(line);
  };

  const equation = (
    <div className="tk-cube-eq">
      {t('cube.eqTransfigIn')}
      <Sign name="cube_arrow" />
      {t('cube.eqTransfigOut')}
      <span className="end">
        <Sign name="ui_gem" />
      </span>
    </div>
  );
  const step = (n: number, words: string): React.JSX.Element => (
    <div className="tk-cube-step">
      <u>{n}</u>
      {words}
    </div>
  );

  if (item === null) {
    return (
      <>
        {equation}
        {step(1, t('cube.stepPiece'))}
        {said !== null && <p className="tk-cube-note good">{said}</p>}
        <p className="tk-cube-note">{t('cube.pickPiece')}</p>
        <CubePicker
          label={t('cube.fromBag')}
          pool={gear}
          selected={[]}
          isOff={(i) => i.transfigured === true}
          onPick={pick}
        />
      </>
    );
  }

  const piece = (
    <div className="tk-cube-piece">
      <ItemCell item={item} selected onClick={pending === null ? () => setItemId(null) : undefined} />
      <span className="name" style={{ color: `var(--t${item.tier})` }}>
        {itemKindName(item)}
      </span>
    </div>
  );

  if (pending !== null) {
    return (
      <>
        {equation}
        {piece}
        <div className="tk-cube-step">{t('cube.before')}</div>
        <Affix stat={pending.oldStat} />
        <div className="tk-cube-step">{t('cube.after')}</div>
        <Affix stat={pending.newStat} perfect={pending.newStat.perfect} />
        <div className="tk-cube-keys">
          <Key onClick={() => finish(t('cube.keptOld'))}>{t('cube.keepOld')}</Key>
          <span className="end">
            <Key
              tone="gold"
              onClick={() => {
                cubeApplyTransfigure(pending.itemId, pending.affixIndex);
                finish(t('cube.keptNew'));
              }}
            >
              {t('cube.keepNew')}
            </Key>
          </span>
        </div>
      </>
    );
  }

  const blocked =
    item.transfigured === true
      ? t('cube.already')
      : item.stats.length === 0
        ? t('cube.noAffix')
        : transfigPool(item).length === 0
          ? t('cube.noPool')
          : null;

  return (
    <>
      {equation}
      {step(1, t('cube.stepPiece'))}
      {piece}
      {blocked !== null ? (
        <>
          <p className="tk-cube-note warn">{blocked}</p>
          <p className="tk-cube-note">{t('cube.changePiece')}</p>
        </>
      ) : (
        <>
          {step(2, t('cube.stepAffix'))}
          {item.stats.map((stat, i) => (
            <button
              key={i}
              type="button"
              className={`tk-cube-aff${affixIndex === i ? ' on' : ''}`}
              aria-pressed={affixIndex === i}
              onClick={() => setAffixIndex(i)}
            >
              <Sign name={`stat_${stat.key}`} />
              <b>{statGain(stat.key, stat.value)}</b>
              <span>{statLabel(stat.key)}</span>
            </button>
          ))}
          {step(3, t('cube.stepPay'))}
          <div className="tk-cube-pays">
            {options.map((o, i) => (
              <button
                key={i}
                type="button"
                className={`tk-cube-pay${o.have >= o.cost.count ? ' ok' : ''}${i === costIdx ? ' on' : ''}`}
                aria-pressed={i === costIdx}
                onClick={() => setCostIdx(i)}
              >
                <span>
                  <img src={art(`cube_pip_${o.cost.tier}`)} alt="" />
                  {t('cube.gemsOf', { n: o.cost.count, rarity: tierName(o.cost.tier as ItemTier) })}
                </span>
                <i>{t('cube.have', { n: o.have })}</i>
              </button>
            ))}
          </div>
          {!afford && <p className="tk-cube-note warn">{t('cube.noGems')}</p>}
          <div className="tk-cube-keys">
            <span className="end">
              <Key tone="gold" disabled={!canDo} onClick={transfigure}>
                {t('cube.transfig')}
              </Key>
            </span>
          </div>
        </>
      )}
    </>
  );
}

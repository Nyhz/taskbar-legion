import { useState } from 'react';
import { playSound } from '@/audio/soundEngine';
import { useStore } from '@/state/store';
import { canPolishAffix, polishCost, polishCount } from '@/sim/cube';
import { isItem, type AffixRoll, type ItemInstance } from '@/sim/items';
import { entries } from '@/sim/slots';
import { format } from '@/sim/num';
import { statLabel, useT } from '@/i18n';
import { Key, Sign, art } from '@/ui/kit';
import { ItemCell } from '../items/ItemCell';
import { itemKindName, statGain } from '../items/itemText';
import { CubePicker } from './CubePicker';

// Polish: roll the VALUE of one affix of a piece again (the stat stays), paid in gold — the late-game gold sink.
// Every polish of the same piece costs ×1.5 the last; a perfect (★) affix can't be polished. Three steps, top to
// bottom: the piece, the affix, the price. The gold is spent when the key is pressed; then the player keeps the
// old value or the new one, and the piece stays loaded to polish again.

interface Pending {
  itemId: string;
  affixIndex: number;
  oldStat: AffixRoll;
  newStat: AffixRoll;
}

function Affix({ stat }: { stat: AffixRoll }): React.JSX.Element {
  const t = useT();
  return (
    <div className="tk-cube-aff still">
      <Sign name={`stat_${stat.key}`} />
      <b>{statGain(stat.key, stat.value)}</b>
      <span>
        {statLabel(stat.key)}
        {stat.perfect === true && (
          <img src={art('mark_star')} alt={t('cube.perfect')} style={{ display: 'inline', marginLeft: 3 }} />
        )}
      </span>
    </div>
  );
}

export function PolishRecipe(): React.JSX.Element {
  const t = useT();
  const bag = entries(useStore((s) => s.inventory));
  const gold = useStore((s) => s.gold);
  const cubePolish = useStore((s) => s.cubePolish);
  const cubeApplyPolish = useStore((s) => s.cubeApplyPolish);
  const [itemId, setItemId] = useState<string | null>(null);
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  const gear = bag.filter(isItem);
  const item = gear.find((i) => i.id === itemId) ?? null;
  const cost = item === null ? 0 : polishCost(item);
  const afford = gold >= cost;
  const canDo = item !== null && affixIndex !== null && afford && pending === null && canPolishAffix(item, affixIndex);

  const pick = (piece: ItemInstance): void => {
    setSaid(null);
    setPending(null);
    setAffixIndex(null);
    setItemId(piece.id);
  };
  const polish = (): void => {
    if (item === null || affixIndex === null) return;
    const oldStat = item.stats[affixIndex];
    const newStat = cubePolish(item.id, affixIndex);
    if (oldStat === undefined || newStat === null) return;
    setPending({ itemId: item.id, affixIndex, oldStat, newStat });
    playSound(newStat.perfect === true ? 'cube_perfect' : 'cube_polish');
  };
  const finish = (line: string): void => {
    setPending(null);
    setSaid(line);
  };

  const equation = (
    <div className="tk-cube-eq">
      <Sign name="ui_gold" />
      <Sign name="cube_arrow" />
      {t('cube.eqPolishOut')}
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
        <p className="tk-cube-note">{t('cube.pickPiece')}</p>
        <CubePicker
          label={t('cube.fromBag')}
          pool={gear}
          selected={[]}
          isOff={(i) => i.stats.every((s) => s.perfect === true)}
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
        <Affix stat={pending.newStat} />
        <div className="tk-cube-keys">
          <Key onClick={() => finish(t('cube.keptOldValue'))}>{t('cube.keepOld')}</Key>
          <span className="end">
            <Key
              tone="gold"
              onClick={() => {
                cubeApplyPolish(pending.itemId, pending.affixIndex);
                finish(t('cube.keptNewValue'));
              }}
            >
              {t('cube.keepNew')}
            </Key>
          </span>
        </div>
      </>
    );
  }

  const polished = polishCount(item);
  return (
    <>
      {equation}
      {step(1, t('cube.stepPiece'))}
      {piece}
      {item.stats.length === 0 ? (
        <>
          <p className="tk-cube-note warn">{t('cube.noAffix')}</p>
          <p className="tk-cube-note">{t('cube.changePiece')}</p>
        </>
      ) : (
        <>
          {step(2, t('cube.stepPolishAffix'))}
          {item.stats.map((stat, i) => {
            const open = canPolishAffix(item, i);
            return (
              <button
                key={i}
                type="button"
                className={`tk-cube-aff${affixIndex === i ? ' on' : ''}${open ? '' : ' still'}`}
                aria-pressed={affixIndex === i}
                disabled={!open}
                onClick={() => setAffixIndex(i)}
              >
                <Sign name={`stat_${stat.key}`} />
                <b>{statGain(stat.key, stat.value)}</b>
                <span>
                  {statLabel(stat.key)}
                  {!open && <img src={art('mark_star')} alt={t('cube.perfect')} style={{ display: 'inline', marginLeft: 3 }} />}
                </span>
              </button>
            );
          })}
          {step(3, t('cube.stepPrice'))}
          <div className="tk-cube-pays">
            <div className={`tk-cube-pay on${afford ? ' ok' : ''}`}>
              <span>
                <Sign name="ui_gold" />
                {format(cost)}
              </span>
              <i>{t('cube.have', { n: format(Math.floor(gold)) })}</i>
            </div>
          </div>
          <p className="tk-cube-note">
            {polished === 0 ? t('cube.polishFirst') : t('cube.polishedTimes', { n: polished })}
          </p>
          {!afford && <p className="tk-cube-note warn">{t('cube.noGold')}</p>}
          {said !== null && <p className="tk-cube-note good">{said}</p>}
          <div className="tk-cube-keys">
            <span className="end">
              <Key tone="gold" disabled={!canDo} onClick={polish}>
                {t('cube.polish')}
              </Key>
            </span>
          </div>
        </>
      )}
    </>
  );
}

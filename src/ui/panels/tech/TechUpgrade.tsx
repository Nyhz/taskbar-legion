import type { TechNode } from '@/data/techTree';
import { techDescription, techName, useT } from '@/i18n';
import { Sign, SlimKey, Tip, TipLine, TipName, TipNote, TipRule, TipText, TipWarn, type TipSide } from '@/ui/kit';
import { factorText, figureText, goldText, techFigure, techState, type TechFigure } from './techFigures';

// One upgrade: its sign on a round seal (dark while unbought, brass once owned, bright when complete), what it
// gives now, and the key with the price of the next rank — a click on it buys one rank. Everything else (name,
// what a rank adds, rank, now → next, the exact cost, what is missing, how the price grows) is in the tooltip.

export function TechUpgrade({
  node,
  rank,
  gold,
  onBuy,
  tipSide,
}: {
  node: TechNode;
  rank: number;
  gold: number;
  onBuy: () => void;
  tipSide: TipSide;
}): React.JSX.Element {
  const t = useT();
  const state = techState(node, rank, gold);
  const name = techName(node.key);
  const now = techFigure(node, rank);
  const next = techFigure(node, rank + 1);
  const capped = Number.isFinite(node.maxRanks);

  // The figure with its unit, for the tooltip: "11 slots", "3 heroes", "every 9:45".
  const spelled = (figure: TechFigure): string => {
    switch (figure.kind) {
      case 'slots':
        return t('tech.unitSlots', { n: figure.count });
      case 'heroes':
        return t('tech.unitHeroes', { n: figure.count });
      case 'every':
        return t('tech.unitEvery', { time: figureText(figure) });
      case 'locked':
        return t('tech.locked');
      case 'gain':
      case 'share':
        return figureText(figure);
    }
  };

  return (
    <div className={`tk-tech-node has${rank === 0 ? ' new' : ''}${state.maxed ? ' max' : ''}`}>
      <div className="tk-tech-seal">
        <Sign name={`tech_${node.key}`} alt={name} />
      </div>
      <b>{figureText(now)}</b>
      {state.maxed ? (
        <Sign name="tech_done" alt={t('tech.complete')} className="tk-tech-done" />
      ) : (
        <SlimKey
          className="tk-tech-buy"
          label={t('tech.buy', { name, amount: goldText(state.cost) })}
          disabled={!state.affordable}
          onClick={onBuy}
        >
          {goldText(state.cost)}
        </SlimKey>
      )}
      <Tip side={tipSide} size="item">
        <TipName tone="gold">{name}</TipName>
        <TipText>{techDescription(node.key)}</TipText>
        <TipRule />
        <TipLine label={t('tech.rank')} value={capped ? `${rank} / ${node.maxRanks}` : String(rank)} />
        <TipLine label={t('tech.now')} value={spelled(now)} />
        {state.maxed ? (
          <TipNote>{t('tech.complete')}</TipNote>
        ) : (
          <>
            <TipLine label={t('tech.next')} value={spelled(next)} tone="good" />
            <TipLine label={t('tech.cost')} value={goldText(state.cost)} tone="gold" />
            {state.short > 0 && <TipWarn>{t('tech.short', { amount: goldText(state.short) })}</TipWarn>}
            <TipNote>{t('tech.growth', { factor: factorText(node.costGrowth) })}</TipNote>
            {state.affordable && <TipNote>{t('tech.buyHint')}</TipNote>}
          </>
        )}
      </Tip>
    </div>
  );
}

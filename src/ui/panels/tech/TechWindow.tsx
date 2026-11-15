import { useStore } from '@/state/store';
import { techCategoryName, useT, type TextKey } from '@/i18n';
import { Gold, Head, Sign, TipTag, Title, Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { goldText } from './techFigures';
import { TECH_COLS, techGroups, type TechGroupKey } from './techLayout';
import { TechUpgrade } from './TechUpgrade';
import './tech.css';

// Upgrades — the tech panel: the game's main gold sink, a flat catalogue of non-combat upgrades bought rank by
// rank (cost = baseCost · costGrowth^rank; the store's buyTech). A RIGHT WING of the hero window, narrow and tall
// like every wing: the purse once at the top, then every upgrade at a glance in rows of three, a group per row
// with its sign in the gutter. Its right edge carries the bookmarks of the right wings. Tooltips open to the
// left, over the hero window.

const GROUP_SIGN: Record<TechGroupKey, string> = {
  economy: 'tech_cat_economy',
  drops: 'tech_cat_drops',
  storage: 'tech_cat_storage',
  utility: 'tech_cat_utility',
};

// The two halves of the data's "Chests" category have names of their own; the others use the category's.
const GROUP_NAME: Partial<Record<TechGroupKey, TextKey>> = {
  drops: 'tech.groupDrops',
  storage: 'tech.groupStorage',
};

export function TechWindow(): React.JSX.Element {
  const t = useT();
  const gold = useStore((s) => s.gold);
  const techRanks = useStore((s) => s.techRanks);
  const buyTech = useStore((s) => s.buyTech);
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('right');
  const groups = techGroups();

  const groupName = (key: TechGroupKey): string => {
    const own = GROUP_NAME[key];
    if (own !== undefined) return t(own);
    return techCategoryName(key === 'economy' ? 'Economy' : 'Utility');
  };

  let row = 0; // rows from the top, to open the lower tooltips upwards
  const rows = groups.reduce((n, g) => n + Math.ceil(g.nodes.length / TECH_COLS), 0);

  return (
    <Window
      id="panel-tech"
      closeLabel={t('tech.close')}
      onClose={() => closePanel('tech')}
      tabsRight={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      <Head>
        <Title>{t('tech.title')}</Title>
        <div className="end tk-tech-purse">
          <Gold tip={<TipTag side="below-end">{t('tech.gold')}</TipTag>}>{goldText(gold)}</Gold>
        </div>
      </Head>
      <div className="tk-tech-grid">
        {groups.map((group) => {
          const first = row;
          row += Math.ceil(group.nodes.length / TECH_COLS);
          return (
            <div key={group.key} className="tk-tech-group">
              <div className="tk-tech-mark has">
                <Sign name={GROUP_SIGN[group.key]} alt={groupName(group.key)} />
                <TipTag side="left">{groupName(group.key)}</TipTag>
              </div>
              {group.nodes.map((node, i) => {
                const at = first + Math.floor(i / TECH_COLS);
                return (
                  <TechUpgrade
                    key={node.key}
                    node={node}
                    rank={techRanks[node.key] ?? 0}
                    gold={gold}
                    onBuy={() => buyTech(node.key)}
                    tipSide={at >= rows / 2 ? 'left-up' : 'left'}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </Window>
  );
}

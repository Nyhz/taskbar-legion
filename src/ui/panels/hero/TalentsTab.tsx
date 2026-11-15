import { useStore } from '@/state/store';
import { talentTree } from '@/data/talents';
import { MAX_LEVEL } from '@/data/stageScaling';
import { aggregate } from '@/sim/stats';
import { equipmentMods, heroBaseStats, talentPassiveMods } from '@/sim/loadout';
import { MAX_ACTIVE_ABILITIES, canSpend, learnedAbilityNodes, spentPoints } from '@/sim/talentRules';
import { getBonuses } from '@/sim/bonuses';
import { useT } from '@/i18n';
import { Head, Key, Sign, Tip, TipLine, TipText, TipTitle, Title, type TipSide } from '@/ui/kit';
import { classCrestStem } from '@/ui/itemArt';
import { TalentsTabNode } from './TalentsTabNode';
import { layoutTalentTree, spentBarFill, type PlacedNode } from './talentsLayout';
import './TalentsTab.css';

// The talents wing's content. It shows the class tree (data/talents: ten tiers, tier N opens at (N−1)·10 points
// spent; a common trunk, then two branches side by side and their capstones) laid out top to bottom, one row
// per tier — see talentsLayout. Left-click raises a node, right-click lowers it; the ranked abilities ARE the
// active ones, at most MAX_ACTIVE_ABILITIES: once that many are learned, every other ability is disabled.
// Giving every point back is free. Nothing here decides a rule: sim/talentRules.canSpend says whether a node
// can be raised (and why not), and the store's spendTalent / refundTalent apply it.

/** Tooltips open over the hero window (to the right), upwards from the lower half of the tree. */
function tipSide(p: PlacedNode, height: number): TipSide {
  return p.y > height / 2 ? 'right-up' : 'right';
}

export function TalentsTab({ heroId }: { heroId: string }): React.JSX.Element | null {
  const t = useT();
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const spendTalent = useStore((s) => s.spendTalent);
  const refundTalent = useStore((s) => s.refundTalent);
  const respec = useStore((s) => s.respec);
  if (hero === undefined) return null;

  const layout = layoutTalentTree(talentTree(hero.classKey));
  const spent = spentPoints(hero.talents);
  const learned = learnedAbilityNodes(hero.classKey, hero.talents).length;
  const mods = [
    ...equipmentMods(hero.equipment),
    ...talentPassiveMods(hero.classKey, hero.talents),
    ...getBonuses(techRanks, ownedPets).combatMods,
  ];
  const stats = aggregate(heroBaseStats(hero.classKey, hero.level), mods);
  const nextTier = layout.tiers.find((tier) => tier.need > spent);
  const crest = classCrestStem(hero.classKey);

  const renderNode = (p: PlacedNode): React.JSX.Element => (
    <TalentsTabNode
      key={p.node.key}
      classKey={hero.classKey}
      talents={hero.talents}
      placed={p}
      check={canSpend(hero.classKey, hero.talents, hero.talentPoints, p.node.key)}
      stats={stats}
      side={tipSide(p, layout.height)}
      onSpend={() => spendTalent(hero.id, p.node.key)}
      onRefund={() => refundTalent(hero.id, p.node.key)}
    />
  );

  return (
    <div>
      <Head>
        <Title>{t('hud.panelTalents')}</Title>
        <div className="end">
          <Key
            sign="tal_respec"
            label={t('talents.respec')}
            disabled={spent === 0}
            onClick={() => respec(hero.id)}
            tip={
              <Tip side="below-end">
                <TipTitle>{t('talents.respec')}</TipTitle>
                <TipText>{t('talents.respecHelp')}</TipText>
              </Tip>
            }
          />
        </div>
      </Head>
      <div className="tk-tal-line">
        {crest !== undefined && <Sign name={crest} />}
        <div className="tk-tal-slots has">
          <Sign name="tab_skills" alt={t('talents.actives')} />
          {Array.from({ length: MAX_ACTIVE_ABILITIES }, (_, i) => (
            <u key={i} className={i < learned ? 'on' : undefined} />
          ))}
          <Tip side="below">
            <TipTitle>{t('talents.actives')}</TipTitle>
            <TipLine label={t('talents.activesInUse')} value={`${learned} / ${MAX_ACTIVE_ABILITIES}`} />
            <TipText>{t('talents.activesHelp', { max: MAX_ACTIVE_ABILITIES })}</TipText>
          </Tip>
        </div>
        <div className={`tk-tal-free end has${hero.talentPoints > 0 ? '' : ' none'}`}>
          <Sign name="tal_point" alt={t('talents.points')} />
          {hero.talentPoints}
          <Tip side="below-end">
            <TipTitle>{t('talents.points')}</TipTitle>
            <TipLine label={t('talents.pointsToSpend')} value={hero.talentPoints} />
            <TipLine label={t('talents.pointsSpent')} value={spent} />
            <TipText>{t('talents.pointsHelp')}</TipText>
          </Tip>
        </div>
      </div>
      <div className="tk-tal-tree" style={{ width: layout.width, height: layout.height }}>
        {layout.tiers
          .filter((tier) => tier.need > spent)
          .map((tier) => (
            <span
              key={tier.tier}
              className={`tk-tal-need${tier === nextTier ? ' next' : ''}`}
              style={{ top: tier.y + Math.floor((tier.height - 10) / 2) }}
            >
              {tier.need}
            </span>
          ))}
        <div className="tk-tal-bar" style={{ height: layout.height }}>
          <u style={{ height: Math.round(spentBarFill(spent, layout, MAX_LEVEL)) }} />
          {layout.tiers.slice(1).map((tier) => (
            <i key={tier.tier} style={{ top: tier.y }} />
          ))}
        </div>
        {layout.nodes.map(renderNode)}
      </div>
    </div>
  );
}

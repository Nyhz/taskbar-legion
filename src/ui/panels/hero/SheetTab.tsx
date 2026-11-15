import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { aggregate } from '@/sim/stats';
import { equipmentMods, heroBaseStats, talentPassiveMods } from '@/sim/loadout';
import { effectStatMods } from '@/sim/effects';
import { getBonuses } from '@/sim/bonuses';
import { chestDropChance } from '@/sim/chests';
import { format } from '@/sim/num';
import { CHEST_TYPES, type ChestType } from '@/data/chests';
import { effectDef } from '@/data/effects';
import { chestName, effectName, useT } from '@/i18n';
import { Head, Rule, Sign, Tip, TipLine, TipTag, TipText, TipTitle, Title, type TipSide } from '@/ui/kit';
import { classCrestStem } from '@/ui/itemArt';
import { SheetStats } from './SheetStats';
import { bonusFigure, chanceFigure, effectArtStem, shareFigure } from './sheetFigures';
import './SheetTab.css';

// The sheet wing's content (two columns: the wing is narrow): everything the hero and the account have, as figures. Effective stats are
// derived (never stored) exactly like combat does — gear + talents + account bonuses + the LIVE effects on the
// sim combatant, so a buff such as Stone Skin shows while it is up — then the account-wide economy and chest
// figures (upgrades + pets), and the effects running now. It follows the sim clock a few times a second.

const CHEST_SIGN: Record<ChestType, string> = {
  normal: 'tech_chest_drop_normal',
  stageBoss: 'tech_chest_drop_stage',
  zoneBoss: 'hud_chest_world',
};

export function SheetTab({ heroId }: { heroId: string }): React.JSX.Element | null {
  const t = useT();
  useStore((s) => Math.floor(s.hud.clockMs / 250)); // live life and effects: refresh four times a second
  const stage = useStore((s) => s.hud.globalStage);
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  if (hero === undefined) return null;

  const combatant = getEngine()?.world.heroes.find((h) => h.id === hero.id);
  const effects = combatant?.effects ?? [];
  const bonuses = getBonuses(techRanks, ownedPets);
  const stats = aggregate(heroBaseStats(hero.classKey, hero.level), [
    ...equipmentMods(hero.equipment),
    ...talentPassiveMods(hero.classKey, hero.talents),
    ...bonuses.combatMods,
    ...effectStatMods(effects),
  ]);
  const crest = classCrestStem(hero.classKey);

  return (
    <div className="tk-sheet">
      <Head>
        {crest !== undefined && <Sign name={crest} />}
        <Title>{t('hud.panelSheet')}</Title>
        {combatant !== undefined && (
          <div className="end">
            <div className="tk-sheet-hp has">
              <Sign name="stat_health" alt={t('talents.sheetLifeNow')} />
              {format(Math.round(combatant.hp))} / {format(Math.round(combatant.maxHp))}
              <TipTag side="below-end">{t('talents.sheetLifeNow')}</TipTag>
            </div>
          </div>
        )}
      </Head>
      <SheetStats stats={stats} stage={stage} />
      <Rule />
      <div className="tk-sheet-accts">
        <Account
          sign="tech_eco_gold"
          name={t('talents.sheetGold')}
          value={bonusFigure(bonuses.goldMult)}
          help={t('talents.sheetAccount')}
          side="above"
        />
        <Account
          sign="tech_eco_xp"
          name={t('talents.sheetXp')}
          value={bonusFigure(bonuses.xpMult)}
          help={t('talents.sheetAccount')}
          side="above"
        />
        <Account
          sign="tech_eco_offline"
          name={t('talents.sheetOffline')}
          value={shareFigure(bonuses.offlineMult)}
          help={t('talents.sheetOfflineHelp')}
          side="above"
        />
        <Account
          sign="tech_chest_gem"
          name={t('talents.sheetGems')}
          value={bonusFigure(bonuses.gemDropMult)}
          help={t('talents.sheetGemsHelp')}
          side="above"
        />
        {CHEST_TYPES.map((type) => (
          <Account
            key={type}
            sign={CHEST_SIGN[type]}
            name={chestName(type)}
            value={chanceFigure(chestDropChance(type, bonuses))}
            help={type === 'normal' ? t('talents.sheetChestPerKill') : t('talents.sheetChestPerBoss')}
            side="above"
          />
        ))}
      </div>
      <Rule />
      <div className="tk-sheet-fx">
        {effects.length === 0 && <span>{t('talents.sheetNoEffects')}</span>}
        {effects.map((e, i) => {
          const def = effectDef(e.defKey);
          const left = `${(e.remainingMs / 1000).toFixed(1)} s`;
          return (
            <div key={`${e.defKey}-${i}`} className={`has ${def.beneficial ? 'good' : 'bad'}`}>
              <Sign name={effectArtStem(e.defKey, def.beneficial)} alt={effectName(e.defKey)} />
              {left}
              <Tip side="above">
                <TipTitle>{effectName(e.defKey)}</TipTitle>
                <TipText>
                  {def.beneficial ? t('talents.sheetEffectGood') : t('talents.sheetEffectBad')}
                </TipText>
                <TipLine label={t('talents.sheetEffectLeft')} value={left} />
              </Tip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Account({
  sign,
  name,
  value,
  help,
  side,
}: {
  sign: string;
  name: string;
  value: string;
  help: string;
  side: TipSide;
}): React.JSX.Element {
  return (
    <div className="tk-sheet-acct has">
      <Sign name={sign} alt={name} />
      <b>{value}</b>
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
        <TipText>{help}</TipText>
      </Tip>
    </div>
  );
}

import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { partyAuras } from '@/sim/partyStats';
import { getBonuses } from '@/sim/bonuses';
import { chestDropChance } from '@/sim/chests';
import { format } from '@/sim/num';
import { CHEST_TYPES, type ChestType } from '@/data/chests';
import { chestName, useT } from '@/i18n';
import { Head, Rule, Sign, Tip, TipTag, TipText, TipTitle, Title, type TipSide } from '@/ui/kit';
import { classCrestStem } from '@/ui/itemArt';
import { heroStats } from './heroStats';
import { SheetStats } from './SheetStats';
import { bonusFigure, chanceFigure, shareFigure } from './sheetFigures';
import './SheetTab.css';

// The sheet wing's content (two columns: the wing is narrow): everything the hero and the account have, as figures. Effective stats are
// derived (never stored) exactly like combat does — gear + talents + account bonuses + the party's auras + the LIVE effects on the
// sim combatant, so a buff such as Stone Skin shows while it is up — then the account-wide economy and chest
// figures (upgrades + pets). No list of running effects (the strip shows them). It follows the sim clock a few times a second.

const CHEST_SIGN: Record<ChestType, string> = {
  normal: 'tech_chest_drop_normal',
  stageBoss: 'tech_chest_drop_stage',
  zoneBoss: 'hud_chest_world',
};

export function SheetTab({ heroId }: { heroId: string }): React.JSX.Element | null {
  const t = useT();
  useStore((s) => Math.floor(s.hud.clockMs / 250)); // live life and buffed figures: refresh four times a second
  const stage = useStore((s) => s.hud.globalStage);
  const roster = useStore((s) => s.roster);
  const hero = roster.find((h) => h.id === heroId);
  const techRanks = useStore((s) => s.techRanks);
  const petRanks = useStore((s) => s.petRanks);
  if (hero === undefined) return null;

  const combatant = getEngine()?.world.heroes.find((h) => h.id === hero.id);
  const bonuses = getBonuses(techRanks, petRanks);
  const stats = heroStats(hero, roster, bonuses, combatant);
  const auras = partyAuras(roster);
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
      <SheetStats stats={stats} stage={stage} auras={auras} classKey={hero.classKey} />
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

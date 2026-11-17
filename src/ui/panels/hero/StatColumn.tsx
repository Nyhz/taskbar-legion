import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { getBonuses } from '@/sim/bonuses';
import { ENABLER_SOFT_CAPS, type StatKey } from '@/data/stats';
import { mitigation } from '@/data/stageScaling';
import { statLabel, useT } from '@/i18n';
import { StatRow, Tip, TipLine, TipTitle } from '@/ui/kit';
import { dollStats, heroStats, statText } from './heroStats';
import { cadenceFigures } from './sheetFigures';

// The ten quick stats beside the paper doll, in two columns of five (offence, defence): a sign and a number each; the name, and what armour or magic resist buys
// against the current stage, live in the tooltip. Re-renders with each HUD push so live buffs show.

export function StatColumn({ heroId }: { heroId: string }): React.JSX.Element | null {
  const t = useT();
  const stage = useStore((s) => s.hud.globalStage);
  useStore((s) => s.hud.clockMs); // live effects on the combatant change the numbers
  const roster = useStore((s) => s.roster);
  const hero = roster.find((h) => h.id === heroId);
  const techRanks = useStore((s) => s.techRanks);
  const petRanks = useStore((s) => s.petRanks);
  if (hero === undefined) return null;
  const combatant = getEngine()?.world.heroes.find((h) => h.id === hero.id);
  const stats = heroStats(hero, roster, getBonuses(techRanks, petRanks), combatant);
  const { offence, defence } = dollStats(hero.classKey);
  const cadence = cadenceFigures(hero.classKey, stats.attackSpeed); // the cadence curve (data/cadence, round 12)

  const row = (key: StatKey): React.JSX.Element => {
    const value = stats[key];
    const cap = ENABLER_SOFT_CAPS[key]?.cap;
    const cut =
      key === 'armor' || key === 'magicResist'
        ? `−${(mitigation(value, stage) * 100).toFixed(0)} %`
        : undefined;
    return (
      <StatRow key={key} sign={`stat_${key}`} alt={statLabel(key)} value={key === 'attackSpeed' ? cadence.swings : statText(key, value)}>
        <Tip side="left">
          <TipTitle>{statLabel(key)}</TipTitle>
          {key === 'attackSpeed' && (
            <>
              <TipLine label={t('hero.cadenceSwings')} value={cadence.swings} />
              <TipLine label={t('hero.cadenceSpeed')} value={cadence.speed} />
              <TipLine label={t('hero.cadencePerHit')} value={cadence.perHit} />
            </>
          )}
          {cut !== undefined && <TipLine label={t('hero.vsStage')} value={cut} />}
          {cap !== undefined && <TipLine label={t('hero.softCap')} value={`${cap} %`} />}
        </Tip>
      </StatRow>
    );
  };

  return (
    <div className="tk-hero-stats">
      {offence.map(row)}
      {defence.map(row)}
    </div>
  );
}

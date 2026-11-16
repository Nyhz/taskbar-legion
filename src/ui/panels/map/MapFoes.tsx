import { supportFacts, traitFacts } from '@/sim/foeFacts';
import type { SupportAura } from '@/data/enemies';
import { useT } from '@/i18n';
import { Sign, TipRule } from '@/ui/kit';
import { auraLine, kindName, supportLine, traitLine } from './foeWords';

// What the wave enemies of a difficulty do, inside that difficulty's tooltip (MapDifficulties): each kind's traits
// and the support's auras — its sign and one line per aura, with the number it has there. Facts: sim/foeFacts.
//
// The aura signs are the ones the support wears on the strip, as files of the interface's own set
// (tools/assets/pipeline/icon_sets/s9i_foes.py renders them from the strip's drawing: `map_aura_<key>`, 9×9).

function AuraSign({ aura }: { aura: SupportAura }): React.JSX.Element {
  return <Sign name={`map_aura_${aura}`} className="sg" />;
}

export function MapFoes({ difficulty }: { difficulty: number }): React.JSX.Element {
  const t = useT();
  const traits = traitFacts(difficulty);
  const support = supportFacts(difficulty);
  return (
    <div className="tk-map-foes">
      <TipRule />
      <div className="hd">{t('map.foes')}</div>
      {traits.length === 0 && <p>{t('map.foesPlain')}</p>}
      {traits.map((fact, i) => (
        <div key={`${fact.role}.${fact.trait}`} className="tr">
          {/* The kind is named once, on the first of its traits. */}
          <b>{traits[i - 1]?.role === fact.role ? '' : kindName(fact.role)}</b>
          <span>{traitLine(fact)}</span>
        </div>
      ))}
      <div className="tr sup">
        <b>{kindName('support')}</b>
        <span>
          {support.fromWorld !== undefined && `${t('map.supportFrom', { n: support.fromWorld })} `}
          {t('map.supportAlways')}
        </span>
      </div>
      {support.innate.map(({ key, value }) => (
        <div key={key} className="au">
          <AuraSign aura={key} />
          <span>{auraLine(key, value)}</span>
        </div>
      ))}
      <div className="tr sup">
        <b />
        <span>{supportLine(support)}</span>
      </div>
      {support.values.map(({ key, value }) => (
        <div key={key} className="au">
          <AuraSign aura={key} />
          <span>{auraLine(key, value)}</span>
        </div>
      ))}
    </div>
  );
}

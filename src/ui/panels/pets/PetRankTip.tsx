import { petDef } from '@/data/pets';
import { petBonusAt, petStanding } from '@/sim/pets';
import { useT } from '@/i18n';
import { TipLine, TipNote } from '@/ui/kit';
import { petBonusView } from './petsLayout';
import { bonusAmount, objectiveName, objectiveProgress } from './petText';

// The lines of a tooltip that say where an owned pet stands: its rank, what its objective counts and how far it
// is, and what the next rank gives (or that it has none left).

export function PetRankLines({ petKey, progress }: { petKey: string; progress: number }): React.JSX.Element {
  const t = useT();
  const { kind } = petDef(petKey).objective;
  const standing = petStanding(petKey, progress);
  return (
    <>
      <TipLine label={t('pets.rank')} value={t('pets.rankOf', { n: standing.rank, max: standing.maxRank })} tone="gold" />
      {standing.goal === null ? (
        <TipNote>{t('pets.rankLast')}</TipNote>
      ) : (
        <>
          <TipLine label={objectiveName(kind)} value={objectiveProgress(kind, progress, standing.goal)} />
          <TipLine
            label={t('pets.nextRank', { n: standing.rank + 1 })}
            value={bonusAmount(petBonusView(petBonusAt(petKey, standing.rank + 1)))}
            tone="good"
          />
        </>
      )}
    </>
  );
}

/** Rank pips: one per rank the pet has, the reached ones lit. */
export function PetPips({ rank, max, className }: { rank: number; max: number; className?: string }): React.JSX.Element {
  return (
    <span className={className === undefined ? 'tk-pets-pips' : `tk-pets-pips ${className}`} aria-hidden="true">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < rank ? 'on' : undefined} />
      ))}
    </span>
  );
}

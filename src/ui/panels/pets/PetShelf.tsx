import { useStore } from '@/state/store';
import { PET_KEYS, petDef } from '@/data/pets';
import { petBonusAt, petMaxRank } from '@/sim/pets';
import { petName, useT } from '@/i18n';
import { Sign, Tip, TipAffix, TipLine, TipName, TipNote, TipText, TipTitle } from '@/ui/kit';
import { PET_SHELF_COLS, petBonusView, petShelfRows } from './petsLayout';
import { PetPips, PetRankLines } from './PetRankTip';
import { bonusAmount, bonusName, petLore } from './petText';

// The collection: every pet of the game on its plinth, three across. A pet you own shows its rank (pips on the
// plinth) and what it gives NOW (sign + amount), and is a key: pressing it makes it the companion (cosmetic —
// all owned pets give their bonus and all advance on their objectives). One you have not found is a dark
// silhouette with what it would give at rank 1, dimmed; its tooltip says it is found by chance (no odds).

export function PetShelf({ companion }: { companion: string | null }): React.JSX.Element {
  const t = useT();
  const owned = useStore((s) => s.ownedPets);
  const ranks = useStore((s) => s.petRanks);
  const progress = useStore((s) => s.petProgress);
  const selectPet = useStore((s) => s.selectPet);
  const rows = petShelfRows(PET_KEYS.length);

  return (
    <div className="tk-pets-shelf" style={{ '--cols': PET_SHELF_COLS } as React.CSSProperties}>
      {PET_KEYS.map((key, i) => {
        const def = petDef(key);
        // Tooltips open over the hero window (the wing is on its right); the lower rows open upwards.
        const side = Math.floor(i / PET_SHELF_COLS) >= rows - 1 ? 'left-up' : 'left';
        if (!owned.includes(key)) {
          const first = petBonusView(petBonusAt(key, 1));
          return (
            <div key={key} className="tk-pet none has">
              <Sign name="pet_plinth" className="pl" />
              <Sign name={`pet_${def.sprite}_dark`} alt={t('pets.undiscovered')} className="pt" />
              <div className="val">
                <Sign name={first.sign} />
                {bonusAmount(first)}
              </div>
              <Tip side={side} size="item">
                <TipTitle>{t('pets.undiscovered')}</TipTitle>
                <TipText>{t('pets.undiscoveredHelp')}</TipText>
                <TipLine label={t('pets.atRankOne')} />
                <TipAffix sign={first.sign} value={bonusAmount(first)} name={bonusName(first)} />
                <TipNote>{def.dropSource === 'boss' ? t('pets.foundBoss') : t('pets.foundAny')}</TipNote>
              </Tip>
            </div>
          );
        }
        const rank = ranks[key] ?? 1;
        const view = petBonusView(petBonusAt(key, rank));
        const chosen = key === companion;
        const lore = petLore(key);
        return (
          <button
            key={key}
            type="button"
            className="tk-pet own has"
            aria-label={`${petName(key)}: ${t('pets.rankOf', { n: rank, max: petMaxRank(key) })}, ${bonusAmount(view)} ${bonusName(view)}`}
            aria-pressed={chosen}
            onClick={() => selectPet(key)}
          >
            <Sign name={chosen ? 'pet_plinth_on' : 'pet_plinth'} className="pl" />
            <Sign name={`pet_${def.sprite}`} className="pt" />
            <PetPips rank={rank} max={petMaxRank(key)} className="on-plinth" />
            <div className="val">
              <Sign name={view.sign} />
              {bonusAmount(view)}
            </div>
            <Tip side={side} size="item">
              <TipName tone="gold">{petName(key)}</TipName>
              <TipAffix sign={view.sign} value={bonusAmount(view)} name={bonusName(view)} />
              <PetRankLines petKey={key} progress={progress[key] ?? 0} />
              {lore !== undefined && <TipNote>{lore}</TipNote>}
              <TipNote>{chosen ? t('pets.isCompanion') : t('pets.makeCompanion')}</TipNote>
            </Tip>
          </button>
        );
      })}
    </div>
  );
}

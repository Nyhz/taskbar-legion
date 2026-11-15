import { useStore } from '@/state/store';
import { PET_KEYS, petDef } from '@/data/pets';
import { petName, useT } from '@/i18n';
import { Sign, Tip, TipAffix, TipName, TipNote, TipText, TipTitle } from '@/ui/kit';
import { PET_SHELF_COLS, oneIn, petBonusView, petShelfRows } from './petsLayout';
import { bonusAmount, bonusName, grouped, petLore } from './petText';

// The collection: every pet of the game on its plinth, three across. A pet you own shows what it gives (sign +
// amount) and is a key: pressing it makes it the companion (cosmetic — all owned pets give their bonus). One you
// have not found is a dark silhouette with "?"; its tooltip only says where it drops.

export function PetShelf({ companion }: { companion: string | null }): React.JSX.Element {
  const t = useT();
  const owned = useStore((s) => s.ownedPets);
  const selectPet = useStore((s) => s.selectPet);
  const rows = petShelfRows(PET_KEYS.length);

  return (
    <div className="tk-pets-shelf" style={{ '--cols': PET_SHELF_COLS } as React.CSSProperties}>
      {PET_KEYS.map((key, i) => {
        const def = petDef(key);
        // Tooltips open over the hero window (the wing is on its right); the lower rows open upwards.
        const side = Math.floor(i / PET_SHELF_COLS) >= rows - 1 ? 'left-up' : 'left';
        if (!owned.includes(key)) {
          return (
            <div key={key} className="tk-pet none has">
              <Sign name="pet_plinth" className="pl" />
              <Sign name={`pet_${def.sprite}_dark`} alt={t('pets.undiscovered')} className="pt" />
              <div className="val">?</div>
              <Tip side={side}>
                <TipTitle>{t('pets.undiscovered')}</TipTitle>
                <TipText>{t('pets.undiscoveredHelp')}</TipText>
                <TipNote>
                  {def.dropSource === 'boss'
                    ? t('pets.dropBoss', { n: grouped(oneIn(def.baseDropChance)) })
                    : t('pets.dropAny', { n: grouped(oneIn(def.baseDropChance)) })}
                </TipNote>
              </Tip>
            </div>
          );
        }
        const view = petBonusView(def.bonus);
        const chosen = key === companion;
        const lore = petLore(key);
        return (
          <button
            key={key}
            type="button"
            className="tk-pet own has"
            aria-label={`${petName(key)}: ${bonusAmount(view)} ${bonusName(view)}`}
            aria-pressed={chosen}
            onClick={() => selectPet(key)}
          >
            <Sign name={chosen ? 'pet_plinth_on' : 'pet_plinth'} className="pl" />
            <Sign name={`pet_${def.sprite}`} className="pt" />
            <div className="val">
              <Sign name={view.sign} />
              {bonusAmount(view)}
            </div>
            <Tip side={side} size="item">
              <TipName tone="gold">{petName(key)}</TipName>
              <TipAffix sign={view.sign} value={bonusAmount(view)} name={bonusName(view)} />
              {lore !== undefined && <TipNote>{lore}</TipNote>}
              <TipNote>{chosen ? t('pets.isCompanion') : t('pets.makeCompanion')}</TipNote>
            </Tip>
          </button>
        );
      })}
    </div>
  );
}

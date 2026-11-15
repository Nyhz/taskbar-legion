import { useStore } from '@/state/store';
import { PET_KEYS, petDef } from '@/data/pets';
import { petName, useT } from '@/i18n';
import { Head, Sign, Tip, TipText, TipTitle, Title, Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { companionOf } from './petsLayout';
import { PetShelf } from './PetShelf';
import './pets.css';

// The pets panel: a RIGHT WING of the hero window (narrow and tall, as wide as every wing). Pets are ultra-rare
// drops; owning one grants its economy bonus for good and they all stack. The companion in the niche is cosmetic:
// the chosen pet while it is owned, else the first one found.

export function PetsWindow(): React.JSX.Element {
  const t = useT();
  const owned = useStore((s) => s.ownedPets);
  const selected = useStore((s) => s.selectedPet);
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('right');
  const companion = companionOf(owned, selected);
  const found = PET_KEYS.filter((key) => owned.includes(key)).length;

  return (
    <Window
      id="panel-pets"
      closeLabel={t('pets.close')}
      onClose={() => closePanel('pets')}
      tabsRight={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      <Head>
        <Title>{t('pets.title')}</Title>
        <div className="end">
          <span className="tk-pets-count has">
            <Sign name="pet_sign_paw" alt={t('pets.found')} />
            {found} / {PET_KEYS.length}
            <Tip side="below-end">
              <TipTitle>{t('pets.found')}</TipTitle>
              <TipText>{t('pets.foundHelp')}</TipText>
            </Tip>
          </span>
        </div>
      </Head>
      <div className="tk-niche tk-pets-niche has">
        {companion !== null && <Sign name={`pet_${petDef(companion).sprite}`} alt={petName(companion)} />}
        <Tip side="left">
          <TipTitle>{t('pets.companion')}</TipTitle>
          <TipText>{companion === null ? t('pets.noneHelp') : t('pets.companionHelp')}</TipText>
        </Tip>
      </div>
      <div className={companion === null ? 'tk-pets-name none' : 'tk-pets-name'}>
        {companion === null ? t('pets.none') : petName(companion)}
      </div>
      <PetShelf companion={companion} />
    </Window>
  );
}

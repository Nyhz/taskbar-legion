import { useEffect } from 'react';
import { useStore } from '@/state/store';
import { petDef } from '@/data/pets';
import { isPet, petBonusAt, petMaxRank } from '@/sim/pets';
import { petName, useT } from '@/i18n';
import { KitRoot, Sign } from '@/ui/kit';
import { petBonusView } from '@/ui/panels/pets/petsLayout';
import { bonusAmount, bonusName } from '@/ui/panels/pets/petText';
import './overlay.css';

// A NEW PET was found: a rare, late-game event that must not pass as one more loot line. A gold-framed plate
// rises over the strip — the creature at twice its size, "New pet", its name in the title face, what it gives at
// rank 1 — stays for a while and leaves on its own, or at once on a click. It never blocks play: the zone around
// it lets every click through (in the desktop overlay only the plate itself is an interactive surface). One
// notice at a time; a second pet found meanwhile waits its turn (state/slices/petSlice `petFound`).

const STAY_MS = 9000;

export function PetFoundNotice(): React.JSX.Element | null {
  const t = useT();
  const key = useStore((s) => s.petFound[0]);
  const waiting = useStore((s) => s.petFound.length);
  const dismiss = useStore((s) => s.dismissPetFound);
  const zoom = useStore((s) => s.uiScale * s.gameScale);

  useEffect(() => {
    if (key === undefined) return;
    const handle = window.setTimeout(dismiss, STAY_MS);
    return () => window.clearTimeout(handle);
  }, [key, waiting, dismiss]);

  if (key === undefined || !isPet(key)) return null;
  const view = petBonusView(petBonusAt(key, 1));
  return (
    <div className="tk-petfound-zone">
      <KitRoot zoom={zoom}>
        <button
          // Keyed by the queue length too, so a second notice for the same slot restarts its entrance.
          key={`${key}:${waiting}`}
          type="button"
          className="tk-petfound"
          style={{ animationDuration: `${STAY_MS}ms` }}
          aria-label={`${t('overlay.petFoundTitle')}: ${petName(key)}. ${t('overlay.petFoundClose')}`}
          onClick={dismiss}
          data-interactive="true"
        >
          <span className="art">
            <Sign name={`pet_${petDef(key).sprite}`} />
          </span>
          <span className="txt">
            <span className="hd">{t('overlay.petFoundTitle')}</span>
            <span className="nm">{petName(key)}</span>
            <span className="bn">
              <Sign name={view.sign} />
              <b>{bonusAmount(view)}</b>
              {bonusName(view)}
            </span>
            <span className="nt">{t('overlay.petFoundRank', { max: petMaxRank(key) })}</span>
          </span>
        </button>
      </KitRoot>
    </div>
  );
}

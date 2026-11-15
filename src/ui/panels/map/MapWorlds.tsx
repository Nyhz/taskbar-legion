import { useT } from '@/i18n';
import { Sign, Tip, TipLine, TipName, TipText, TipTitle, art } from '@/ui/kit';
import { TILE_ART, WORLD_COLS, type WorldView } from './mapLayout';
import { offStyle } from './mapOff';
import { worldArt, worldNameKey } from './mapWorldNames';

// The ten worlds of the chosen difficulty, three across (the last one alone, in the middle): a crop of each
// world's real backdrop with its number, and ten marks under it — nine stages and the boss (gold when it has
// fallen, red when it is the wall in front of the party). A world not reached yet is its night silhouette with a
// lock: shown, not hidden, and it cannot be picked.

const TILE_PITCH = TILE_ART.width + 2;

export function MapWorlds({
  worlds,
  chosen,
  onPick,
}: {
  worlds: readonly WorldView[];
  /** The chosen world's number (1–10). */
  chosen: number;
  onPick: (local: number) => void;
}): React.JSX.Element {
  const t = useT();
  return (
    <div className="tk-map-worlds">
      {worlds.map((w, i) => {
        const alone = i === worlds.length - 1 && worlds.length % WORLD_COLS === 1;
        const col = alone ? 1 : i % WORLD_COLS;
        const name = w.reached ? t(worldNameKey(w.local)) : t('map.worldN', { n: w.local });
        return (
          <button
            key={w.local}
            type="button"
            className={`tk-map-w tk-map-tip has${alone ? ' last' : ''}${w.local === chosen ? ' sel' : ''}${w.reached ? '' : ' shut'}`}
            style={offStyle(col * TILE_PITCH)}
            aria-label={name}
            aria-pressed={w.local === chosen}
            aria-disabled={!w.reached}
            onClick={w.reached ? () => onPick(w.local) : undefined}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span
              className="pic"
              style={{ backgroundImage: `url(${art(worldArt(w.local, w.reached ? 'day' : 'night'))})` }}
            >
              <b>{w.local}</b>
              {!w.reached && <Sign name="map_lock_s" className="lock" />}
            </span>
            <span className="pips">
              {w.pips.map((pip, n) => (
                <i key={n} className={pip} />
              ))}
            </span>
            <Tip side="left">
              {w.reached ? (
                <>
                  <TipName tone="gold">{name}</TipName>
                  <TipLine
                    label={t('map.worldBoss')}
                    value={w.cleared ? t('map.beaten') : t('map.pending')}
                    tone={w.cleared ? 'good' : undefined}
                  />
                  {w.here && <TipText>{t('map.partyHere')}</TipText>}
                </>
              ) : (
                <>
                  <TipTitle>{name}</TipTitle>
                  <TipText>{t('map.undiscovered')}</TipText>
                </>
              )}
            </Tip>
          </button>
        );
      })}
    </div>
  );
}

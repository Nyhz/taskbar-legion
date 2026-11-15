import { DIFFICULTY_KEYS, difficultyDef } from '@/data/difficulties';
import { difficultyName, tierName, useT } from '@/i18n';
import { Sign, Tip, TipLine, TipTitle, TipWarn } from '@/ui/kit';
import { offStyle } from './mapOff';

// The five difficulties as five signs. The chosen one is underlined; one that is not open yet is an iron
// silhouette that cannot be picked and says how it opens. Names and the loot cap live in the tooltips.

const CHIP_PITCH = 20; // art px from one sign to the next

export function MapDifficulties({
  diff,
  maxDiff,
  onPick,
}: {
  diff: number;
  /** Highest difficulty the frontier has opened (0–4). */
  maxDiff: number;
  onPick: (diff: number) => void;
}): React.JSX.Element {
  const t = useT();
  return (
    <div className="tk-map-diffs">
      {DIFFICULTY_KEYS.map((key, d) => {
        const locked = d > maxDiff;
        const name = difficultyName(key);
        const before = DIFFICULTY_KEYS[d - 1];
        return (
          <button
            key={key}
            type="button"
            className={`tk-map-diff tk-map-tip has${d === diff ? ' on' : ''}${locked ? ' shut' : ''}`}
            style={offStyle(d * CHIP_PITCH)}
            aria-label={name}
            aria-pressed={d === diff}
            aria-disabled={locked}
            onClick={locked ? undefined : () => onPick(d)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Sign name={`map_diff_${key}${locked ? '_off' : ''}`} />
            <Tip side="left">
              <TipTitle>{name}</TipTitle>
              <TipLine label={t('map.diffLoot')} value={tierName(difficultyDef(key).tierCap)} />
              {locked && before !== undefined && (
                <TipWarn>{t('map.diffLocked', { name: difficultyName(before) })}</TipWarn>
              )}
            </Tip>
          </button>
        );
      })}
    </div>
  );
}

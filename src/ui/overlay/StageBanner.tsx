import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { difficultyOf, stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { difficultyName, useT } from '@/i18n';
import { Sign } from '@/ui/kit';
import { placeLabel } from './overlayText';

// A quiet steel band that fades over the strip whenever the party moves to a new stage / world (a change of
// hud.globalStage): the difficulty's sign, its name in blackletter and the world-stage in plain numerals. Cosmetic, render-only — the same shape
// as the DangerBanner, but informational rather than alarming (a single fade). On the strip's kit layer.

export function StageBanner(): React.JSX.Element | null {
  const t = useT();
  const stage = useStore((s) => s.hud.globalStage);
  const prev = useRef(stage);
  const [runKey, setRunKey] = useState(0);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    if (stage !== prev.current) {
      setShown(stage);
      setRunKey((k) => k + 1); // new key → remount → restart the fade
    }
    prev.current = stage;
  }, [stage]);

  if (shown === null) return null;
  const difficulty = difficultyOf(shown);
  const names = {
    difficulty: difficultyName(difficulty.key),
    place: placeLabel(worldInDifficulty(shown), stageInWorldOf(shown)),
  };
  return (
    <div
      key={runKey}
      className="tk-band stage"
      role="status"
      aria-label={t('overlay.entering', names)}
      onAnimationEnd={() => setShown(null)}
    >
      <Sign name={`map_diff_${difficulty.key}`} />
      <span className="nm tk-ink">{names.difficulty}</span>
      <b className="tk-ink">{names.place}</b>
    </div>
  );
}

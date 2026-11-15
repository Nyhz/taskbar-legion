import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { difficultyOf, stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { difficultyName, useT, worldName } from '@/i18n';
import { Sign } from '@/ui/kit';
import { placeLabel } from './overlayText';
import { stageSignToShow } from './stageSign';

// A quiet steel band that fades over the strip whenever the party moves to a new stage / world (a change of
// hud.globalStage) — and, after a defeat, once the strip is back from black (never over it: ./stageSign): the difficulty's sign, the WORLD's name in blackletter and the world-stage in plain numerals. Cosmetic, render-only — the same shape
// as the DangerBanner, but informational rather than alarming (a single fade). On the strip's kit layer.

export function StageBanner(): React.JSX.Element | null {
  const t = useT();
  const stage = useStore((s) => s.hud.globalStage);
  const held = useStore((s) => s.hud.stageSignHeld);
  const prev = useRef({ stage, held });
  const [runKey, setRunKey] = useState(0);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const next = { stage, held };
    const show = stageSignToShow(prev.current, next);
    if (show !== null) {
      setShown(show);
      setRunKey((k) => k + 1); // new key → remount → restart the fade
    } else if (held) {
      setShown(null); // the party has fallen: a band still on screen leaves with the strip
    }
    prev.current = next;
  }, [stage, held]);

  if (shown === null) return null;
  const difficulty = difficultyOf(shown);
  const world = worldInDifficulty(shown);
  const names = {
    difficulty: difficultyName(difficulty.key),
    place: placeLabel(world, stageInWorldOf(shown)),
  };
  return (
    <div
      key={runKey}
      className="tk-band stage"
      role="status"
      aria-label={t('overlay.entering', names)}
      onAnimationEnd={() => setShown(null)}
    >
      <Sign name={`map_diff_${difficulty.key}`} alt={names.difficulty} />
      <span className="nm tk-ink">{worldName(world)}</span>
      <b className="tk-ink">{names.place}</b>
    </div>
  );
}

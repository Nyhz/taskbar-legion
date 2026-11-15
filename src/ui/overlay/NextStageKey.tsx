import { useStore } from '@/state/store';
import { resumeStageFor } from '@/data/stageScaling';
import { stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { useT } from '@/i18n';
import { Sign, Tip, TipText, TipTitle } from '@/ui/kit';
import { nextOpenStage } from '@/ui/panels/map/mapLayout';

// The arrow over the Retry sign: while the party stands on a stage whose next one is already open (a defeat
// dropped it back, or it travelled back to farm) one click goes on to that stage — the same intent the map
// sends, without opening the hero window and the map. It is not there otherwise, and it takes no room when it
// appears (it sits in the strip's corner, over the art).

export function NextStageKey(): React.JSX.Element | null {
  const t = useT();
  const current = useStore((s) => s.hud.globalStage);
  const maxCleared = useStore((s) => s.hud.maxClearedStage);
  const fallen = useStore((s) => s.hud.stageSignHeld);
  const requestTravel = useStore((s) => s.requestTravel);
  const next = nextOpenStage(current, resumeStageFor(maxCleared));
  if (next === null || fallen) return null;
  const place = `${worldInDifficulty(next)}-${stageInWorldOf(next)}`;
  return (
    <button
      type="button"
      data-interactive="true"
      className="tk-corner next has"
      aria-label={t('hud.nextStage', { place })}
      onPointerDown={(e) => e.stopPropagation()} // a press here must not start dragging the strip
      onClick={() => requestTravel(next)}
    >
      <Sign name="hud_next" />
      <Tip>
        <TipTitle>{t('hud.nextStage', { place })}</TipTitle>
        <TipText>{t('hud.nextStageHelp')}</TipText>
      </Tip>
    </button>
  );
}

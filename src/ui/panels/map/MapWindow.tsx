import { useState } from 'react';
import { useStore } from '@/state/store';
import {
  DIFFICULTY_KEYS,
  STAGES_PER_WORLD,
  WORLDS_PER_DIFFICULTY,
  difficultyIndexOf,
  stageInWorldOf,
  worldInDifficulty,
} from '@/data/difficulties';
import { resumeStageFor } from '@/data/stageScaling';
import { difficultyName, useT } from '@/i18n';
import { Head, Sign, Tip, TipLine, TipText, TipTitle, Title, Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { MapDifficulties } from './MapDifficulties';
import { MapWorlds } from './MapWorlds';
import { MapStages } from './MapStages';
import { defaultWorld, worldsOf } from './mapLayout';
import { worldNameKey } from './mapWorldNames';
import './map.css';

// The travel map: a RIGHT WING of the hero window — narrow and tall like every wing. Killing a boss opens travel
// to every stage up to it; travelling never lowers progress (a refresh still drops the party at the frontier).
// Top to bottom: the name and the key that goes back to the frontier; the five difficulties; the ten worlds of
// the chosen one; then the chosen world's name, its nine stages and the door of its boss. Every rule is the
// store's and the data's (the old MapPanel's): this only draws it.

export function MapWindow(): React.JSX.Element {
  const t = useT();
  const maxCleared = useStore((s) => s.hud.maxClearedStage);
  const current = useStore((s) => s.hud.globalStage);
  const zoneKeys = useStore((s) => s.zoneKeys);
  const requestTravel = useStore((s) => s.requestTravel);
  const requestEnterZoneBoss = useStore((s) => s.requestEnterZoneBoss);
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('right');

  const frontier = resumeStageFor(maxCleared);
  const maxDiff = difficultyIndexOf(frontier); // the highest difficulty opened so far
  const [pickedDiff, setPickedDiff] = useState(() => difficultyIndexOf(current));
  const diff = Math.min(pickedDiff, maxDiff);
  const [pickedWorld, setPickedWorld] = useState<number | null>(null);

  const worlds = worldsOf(diff, frontier, maxCleared, current);
  const fallback = defaultWorld(diff, current, frontier);
  const world = worlds.find((w) => w.local === pickedWorld && w.reached) ?? worlds[fallback - 1] ?? worlds[0];
  // The zone's keys live under its boss stage: (global world index) × 10.
  const globalWorld = diff * WORLDS_PER_DIFFICULTY + (world?.local ?? 1);
  const keysHeld = zoneKeys[globalWorld * STAGES_PER_WORLD] ?? 0;
  const frontierKey = DIFFICULTY_KEYS[maxDiff] ?? 'normal';
  const frontierLabel = `${worldInDifficulty(frontier)}-${stageInWorldOf(frontier)}`;

  return (
    <Window
      id="panel-map"
      closeLabel={t('map.close')}
      onClose={() => closePanel('map')}
      tabsRight={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      <Head>
        <Title>{t('map.title')}</Title>
        <div className="end">
          <button
            type="button"
            className={`tk-key has${current === frontier ? '' : ' gold'}`}
            aria-label={`${t('map.frontier')} ${frontierLabel}`}
            onClick={() => requestTravel(frontier)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Sign name="map_front" />
            {frontierLabel}
            <Tip side="below-end">
              <TipTitle>{t('map.frontier')}</TipTitle>
              <TipLine label={difficultyName(frontierKey)} value={frontierLabel} />
              <TipText>{t('map.resumeHelp')}</TipText>
            </Tip>
          </button>
        </div>
      </Head>
      <MapDifficulties
        diff={diff}
        maxDiff={maxDiff}
        onPick={(d) => {
          setPickedDiff(d);
          setPickedWorld(null);
        }}
      />
      <MapWorlds worlds={worlds} chosen={world?.local ?? 1} onPick={setPickedWorld} />
      {world !== undefined && (
        <>
          <div className="tk-map-name">{t(worldNameKey(world.local))}</div>
          <MapStages
            world={world}
            frontier={frontier}
            maxCleared={maxCleared}
            current={current}
            keysHeld={keysHeld}
            onTravel={requestTravel}
            onEnterBoss={() => requestEnterZoneBoss(globalWorld)}
          />
        </>
      )}
    </Window>
  );
}

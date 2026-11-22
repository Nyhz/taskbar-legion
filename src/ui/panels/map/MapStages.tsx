import { STAGES_PER_WORLD } from '@/data/difficulties';
import { expectedLevel } from '@/data/stageScaling';
import { enemyHp } from '@/sim/enemyScale';
import { format } from '@/sim/num';
import { useT } from '@/i18n';
import { Sign, Tip, TipLine, TipText, TipTitle, TipWarn } from '@/ui/kit';
import { bossGateOf, stageStateOf, type WorldView } from './mapLayout';
import { offStyle } from './mapOff';
import { worldArt } from './mapWorldNames';

// The chosen world's journey: its nine stages as a pad of keys (the frontier in gold, a pin on the one the party
// stands on, the ones ahead greyed) and, at the end of a dotted road, the door of its boss with the keys held.
// A reached stage is a travel target; the door opens once stage 9 has fallen and a key is held (one is spent
// per attempt, even on a wipe). Enemy level and life are in each key's tooltip.

const PAD_COLS = 3;
const KEY_PITCH = 26; // a 24 px key and its gap
const GATE_OFF = 154 - 36; // the door hugs the wing's right edge

export function MapStages({
  world,
  frontier,
  maxCleared,
  current,
  keysHeld,
  onTravel,
  onEnterBoss,
}: {
  world: WorldView;
  frontier: number;
  maxCleared: number;
  current: number;
  /** World-boss keys held for this world (and difficulty). */
  keysHeld: number;
  onTravel: (globalStage: number) => void;
  onEnterBoss: () => void;
}): React.JSX.Element {
  const t = useT();
  const bossStage = world.first + STAGES_PER_WORLD - 1;
  const gate = bossGateOf(world.first, maxCleared, keysHeld);
  const figures = (g: number): React.JSX.Element => (
    <>
      <TipLine label={t('map.enemyLevel')} value={t('map.approx', { value: expectedLevel(g) })} />
      <TipLine label={t('map.enemyHp')} value={t('map.approx', { value: format(Math.round(enemyHp(g))) })} />
    </>
  );

  return (
    <div className="tk-map-stages">
      <div className="tk-map-pad">
        {Array.from({ length: STAGES_PER_WORLD - 1 }, (_, i) => {
          const g = world.first + i;
          const state = stageStateOf(g, frontier, current);
          const beaten = g <= maxCleared;
          const label = `${world.local}-${i + 1}`;
          const tone = state === 'frontier' ? ' gold' : state === 'locked' ? ' off' : '';
          return (
            <button
              key={g}
              type="button"
              className={`tk-key tk-map-st tk-map-tip has${tone}`}
              style={offStyle((i % PAD_COLS) * KEY_PITCH)}
              aria-label={label}
              aria-disabled={state === 'locked'}
              onClick={state === 'locked' ? undefined : () => onTravel(g)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {i + 1}
              {state === 'here' && <Sign name="map_here" className="pin" alt={t('map.partyHere')} />}
              <Tip side="left-up">
                <TipTitle>{label}</TipTitle>
                {figures(g)}
                <TipLine
                  label={t('map.stageBoss')}
                  value={beaten ? t('map.beaten') : t('map.pending')}
                  tone={beaten ? 'good' : undefined}
                />
                {state === 'here' && <TipText>{t('map.partyHere')}</TipText>}
                {(state === 'open' || state === 'frontier') && <TipText>{t('map.travel')}</TipText>}
                {state === 'locked' && <TipWarn>{t('map.stageLocked')}</TipWarn>}
              </Tip>
            </button>
          );
        })}
      </div>
      <div className={`tk-map-link${gate === 'closed' ? '' : ' lit'}`} />
      <div className="tk-map-gate">
        <button
          type="button"
          className={`tk-map-door tk-map-tip has ${gate}`}
          style={offStyle(GATE_OFF)}
          aria-label={`${t('map.worldBoss')} ${world.local}-${STAGES_PER_WORLD}`}
          aria-disabled={gate !== 'open'}
          onClick={gate === 'open' ? onEnterBoss : undefined}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Sign name={worldArt(world.local, 'boss')} />
          {world.cleared && <Sign name="map_check" className="chk" alt={t('map.beaten')} />}
          {current === bossStage && <Sign name="map_here" className="pin" alt={t('map.partyHere')} />}
          <Tip side="left-up">
            <TipTitle>
              {t('map.worldBoss')} · {world.local}-{STAGES_PER_WORLD}
            </TipTitle>
            {figures(bossStage)}
            <TipLine
              label={t('map.worldBoss')}
              value={world.cleared ? t('map.beaten') : t('map.pending')}
              tone={world.cleared ? 'good' : undefined}
            />
            {gate === 'closed' && (
              <TipWarn>{t('map.bossClosed', { stage: `${world.local}-${STAGES_PER_WORLD - 1}` })}</TipWarn>
            )}
            {gate === 'needKey' && <TipWarn>{t('map.bossNeedKey')}</TipWarn>}
            {gate === 'open' && <TipText>{t('map.bossEnter', { n: keysHeld })}</TipText>}
            {gate !== 'closed' && !world.cleared && <TipText>{t('map.bossWall')}</TipText>}
          </Tip>
        </button>
        <div
          className={`tk-map-keys tk-map-tip has${keysHeld > 0 ? '' : ' none'}`}
          style={offStyle(GATE_OFF)}
        >
          <Sign name="map_key" alt={t('map.keys')} />
          {keysHeld}
          <Tip side="left-up">
            <TipTitle>{t('map.keys')}</TipTitle>
            <TipText>{t('map.keysHelp')}</TipText>
            <TipText>{t('map.bossNeedKey')}</TipText>
          </Tip>
        </div>
      </div>
    </div>
  );
}

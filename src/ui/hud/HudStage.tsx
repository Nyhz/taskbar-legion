import { useStore } from '@/state/store';
import { STAGES_PER_WORLD, difficultyOf, stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { difficultyName, useT, worldName } from '@/i18n';
import { Bar, Sign, Tip, TipLine, TipText, TipTitle } from '@/ui/kit';
import { HudBoss } from './HudBoss';
import { HudSupport } from './HudSupport';

// Where the party is: the difficulty's sign, world-stage on a pennant of the difficulty's colour, and the bar
// that fills towards the stage boss. With a boss in front the bar gives way to the boss's line (HudBoss).

export function HudStage(): React.JSX.Element {
  const t = useT();
  const globalStage = useStore((s) => s.hud.globalStage);
  const phase = useStore((s) => s.hud.phase);
  const progress = useStore((s) => s.hud.stageProgress);
  const difficulty = difficultyOf(globalStage);
  const world = worldInDifficulty(globalStage);
  const stage = stageInWorldOf(globalStage);
  const boss = phase === 'boss' || phase === 'zoneBoss';
  const name = difficultyName(difficulty.key);

  // With a boss in front the rail's middle is the boss's line (HudBoss): the stage's place keeps its sign and
  // pennant (and the tooltip), and the progress bar gives way to the boss's name, life and clock.
  const where = (
    <>
      <Sign name={`map_diff_${difficulty.key}`} alt={name} />
      <div className={`tk-hud-stage ${difficulty.key}`}>
        {world}-{stage}
      </div>
    </>
  );
  const tip = (
    <Tip side="below">
      <TipTitle>{worldName(world)}</TipTitle>
      <TipLine label={name} value={t('hud.stageOf', { n: stage, total: STAGES_PER_WORLD })} />
      <TipText>
        {phase === 'zoneBoss'
          ? t('hud.worldBossHere')
          : phase === 'boss'
            ? t('hud.bossHere')
            : t('hud.bossComing')}
      </TipText>
    </Tip>
  );
  const foe = boss ? <HudBoss /> : null;

  return (
    <div className={`tk-hud-where${boss ? ' boss' : ''}`}>
      <div className="tk-hud-at has">
        {where}
        {!boss && (
          <>
            <Bar className="tk-hud-prog" value={progress} tone="progress" />
            <Sign name="hud_boss" className="tk-hud-end" />
          </>
        )}
        {tip}
      </div>
      {!boss && <HudSupport />}
      {foe}
    </div>
  );
}

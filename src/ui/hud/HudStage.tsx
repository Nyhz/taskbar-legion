import { useStore } from '@/state/store';
import { STAGES_PER_WORLD, difficultyOf, stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { difficultyName, useT } from '@/i18n';
import { Bar, Sign, Tip, TipLine, TipText, TipTitle } from '@/ui/kit';

// Where the party is: the difficulty's sign, world-stage on a pennant of the difficulty's colour, and the bar
// that fills towards the stage boss. With a boss in front the bar is full and red and the skull lights up.

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

  return (
    <div className="tk-hud-where has">
      <Sign name={`map_diff_${difficulty.key}`} alt={name} />
      <div className={`tk-hud-stage ${difficulty.key}`}>
        {world}-{stage}
      </div>
      <Bar className="tk-hud-prog" value={boss ? 1 : progress} tone={boss ? 'danger' : 'progress'} />
      <Sign name="hud_boss" className={`tk-hud-end${boss ? ' on' : ''}`} />
      <Tip side="below">
        <TipTitle>{t('hud.world', { n: world })}</TipTitle>
        <TipLine label={name} value={t('hud.stageOf', { n: stage, total: STAGES_PER_WORLD })} />
        <TipText>
          {phase === 'zoneBoss'
            ? t('hud.worldBossHere')
            : phase === 'boss'
              ? t('hud.bossHere')
              : t('hud.bossComing')}
        </TipText>
      </Tip>
    </div>
  );
}

import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { BOSS_ENRAGE_RAMP_MS } from '@/data/stageScaling';
import { useT } from '@/i18n';
import { Bar, Sign, Tip, TipText, TipTitle } from '@/ui/kit';

// With a boss in front (stage boss or world boss): what it is, its life, and the clock before it enrages —
// then the enrage stacks (×N: its damage doubles every BOSS_ENRAGE_RAMP_MS). Reads the live sim boss and
// re-renders with each HUD push.

function clock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function BossPlate(): React.JSX.Element | null {
  const t = useT();
  useStore((s) => s.hud); // refresh with every push: life and clock move each frame
  const phase = useStore((s) => s.hud.phase);
  if (phase !== 'boss' && phase !== 'zoneBoss') return null;
  const boss = getEngine()?.world.enemies.find((e) => e.isBoss === true && e.alive);
  if (boss === undefined) return null;

  const windowMs = boss.enrageMs ?? Number.POSITIVE_INFINITY;
  const fight = boss.fightMs ?? 0;
  const timed = Number.isFinite(windowMs);
  const enraged = timed && fight > windowMs;
  const stacks = enraged ? Math.floor((fight - windowMs) / BOSS_ENRAGE_RAMP_MS) + 1 : 0;

  return (
    <div className="tk-foe">
      <div className="tk-foe-top tk-ink">
        <Sign name="hud_boss" />
        <div className="nm">{phase === 'zoneBoss' ? t('hud.worldBoss') : t('hud.stageBoss')}</div>
        {timed && (
          <div className={`tk-foe-clock has${enraged ? ' late' : ''}`}>
            <Sign name="hud_enrage" alt={t('hud.enrage')} />
            {enraged ? `×${stacks}` : clock(windowMs - fight)}
            <Tip side="below-end">
              <TipTitle>{enraged ? t('hud.enraged') : t('hud.enrage')}</TipTitle>
              <TipText>{t('hud.enrageHelp')}</TipText>
            </Tip>
          </div>
        )}
      </div>
      <Bar className="tk-foe-life" value={boss.maxHp > 0 ? boss.hp / boss.maxHp : 0} tone="danger" />
    </div>
  );
}

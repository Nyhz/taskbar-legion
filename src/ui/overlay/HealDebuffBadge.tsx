import { useStore } from '@/state/store';
import { DIFFICULTY_KEYS, HEAL_POWER_EFFECTIVENESS, difficultyIndexOf } from '@/data/difficulties';
import { difficultyName, useT } from '@/i18n';
import { Sign, Tip, TipText, TipTitle } from '@/ui/kit';

// Top-right sign on the strip: this difficulty's heal-power debuff. Each difficulty devalues heal power (a
// treadmill that keeps the priest upgrading), so the sign says "healing is worth less here" and its tooltip
// lists every difficulty. Nothing shows where there is no debuff (Normal).

function reductionPct(index: number): number {
  return Math.round((1 - HEAL_POWER_EFFECTIVENESS[DIFFICULTY_KEYS[index] ?? 'normal']) * 100);
}

export function HealDebuffBadge(): React.JSX.Element | null {
  const t = useT();
  const globalStage = useStore((s) => s.hud.globalStage);
  const current = difficultyIndexOf(globalStage);
  if (reductionPct(current) <= 0) return null;
  return (
    <div className="tk-badge has" data-interactive="true">
      <Sign name="hud_debuff" alt={t('hud.healDebuff')} />
      <Tip>
        <TipTitle>{t('hud.healDebuff')}</TipTitle>
        <TipText>{t('hud.healDebuffHelp')}</TipText>
        {DIFFICULTY_KEYS.map((key, i) => (
          <div key={key} className={i === current ? 'ln here' : 'ln'}>
            <span>{difficultyName(key)}</span>
            <b>{t('hud.healDebuffValue', { pct: reductionPct(i) })}</b>
          </div>
        ))}
      </Tip>
    </div>
  );
}

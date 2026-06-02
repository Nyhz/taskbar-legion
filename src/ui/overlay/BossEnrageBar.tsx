import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { BOSS_ENRAGE_RAMP_MS } from '@/data/stageScaling';
import { PALETTE } from '@/styles/palette';

// A "time until enrage" bar pinned to the TOP of the scene during a boss fight (stage
// boss or world/act boss). It counts the 30s window down as the boss is engaged, then
// flips to a red ENRAGED ×N readout once it lapses. Reads the live sim boss directly
// and re-renders ~each frame off the HUD tick.

export function BossEnrageBar(): React.JSX.Element | null {
  useStore((s) => s.hud); // refresh ~per frame for the live clock
  const phase = useStore((s) => s.hud.phase);
  if (phase !== 'boss' && phase !== 'zoneBoss') return null;

  const boss = getEngine()?.world.enemies.find((e) => e.isBoss === true && e.alive);
  if (boss === undefined) return null;
  const windowMs = boss.enrageMs ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(windowMs)) return null;

  const fight = boss.fightMs ?? 0;
  const enraged = fight > windowMs;
  const frac = Math.max(0, Math.min(1, fight / windowMs));
  const remaining = Math.max(0, (windowMs - fight) / 1000);
  const stacks = enraged ? Math.floor((fight - windowMs) / BOSS_ENRAGE_RAMP_MS) + 1 : 0;
  const label = phase === 'zoneBoss' ? 'WORLD BOSS' : 'BOSS';
  const danger = enraged || frac > 0.8;

  return (
    <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: '48%', pointerEvents: 'none', textShadow: `0 1px 0 ${PALETTE.ink}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 2, color: enraged ? PALETTE.enemyAccent : PALETTE.textLight }}>
        <span>{label}</span>
        <span style={{ color: danger ? PALETTE.enemyAccent : PALETTE.textMute }}>
          {enraged ? 'ENRAGED' : `Enrage in ${remaining.toFixed(1)}s`}
        </span>
      </div>
      <div style={{ height: 8, background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, boxShadow: enraged ? `0 0 6px ${PALETTE.enemyAccent}` : undefined }}>
        <div
          style={{
            height: '100%',
            width: `${enraged ? 100 : frac * 100}%`,
            background: danger ? PALETTE.titleRedHi : PALETTE.gold,
            transition: 'width 100ms linear',
          }}
        />
      </div>
      {/* stack counter sits BELOW the bar */}
      {enraged && (
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: PALETTE.enemyAccent, marginTop: 2 }}>
          ⚡ ×{stacks}
        </div>
      )}
    </div>
  );
}

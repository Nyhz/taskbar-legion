import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { BOSS_ENRAGE_RAMP_MS } from '@/data/stageScaling';
import { creatureName, getLanguage, useT } from '@/i18n';
import { worldInDifficulty } from '@/data/difficulties';
import { tryWorldDef } from '@/data/worlds';
import { Bar, Sign, Tip, TipNote, TipText, TipTitle } from '@/ui/kit';
import { bossPlateInfo, clockText } from './bossPlate';
import { bossMarks } from './bossMarks';

/** Seconds as the language writes them (1.5 → «1,5» in Spanish). */
function secsText(value: number): string {
  return value.toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 });
}

// With a boss in front (stage boss or world boss) the rail's middle IS the boss's line: a sign for its rank
// (skull: stage boss; gold crown: world boss), its NAME, the marks of its kit (a world boss's own mechanic, then
// its affixes: a small sign each, the words in its tooltip), its life, and the clock before it enrages — then the
// enrage stacks (×N: its damage doubles every ramp — its difficulty's, data/stageScaling enrageRampMs). It lives on the rail, not on the strip, so
// nothing covers a boss as tall as the strip; the boss wears no life bar of its own (one bar, not two). It stays
// through the beat a fallen world boss gets (sim `bossDown`), its bar empty. Reads the live sim boss and
// re-renders with each HUD push. Returns null when there is no boss combatant (the caller draws its bar).

export function HudBoss(): React.JSX.Element | null {
  const t = useT();
  useStore((s) => s.hud); // refresh with every push: life and clock move each frame
  const phase = useStore((s) => s.hud.phase);
  const globalStage = useStore((s) => s.hud.globalStage);
  if (phase !== 'boss' && phase !== 'zoneBoss') return null;
  const world = getEngine()?.world;
  const fallen = world?.bossDown !== undefined;
  const boss = world?.enemies.find((e) => e.isBoss === true && (e.alive || fallen));
  if (boss === undefined) return null;

  const windowMs = boss.enrageMs ?? Number.POSITIVE_INFINITY;
  const fight = boss.fightMs ?? 0;
  const timed = Number.isFinite(windowMs) && boss.alive;
  const enraged = timed && fight > windowMs;
  const stacks = enraged ? Math.floor((fight - windowMs) / (boss.enrageRampMs ?? BOSS_ENRAGE_RAMP_MS)) + 1 : 0;

  const info = bossPlateInfo(tryWorldDef(worldInDifficulty(globalStage)), phase === 'zoneBoss');
  const rankName = info.rank === 'worldBoss' ? t('hud.worldBoss') : t('hud.stageBoss');
  const name = info.creatureKey === null ? rankName : creatureName(info.creatureKey);

  return (
    <div className={`tk-hud-foe ${info.rank === 'worldBoss' ? 'world' : 'stage'}`}>
      <Sign name={info.sign} alt={rankName} />
      <div className="nm">{name}</div>
      {bossMarks(boss, globalStage).map((mark) => (
        <div key={mark.key} className={`tk-hud-foe-mark has ${mark.kind}`}>
          <Sign name={mark.sign} alt={mark.name} />
          {mark.count !== undefined && <span className="n">{mark.count}</span>}
          {/* A mark with more than one part gets a broader tip, so it stays short enough for the smallest screen. */}
          <Tip side="below" size={mark.more === undefined ? undefined : 'wide'}>
            <TipTitle>{mark.name}</TipTitle>
            <TipText>{mark.help}</TipText>
            {mark.more?.map((line) => <TipText key={line}>{line}</TipText>)}
            <TipNote>{mark.kindName}</TipNote>
          </Tip>
        </div>
      ))}
      <Bar className="tk-hud-foe-life" value={boss.alive && boss.maxHp > 0 ? boss.hp / boss.maxHp : 0} tone="danger" />
      {timed && (
        <div className={`tk-hud-foe-clock has${enraged ? ' late' : ''}`}>
          <Sign name="hud_enrage" alt={t('hud.enrage')} />
          {enraged ? `×${stacks}` : clockText(windowMs - fight)}
          <Tip side="below-end">
            <TipTitle>{enraged ? t('hud.enraged') : t('hud.enrage')}</TipTitle>
            <TipText>{t('hud.enrageHelp', { s: secsText((boss.enrageRampMs ?? BOSS_ENRAGE_RAMP_MS) / 1000) })}</TipText>
            {boss.furyMs !== undefined && Number.isFinite(windowMs) ? <TipText>{t('hud.enrageFury', { s: secsText((boss.furyMs - windowMs) / 1000) })}</TipText> : null}
          </Tip>
        </div>
      )}
    </div>
  );
}

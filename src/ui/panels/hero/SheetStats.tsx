import { DEFENSIVE_STATS, ENABLER_SOFT_CAPS, OFFENSIVE_STATS, type StatKey } from '@/data/stats';
import type { EffectiveStats } from '@/sim/stats';
import type { PartyAura } from '@/sim/partyStats';
import { className, statLabel, talentNodeName, useT } from '@/i18n';
import { StatRow, Tip, TipLine, TipTag, TipText, TipTitle, type TipSide } from '@/ui/kit';
import { auraFigure, cadenceFigures, defenseAgainstStage, statFigure } from './sheetFigures';
import { SHEET_REST_STATS, sheetColumns } from './sheetLayout';

// The two stat columns of the sheet (sheetLayout): offence on the left, defence on the right (armour and magic
// resist with what they cut in the current stage), and the other figures under the shorter one. A stat that is
// zero is left out, like the old sheet did; damage reduction only shows while an effect grants it. Names and
// explanations live in the tooltips, which open over the hero window. A stat the PARTY's auras raise says in its
// tooltip which aura gives what, and whose it is.

export function SheetStats({
  stats,
  stage,
  auras,
  classKey,
}: {
  stats: EffectiveStats;
  stage: number;
  auras: readonly PartyAura[];
  /** The hero's class: his attack speed shows through its cadence curve (data/cadence). */
  classKey?: string;
}): React.JSX.Element {
  // EVERY stat is always listed, at 0 when the hero has none: a buff that grants one (Stone Skin's damage
  // reduction, Bloodlust's lifesteal) only changes its number — a row appearing would shift the whole sheet.
  const columns = sheetColumns(OFFENSIVE_STATS, DEFENSIVE_STATS, SHEET_REST_STATS);
  return (
    <div className="tk-sheet-cols">
      {columns.map((column, i) => (
        <div key={i}>
          {column.map((k) => (
            <StatLine
              key={k}
              stat={k}
              value={stats[k]}
              side="right"
              stage={stage}
              auras={auras.filter((a) => a.mod.key === k)}
              classKey={classKey}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function StatLine({
  stat,
  value,
  side,
  stage,
  auras,
  classKey,
}: {
  stat: StatKey;
  value: number;
  side: TipSide;
  stage?: number;
  /** The party auras that raise this stat. */
  auras: readonly PartyAura[];
  classKey?: string;
}): React.JSX.Element {
  const t = useT();
  const name = statLabel(stat);
  const cap = ENABLER_SOFT_CAPS[stat]?.cap;
  const defense =
    stage !== undefined && (stat === 'armor' || stat === 'magicResist')
      ? defenseAgainstStage(value, stage)
      : undefined;

  const given =
    auras.length === 0 ? undefined : (
      <>
        <TipText>{t('hero.partyAuras')}</TipText>
        {auras.map((a) => (
          <TipLine
            key={`${a.heroId}-${a.nodeKey}`}
            label={`${talentNodeName(a.classKey, a.nodeKey)} · ${className(a.classKey)}`}
            value={auraFigure(a.mod)}
          />
        ))}
      </>
    );

  let tip: React.JSX.Element;
  let extra: React.JSX.Element | undefined;
  if (defense !== undefined) {
    extra = (
      <span className={defense.verdict === 'onLevel' ? undefined : defense.verdict}>−{defense.cutPct} %</span>
    );
    tip = (
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
        <TipText>
          {stat === 'armor'
            ? t('talents.sheetArmorCuts', { pct: defense.cutPct })
            : t('talents.sheetResistCuts', { pct: defense.cutPct })}
        </TipText>
        <TipText>
          {defense.verdict === 'under'
            ? t('talents.sheetUnder')
            : defense.verdict === 'over'
              ? t('talents.sheetOver')
              : t('talents.sheetOnLevel')}
        </TipText>
        {given}
      </Tip>
    );
  } else if (cap !== undefined) {
    tip = (
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
        <TipLine label={t('talents.sheetCeiling')} value={`${cap} %`} />
        <TipText>{t('talents.sheetSoftCap')}</TipText>
        {given}
      </Tip>
    );
  } else if (stat === 'attackSpeed' && classKey !== undefined) {
    const c = cadenceFigures(classKey, value);
    tip = (
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
        <TipLine label={t('hero.cadenceSwings')} value={c.swings} />
        <TipLine label={t('hero.cadenceSpeed')} value={c.speed} />
        <TipLine label={t('hero.cadencePerHit')} value={c.perHit} />
        {given}
      </Tip>
    );
  } else if (stat === 'damageReduction') {
    tip = (
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
        {given === undefined && <TipText>{t('talents.sheetBuffOnly')}</TipText>}
        {given}
      </Tip>
    );
  } else if (given !== undefined) {
    tip = (
      <Tip side={side}>
        <TipTitle>{name}</TipTitle>
        {given}
      </Tip>
    );
  } else {
    tip = <TipTag side={side}>{name}</TipTag>;
  }

  return (
    <StatRow sign={`stat_${stat}`} alt={name} value={statFigure(stat, value, classKey)} extra={extra}>
      {tip}
    </StatRow>
  );
}

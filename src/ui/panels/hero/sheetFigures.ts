import { STATS, type StatKey } from '@/data/stats';
import { expectedDefense, mitigation } from '@/data/stageScaling';
import { format } from '@/sim/num';
import { cadenceHitMult, heroSwingsPerSec } from '@/data/cadence';

// Figures of the sheet tab, as text — pure, no React. The numbers are the ones combat uses (the caller passes
// the aggregate of gear + talents + account + live effects); this only says how each is written.

/** A stat's value as the sheet writes it: attack speed as attacks per second, percents with one decimal,
 *  flats as big numbers. */
export function statFigure(key: StatKey, value: number, classKey?: string): string {
  if (key === 'attackSpeed') return heroSwingsPerSec(classKey, value).toFixed(2); // the swings a second (data/cadence)
  return STATS[key].kind === 'percent' ? `${value.toFixed(1)} %` : format(Math.round(value));
}

/** What a party aura adds to a stat, as the sheet writes it: "+10 %" for a share of the stat or for points of a
 *  percent stat, "+120" for a flat amount. */
export function auraFigure(mod: { key: StatKey; mode: 'flat' | 'percent'; value: number }): string {
  const sign = mod.value < 0 ? '−' : '+';
  const size = Math.abs(mod.value);
  if (mod.mode === 'percent' || STATS[mod.key].kind === 'percent') return `${sign}${Number(size.toFixed(1))} %`;
  return `${sign}${format(Math.round(size))}`;
}

export type DefenseVerdict = 'under' | 'onLevel' | 'over';

const DEF_UNDER = 0.9; // more than 10 % below the on-level defence → under-defended
const DEF_OVER = 1.1; // more than 10 % above it → well defended

/** What an armour / magic-resist value is worth against the CURRENT stage's enemies: the share of damage it
 *  cuts and how it compares with the on-level value (the ~50 % anchor), with a ±10 % band. */
export function defenseAgainstStage(
  value: number,
  stage: number,
): { cutPct: number; verdict: DefenseVerdict } {
  const ratio = value / Math.max(1, expectedDefense(stage));
  return {
    cutPct: Math.round(mitigation(value, stage) * 100),
    verdict: ratio < DEF_UNDER ? 'under' : ratio > DEF_OVER ? 'over' : 'onLevel',
  };
}

/** An account multiplier is stored as the final factor (1 + Σ): the sheet shows the bonus part. */
export function bonusFigure(mult: number): string {
  return `+${Math.round((mult - 1) * 1000) / 10} %`;
}

/** A share (0–1) as a percentage — the offline yield is a fraction of the online one, not a bonus. */
export function shareFigure(share: number): string {
  return `${Math.round(share * 1000) / 10} %`;
}

/** A chance (0–1) as a percentage: two decimals while it is small, one from 10 % up. */
export function chanceFigure(chance: number): string {
  const pct = chance * 100;
  return `${pct.toFixed(pct < 10 ? 2 : 1)} %`;
}

/** Attack speed through the cadence curve (data/cadence, round 12): the swings a second it gives, the raw speed, and
 *  what each hit is multiplied by for the speed past the class's pace ("+0 %" below the curve's start). */
export function cadenceFigures(classKey: string, raw: number): { swings: string; speed: string; perHit: string } {
  return {
    swings: heroSwingsPerSec(classKey, raw).toFixed(2),
    speed: raw.toFixed(2),
    perHit: `+${Math.round((cadenceHitMult(classKey, raw) - 1) * 100)}\u00A0%`, // no-break space: "+16 %" never wraps in a tooltip
  };
}


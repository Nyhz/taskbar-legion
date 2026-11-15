import { ABILITIES } from '@/data/abilities';
import { STATS, type StatKey } from '@/data/stats';
import { expectedDefense, mitigation } from '@/data/stageScaling';
import { format } from '@/sim/num';
import { abilityArtStem } from '@/ui/abilityArt';

// Figures of the sheet tab, as text — pure, no React. The numbers are the ones combat uses (the caller passes
// the aggregate of gear + talents + account + live effects); this only says how each is written.

/** A stat's value as the sheet writes it: attack speed as attacks per second, percents with one decimal,
 *  flats as big numbers. */
export function statFigure(key: StatKey, value: number): string {
  if (key === 'attackSpeed') return value.toFixed(2);
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

// Which ability lays each effect: an active effect borrows that ability's sign.
const EFFECT_ABILITY: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const ability of Object.values(ABILITIES)) {
    if (!/^(knight|ranger|priest)_/.test(ability.key)) continue; // hero abilities only: they are the ones with signs
    for (const applied of ability.applies)
      if (!map.has(applied.effectKey)) map.set(applied.effectKey, ability.key);
  }
  return map;
})();

/** The sign of an active effect: its ability's when a hero ability lays it, otherwise a generic good / bad mark. */
export function effectArtStem(effectKey: string, beneficial: boolean): string {
  const abilityKey = EFFECT_ABILITY.get(effectKey);
  if (abilityKey !== undefined) return abilityArtStem(abilityKey);
  return beneficial ? 'ui_up' : 'hud_debuff';
}

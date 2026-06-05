import type { StatKey } from '@/data/stats';
import { ALL_STAT_KEYS, STATS, ENABLER_SOFT_CAPS, softCapValue } from '@/data/stats';

// Effective-stat aggregation. PURE: output depends only on inputs. Combat reads
// only EffectiveStats. The flat/percent semantics (DIFFICULTY.md §6):
//   - FLAT stats:    (base + Σflat) × (1 + Σpercent/100)   ← percent mods scale the flat total
//   - PERCENT stats: base + Σ(all mod values)              ← stored as percent points
//   - attackSpeed:   base × (1 + Σ(all mod values)/100)    ← the cadence (attacks/sec)

export interface StatMod {
  key: StatKey;
  mode: 'flat' | 'percent';
  value: number;
}

export type EffectiveStats = Record<StatKey, number>;

const DEFAULT_ATTACK_SPEED = 1.0;

export function aggregate(
  base: Partial<Record<StatKey, number>>,
  mods: readonly StatMod[],
): EffectiveStats {
  const flatSum: Partial<Record<StatKey, number>> = {};
  const pctSum: Partial<Record<StatKey, number>> = {};
  for (const m of mods) {
    if (m.mode === 'flat') flatSum[m.key] = (flatSum[m.key] ?? 0) + m.value;
    else pctSum[m.key] = (pctSum[m.key] ?? 0) + m.value;
  }

  const result = {} as EffectiveStats;
  for (const key of ALL_STAT_KEYS) {
    const b = base[key] ?? (key === 'attackSpeed' ? DEFAULT_ATTACK_SPEED : 0);
    const flat = flatSum[key] ?? 0;
    const pct = pctSum[key] ?? 0;
    if (key === 'attackSpeed') {
      result[key] = Math.max(0.05, b * (1 + (flat + pct) / 100));
    } else if (STATS[key].kind === 'percent') {
      const raw = b + flat + pct; // percent points (the RAW enabler sum, pre-soft-cap)
      const sc = ENABLER_SOFT_CAPS[key];
      result[key] = sc !== undefined ? softCapValue(raw, sc) : raw; // enablers diminish toward their cap
    } else {
      result[key] = Math.max(0, (b + flat) * (1 + pct / 100));
    }
  }
  return result;
}

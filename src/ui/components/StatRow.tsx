import { STATS, type StatKey } from '@/data/stats';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// One stat line: label + value, with an optional comparison delta vs an equipped
// item. Percent stats render as +X%, flat stats as +X (big-number formatted).

export function statText(key: StatKey, value: number): string {
  const pct = STATS[key].kind === 'percent';
  return `+${pct ? value.toFixed(value < 10 ? 1 : 0) : format(value)}${pct ? '%' : ''}`;
}

// A gold ★ marking a "perfect" affix (its value rolled ~15% above the normal ceiling).
export function PerfectStar(): React.JSX.Element {
  return <span title="Perfect roll" style={{ color: PALETTE.gold, fontWeight: 700 }}>★</span>;
}

export function StatRow({ statKey, value, delta, perfect }: { statKey: StatKey; value: number; delta?: number; perfect?: boolean }): React.JSX.Element {
  const def = STATS[statKey];
  const color = def.group === 'offensive' ? '#e8a0a0' : '#a0c8e8';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color }}>{def.label}</span>
      <span style={{ display: 'flex', gap: 6 }}>
        <span style={{ color: perfect === true ? PALETTE.gold : PALETTE.textLight, fontWeight: perfect === true ? 700 : undefined }}>{statText(statKey, value)}</span>
        {perfect === true && <PerfectStar />}
        {delta !== undefined && delta !== 0 && (
          <span style={{ color: delta > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent }}>
            ({delta > 0 ? '▲' : '▼'}{statText(statKey, Math.abs(delta)).replace('+', '')})
          </span>
        )}
      </span>
    </div>
  );
}

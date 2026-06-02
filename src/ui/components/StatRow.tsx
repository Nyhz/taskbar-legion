import { STATS, type StatKey } from '@/data/stats';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// One stat line: label + value, with an optional comparison delta vs an equipped
// item. Percent stats render as +X%, flat stats as +X (big-number formatted).

export function statText(key: StatKey, value: number): string {
  const pct = STATS[key].kind === 'percent';
  return `+${pct ? value.toFixed(value < 10 ? 1 : 0) : format(value)}${pct ? '%' : ''}`;
}

export function StatRow({ statKey, value, delta }: { statKey: StatKey; value: number; delta?: number }): React.JSX.Element {
  const def = STATS[statKey];
  const color = def.group === 'offensive' ? '#e8a0a0' : '#a0c8e8';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color }}>{def.label}</span>
      <span style={{ display: 'flex', gap: 6 }}>
        <span style={{ color: PALETTE.textLight }}>{statText(statKey, value)}</span>
        {delta !== undefined && delta !== 0 && (
          <span style={{ color: delta > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent }}>
            ({delta > 0 ? '▲' : '▼'}{statText(statKey, Math.abs(delta)).replace('+', '')})
          </span>
        )}
      </span>
    </div>
  );
}

// Tier-rarity verification (run: `npx vite-node scripts/sim-rarity.ts`).
// Prints the LOCKED per-difficulty drop tables (data/difficulties.ts, DIFFICULTY.md §4) as
// normalized percentages + the "1 in N" chase rarity of each difficulty's new top tier.
import { DIFFICULTY_KEYS, DIFFICULTIES } from '../src/data/difficulties';

const pct = (p: number): string => (p <= 0 ? '·' : (p * 100).toFixed(p < 0.1 ? 1 : 0) + '%');

console.log('difficulty\tcap\tT0\tT1\tT2\tT3\tT4\tT5\tT6\tT7\tT8');
for (const k of DIFFICULTY_KEYS) {
  const def = DIFFICULTIES[k];
  const total = def.tierWeights.reduce((a, b) => a + b, 0);
  const row = Array.from({ length: 9 }, (_, t) => pct((def.tierWeights[t] ?? 0) / total));
  console.log(`${def.name}\tT${def.tierCap}\t${row.join('\t')}`);
}

console.log('\nNew-top-tier chase rarity (per item drop):');
for (const k of DIFFICULTY_KEYS) {
  const def = DIFFICULTIES[k];
  const total = def.tierWeights.reduce((a, b) => a + b, 0);
  const p = (def.tierWeights[def.tierCap] ?? 0) / total;
  console.log(`  ${def.name} T${def.tierCap}: ${pct(p)} (≈ 1 in ${Math.round(1 / p)})`);
}

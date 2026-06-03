import type { TechNode, TechEffect } from '@/data/techTree';

// Turns a node + rank into short human strings for the card. Pure presentation — the
// per-rank effect math is intentionally trivial (value × rank) since getBonuses does
// the real aggregation; here we only need a readable "what you have / what's next".

const pct = (v: number): string => `${Math.round(v * 1000) / 10}%`; // 0.08 → "8%"

/** The node's "headline" effect (skip the auto-open UNLOCK flag — show the interval). */
function primary(node: TechNode): TechEffect | undefined {
  return node.effects.find((e) => e.kind !== 'unlockAutoOpen') ?? node.effects[0];
}

/** Cumulative bonus at `rank`, e.g. "+12.5%", "+24%", "+3", "−225s", "3 slots". */
export function cumulativeLabel(node: TechNode, rank: number): string {
  const e = primary(node);
  if (e === undefined || rank <= 0) return '—';
  switch (e.kind) {
    case 'goldDropMult':
    case 'xpDropMult':
    case 'chestTypeDropMult':
    case 'gemDropMult':
    case 'zoneKeyMult':
    case 'offlineMult':
      return `+${pct(e.value * rank)}`;
    case 'chestStorage':
      return `+${e.value * rank}`;
    case 'autoOpenReduce':
      return `−${(e.value * rank) / 1000}s`;
    case 'partySlot':
      return `${1 + rank} slots`;
    default:
      return `Rk ${rank}`;
  }
}

/** Short unit tag under the headline (e.g. "Attack Damage", "gold/kill"). */
export function effectUnit(node: TechNode): string {
  const e = primary(node);
  if (e === undefined) return '';
  switch (e.kind) {
    case 'goldDropMult':
      return 'gold/kill';
    case 'xpDropMult':
      return 'XP/kill';
    case 'chestTypeDropMult':
      return 'drop rate';
    case 'gemDropMult':
      return 'gem rate';
    case 'zoneKeyMult':
      return 'key rate';
    case 'offlineMult':
      return 'offline';
    case 'chestStorage':
      return 'storage';
    case 'autoOpenReduce':
      return 'interval';
    case 'partySlot':
      return 'active party';
    default:
      return '';
  }
}

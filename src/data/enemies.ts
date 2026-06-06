import type { AttackStyle } from './field';
import { RANGE, MOVE_SPEED } from './field';

// Enemy archetypes. Each wave (2–8) is built from these kinds, so a wave mixes
// melee (must reach the front line), ranged (poke while approaching) and casters
// (hit from far / magic-typed → tests magicResist). hp/dmg mults shape the threat.

export interface EnemyKind {
  key: string;
  name: string;
  style: AttackStyle;
  range: number;
  moveSpeed: number;
  hpMult: number;
  dmgMult: number;
  magic: boolean;
  /** ability keys cast in combat. Any enemy kind MAY have abilities; current kinds
   *  carry none (enemy abilities are a near-future rework). */
  abilities: string[];
  /** relative spawn weight within a wave */
  weight: number;
  accent: string; // render tint
}

export const ENEMY_KINDS: EnemyKind[] = [
  { key: 'grunt', name: 'Grunt', style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee, hpMult: 1.0, dmgMult: 1.0, magic: false, abilities: [], weight: 5, accent: '#c0473a' },
  { key: 'brute', name: 'Brute', style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee * 0.8, hpMult: 1.8, dmgMult: 1.25, magic: false, abilities: ['enemy_smash'], weight: 2, accent: '#9a3a30' },
  { key: 'archer', name: 'Archer', style: 'ranged', range: RANGE.ranged + 10, moveSpeed: MOVE_SPEED.ranged, hpMult: 0.65, dmgMult: 0.95, magic: false, abilities: ['enemy_aimed'], weight: 3, accent: '#b8863a' },
];

// Ranged enemies (archer/caster) are GATED IN over the first worlds: a lone melee
// frontline can't reach foes stacked behind a blocker, so drowning stage 1 in arrow
// fire is a death sentence. 0 ranged at stage ≤2, ramping to full weight by ~stage 14
// — world 1 is a mostly-melee tutorial, ranged becomes the threat as you progress.
export function rangedFactor(S: number): number {
  return Math.max(0, Math.min(1, (S - 2) / 12));
}

/** Pick an enemy kind by weight from a [0,1) roll, with ranged weight scaled by stage. */
export function pickEnemyKind(roll: number, S: number): EnemyKind {
  const rf = rangedFactor(S);
  const weights = ENEMY_KINDS.map((k) => (k.style === 'melee' ? k.weight : k.weight * rf));
  const total = weights.reduce((a, w) => a + w, 0);
  let r = roll * total;
  for (let i = 0; i < ENEMY_KINDS.length; i++) {
    r -= weights[i] ?? 0;
    if (r < 0) return ENEMY_KINDS[i] ?? ENEMY_KINDS[0]!;
  }
  return ENEMY_KINDS[0]!;
}

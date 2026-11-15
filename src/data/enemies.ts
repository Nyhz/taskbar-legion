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
  /** ability keys cast in combat (data/abilities.ts `enemy_*`). */
  abilities: string[];
  /** Share (0..1) of this kind's BASIC attacks that go for a hero BEHIND the front one, picked at random — a
   *  shooter's arrow flies over the tank. 0 = always the front hero. With nobody behind, every shot is the
   *  front hero's (docs/DIFFICULTY.md §5b: the back line takes damage). */
  backShotChance: number;
  /** relative spawn weight within a wave */
  weight: number;
  accent: string; // render tint
}

/** How often an archer's basic shot goes over the tank (tuned with scripts/measure-backline.ts so that, with the
 *  area blows, about 25–30 % of a full wave's damage lands behind the front hero). */
export const ARCHER_BACK_SHOT_CHANCE = 0.25;

export const ENEMY_KINDS: EnemyKind[] = [
  { key: 'grunt', name: 'Grunt', style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee, hpMult: 1.0, dmgMult: 1.0, magic: false, abilities: [], backShotChance: 0, weight: 5, accent: '#c0473a' },
  { key: 'brute', name: 'Brute', style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee * 0.8, hpMult: 1.8, dmgMult: 1.25, magic: false, abilities: ['enemy_smash'], backShotChance: 0, weight: 2, accent: '#9a3a30' },
  { key: 'archer', name: 'Archer', style: 'ranged', range: RANGE.ranged + 10, moveSpeed: MOVE_SPEED.ranged, hpMult: 0.8, dmgMult: 0.95, magic: false, abilities: ['enemy_aimed'], backShotChance: ARCHER_BACK_SHOT_CHANCE, weight: 3, accent: '#b8863a' },
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

import type { AttackStyle } from './field';
import { RANGE, MOVE_SPEED } from './field';

// Enemy archetypes. Each wave is built from these kinds, so a wave mixes four BEHAVIOURS, each drawn with its own
// figure (docs/redesign/PROGRESS.md «Enemigos»): the BEAST (fast and fragile), the SOLDIER (the plain fighter), the
// SHOOTER (stands back and aims over the tank) and the BRUTE (slow, tough, an area blow). A fifth kind, the
// SUPPORT, is never rolled into a wave: about one wave in three brings one, standing furthest back, and while it
// lives its whole wave carries its auras (below). hp/dmg mults shape the threat.

/** What an enemy of a wave DOES — its behaviour, the figure it is drawn with, its place in the heroes' priority. */
export type EnemyRole = 'beast' | 'soldier' | 'shooter' | 'brute' | 'support';

export interface EnemyKind {
  key: string;
  name: string;
  role: EnemyRole;
  /** Its swing rate against the common one (1 = the same). */
  attackSpeedMult: number;
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
  { key: 'grunt', name: 'Grunt', role: 'soldier', attackSpeedMult: 1, style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee, hpMult: 1.0, dmgMult: 1.0, magic: false, abilities: [], backShotChance: 0, weight: 3, accent: '#c0473a' },
  { key: 'brute', name: 'Brute', role: 'brute', attackSpeedMult: 1, style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee * 0.8, hpMult: 1.8, dmgMult: 1.25, magic: false, abilities: ['enemy_smash'], backShotChance: 0, weight: 2, accent: '#9a3a30' },
  { key: 'archer', name: 'Archer', role: 'shooter', attackSpeedMult: 1, style: 'ranged', range: RANGE.ranged + 10, moveSpeed: MOVE_SPEED.ranged, hpMult: 0.8, dmgMult: 0.95, magic: false, abilities: ['enemy_aimed'], backShotChance: ARCHER_BACK_SHOT_CHANCE, weight: 3, accent: '#b8863a' },
  // The beast: first to arrive, quick to bite, quick to fall. Its numbers and the grunt's lower weight keep a
  // wave's total life and damage where they were with grunts alone (life −6 %, damage +1 %).
  { key: 'beast', name: 'Beast', role: 'beast', attackSpeedMult: 1.3, style: 'melee', range: RANGE.melee + 5, moveSpeed: MOVE_SPEED.melee * 1.4, hpMult: 0.75, dmgMult: 0.8, magic: false, abilities: [], backShotChance: 0, weight: 2, accent: '#a8553a' },
];

/** The SUPPORT: fragile, stands furthest back (past the shooters), barely attacks — a weak tap at the front hero —
 *  and casts nothing. What it brings is its auras (SUPPORT_AURAS). Spawned apart from the wave's roll (sim/stages). */
export const SUPPORT_KIND: EnemyKind = {
  key: 'support', name: 'Support', role: 'support', attackSpeedMult: 0.6, style: 'caster', range: RANGE.caster + 30, moveSpeed: MOVE_SPEED.caster,
  hpMult: 0.6, dmgMult: 0.3, magic: true, abilities: [], backShotChance: 0, weight: 0, accent: '#7c6fb0',
};

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

// ── Traits by difficulty ────────────────────────────────────────────────────────────────────────────────────
// A kind GAINS traits as the difficulty rises and keeps the ones it had (Normal: none). Every number is here;
// what each does is sim/enemyTraits.ts. On the strip a trait is never a permanent mark on a common enemy: a tint
// of its own body or a brief flash (render/foeFx).

export type EnemyTrait = 'rage' | 'charge' | 'guard' | 'lastBreath' | 'chargedShot' | 'focusFire' | 'unstoppable' | 'tremor';

/** Each role's traits and the difficulty (0 Normal … 4 Torment) it has them from. */
export const ROLE_TRAITS: Readonly<Record<EnemyRole, readonly { trait: EnemyTrait; from: number }[]>> = {
  beast: [{ trait: 'rage', from: 1 }, { trait: 'charge', from: 2 }],
  soldier: [{ trait: 'guard', from: 1 }, { trait: 'lastBreath', from: 2 }],
  shooter: [{ trait: 'chargedShot', from: 2 }, { trait: 'focusFire', from: 3 }],
  brute: [{ trait: 'unstoppable', from: 2 }, { trait: 'tremor', from: 3 }],
  support: [],
};

export const TRAIT_TUNING = {
  /** Rabia: under this share of its life it attacks this much faster. */
  rage: { hpBelow: 0.5, attackSpeedPct: 40 },
  /** Embestida: the first basic attack a beast lands when it reaches the party hits `mult` times as hard. */
  charge: { mult: 2 },
  /** Último aliento: when it dies, the rest of its wave attacks this much faster for a moment. */
  lastBreath: { ms: 3000, attackSpeedPct: 25 },
  /** Tiro cargado: one basic shot in `every` hits `mult` times as hard. */
  chargedShot: { every: 4, mult: 2 },
  /** Fuego concentrado: the shots that go over the tank all land on ONE hero, and this share of them go over. */
  focusFire: { backShotChance: 0.35 },
  /** Temblor: the brute's area blow becomes this one (data/abilities), which lays `effect` (data/effects: the
   *  slow and how long it lasts) on the heroes it reaches. */
  tremor: { replaces: 'enemy_smash', ability: 'enemy_smash_tremor', effect: 'debuff_tremor' },
} as const;

/** The traits an enemy of `role` has on difficulty `difficultyIndex`, in the table's order. */
export function traitsOf(role: EnemyRole, difficultyIndex: number): EnemyTrait[] {
  return ROLE_TRAITS[role].filter((t) => difficultyIndex >= t.from).map((t) => t.trait);
}

// ── The support's auras ─────────────────────────────────────────────────────────────────────────────────────
// A support carries SUPPORT_AURA_COUNT[difficulty] DIFFERENT auras, drawn from a stream seeded by (run, stage,
// wave) alone — not the combat rng. While it lives every enemy of its wave has them; they end the moment it dies.

export type SupportAura = 'toughness' | 'fury' | 'vigor' | 'aegis' | 'malice';

export const SUPPORT_AURA_KEYS: readonly SupportAura[] = ['toughness', 'fury', 'vigor', 'aegis', 'malice'];

export interface SupportAuraDef {
  key: SupportAura;
  name: string;
  /** Its strength on each difficulty, Normal … Torment (what the number means is the aura's own). */
  value: readonly [number, number, number, number, number];
}

export const SUPPORT_AURAS: Readonly<Record<SupportAura, SupportAuraDef>> = {
  // Aguante: the wave takes this % less damage.
  toughness: { key: 'toughness', name: 'Toughness', value: [20, 20, 20, 25, 25] },
  // Furia: it attacks this % faster.
  fury: { key: 'fury', name: 'Fury', value: [20, 20, 20, 25, 25] },
  // Vigor: it regenerates this % of its life every second.
  vigor: { key: 'vigor', name: 'Vigor', value: [2, 2, 2.5, 3, 3] },
  // Égida: each enemy enters with a shield worth this % of its life.
  aegis: { key: 'aegis', name: 'Aegis', value: [15, 15, 20, 20, 25] },
  // Saña: it deals this % more damage.
  malice: { key: 'malice', name: 'Malice', value: [15, 15, 15, 20, 20] },
};

/** How many auras a support carries, Normal … Torment. */
export const SUPPORT_AURA_COUNT: readonly [number, number, number, number, number] = [1, 2, 3, 4, 5];
/** The share of waves that bring a support (never two). */
export const SUPPORT_WAVE_CHANCE = 1 / 3;
/** The first global stage with supports: world 3 of Normal. */
export const SUPPORT_MIN_STAGE = 21;

function auraStream(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The auras of the support of wave `wave` of global stage `S` in the run seeded `runSeed` — or undefined when
 *  that wave brings no support. In the list's own order, whatever order they were drawn in. */
export function supportAuras(runSeed: number, S: number, wave: number, difficultyIndex: number): SupportAura[] | undefined {
  if (S < SUPPORT_MIN_STAGE) return undefined;
  const next = auraStream((runSeed ^ Math.imul(S + 1, 0x9e3779b1) ^ Math.imul(wave + 1, 0x85ebca6b)) >>> 0);
  if (next() >= SUPPORT_WAVE_CHANCE) return undefined;
  const count = SUPPORT_AURA_COUNT[Math.max(0, Math.min(4, Math.floor(difficultyIndex)))] ?? 1;
  const pool = [...SUPPORT_AURA_KEYS];
  const picked: SupportAura[] = [];
  while (picked.length < count && pool.length > 0) picked.push(...pool.splice(Math.floor(next() * pool.length), 1));
  return SUPPORT_AURA_KEYS.filter((k) => picked.includes(k));
}

/** An aura's strength on a difficulty. */
export function auraValue(key: SupportAura, difficultyIndex: number): number {
  return SUPPORT_AURAS[key].value[Math.max(0, Math.min(4, Math.floor(difficultyIndex)))] ?? 0;
}

// ── Who the heroes shoot first ──────────────────────────────────────────────────────────────────────────────

/** The order in which the Ranger and the Priest pick a target among the wave in their reach (sim/targeting):
 *  first the support, then the shooters, the beasts, the soldiers and the brutes last. Within a kind, an elite
 *  before the rest. */
export const TARGET_PRIORITY: readonly EnemyRole[] = ['support', 'shooter', 'beast', 'soldier', 'brute'];

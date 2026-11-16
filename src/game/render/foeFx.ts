// How the WAVE enemies' kinds, traits and auras are shown on the strip (no Pixi here — pure, unit-tested;
// docs/redesign/PROGRESS.md «Enemigos», agreed 2026-11-15). The rule: NOTHING permanent on a common enemy except
// a tint of its own body; a trait is a brief flash. The only standing signs are the SUPPORT's own — one small
// pixel sign per aura it carries, in a row over its head — because the auras are its, and killing it ends them.
// The art is tools/assets/pipeline/fx/foes.py (→ render/fxData).

import type { EnemyRole, SupportAura } from '@/data/enemies';
import type { CreatureRole } from '@/data/worlds';

/** Which of a world's figures stands for each kind. The brute has no figure of its own: it is the world's melee
 *  fighter drawn a size up (below) — the same people, the big one — and the support, until its world has a
 *  figure for it (data/worlds `support`), is the world's ranged creature in a tint of its own. */
export const ROLE_FIGURE: Readonly<Record<EnemyRole, CreatureRole>> = {
  beast: 'beast',
  soldier: 'melee',
  brute: 'melee',
  shooter: 'ranged',
  support: 'ranged',
};

/** How much bigger a BRUTE is drawn than the soldier it shares a figure with. Like an elite's size (render/
 *  eliteLook ELITE_FIGURE_SCALE), a compromise: uneven by a backing pixel here and there, read as "the big one".
 *  An elite brute is both sizes at once. Its slower walk (data/enemies: ×0.8) is the heavier step. */
export const BRUTE_FIGURE_SCALE = 1.15;

/** Rabia: the tint of a beast's own body while it is under half its life (a tint multiplies: it reddens). */
export const RAGE_TINT = 0xff7e6a;

/** The support's tint while it borrows its world's ranged figure: a cold violet, so it is not taken for a shooter. */
export const SUPPORT_BORROWED_TINT = 0xb8a8ff;

/** What a cue of the simulation (CombatEvent `cue`: sim/enemyTraits) plays, and where: on the enemy's body, at
 *  its feet, or on every living enemy of the wave. */
export interface FoeCue {
  fx: string;
  at: 'body' | 'feet' | 'wave';
}

export const FOE_CUES: Readonly<Record<string, FoeCue>> = {
  guard: { fx: 'foe_guard', at: 'body' }, // Guardia: the parry
  lastBreath: { fx: 'foe_last_breath', at: 'feet' }, // Último aliento: one burst off the fallen soldier
  supportDown: { fx: 'support_down', at: 'wave' }, // the auras leaving every enemy of the wave
};

/** Tiro cargado: the charged shot flies lit — the same arrow, its head burning. */
export const CHARGED_SHOT = { fx: 'foe_arrow_lit', arc: 'foe_arrow_lit_arc' } as const;

/** Embestida: a beast's first blow bursts on the hero it lands on — a hard white star with two gouges and the
 *  dust of the run (its own art, not the mark a foe's shot leaves). */
export const CHARGE_HIT_FX = 'charge_burst';
/** How far over the hero's feet the burst sits (art pixels): on the chest. */
export const CHARGE_HIT_LIFT = 14;

/** Fuego concentrado: the ONE reticle, on the hero the shots are lofted at. */
export const FOCUS_RETICLE_FX = 'foe_reticle';
/** How far over the hero's feet its centre sits (art pixels): on the chest. */
export const FOCUS_RETICLE_LIFT = 16;

/** The sign of each aura over the support's head. */
export const AURA_SIGNS: Readonly<Record<SupportAura, string>> = {
  toughness: 'aura_toughness',
  fury: 'aura_fury',
  vigor: 'aura_vigor',
  aegis: 'aura_aegis',
  malice: 'aura_malice',
  enchant: 'aura_enchant',
};

/** Distance between two signs' centres (a sign is 9 px wide with its rim: they touch, never overlap). */
export const AURA_SIGN_STEP = 9;
/** How far over the top of the support's life bar the row sits. */
export const AURA_SIGN_LIFT = 7;

/** Where the signs of `count` auras sit, as offsets from the support's centre: one row, centred, up to six (its
 *  Enchanted Weapons and the five it can draw in Torment). */
export function auraSignOffsets(count: number): number[] {
  const n = Math.max(0, Math.min(6, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => Math.round((i - (n - 1) / 2) * AURA_SIGN_STEP));
}

/** The sign keys of a support's auras, in the order they are given (unknown keys — a stale value — are skipped). */
export function auraSigns(auras: readonly string[] | undefined): string[] {
  if (auras === undefined) return [];
  return auras.map((a) => (AURA_SIGNS as Record<string, string | undefined>)[a]).filter((fx): fx is string => fx !== undefined);
}

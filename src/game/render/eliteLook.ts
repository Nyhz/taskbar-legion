// How an ELITE enemy is told from the rest of its wave (no Pixi here — pure, unit-tested). An elite is the same
// creature, stronger, and it must be picked out at a glance even in the middle of a pack (the simulation stacks
// melee enemies on one spot) — so the FIGURE carries the mark, not only something behind it:
//   - a two-pixel RIM on its silhouette, a pale line then a violet one, pulsing (render/figureMask: the figure's
//     own frames as a white shape, tinted and drawn offset behind it) — its aura;
//   - violet motes climbing in front of the body;
//   - a thicker life bar in a violet frame with a gold crown over its middle (render/stripHud BARS.elite: the
//     art is the strip HUD's, `hud_s_bar_elite`), always shown, while a common enemy's shows only when hurt;
//   - it is drawn a size up, and IN FRONT of the enemies it overlaps;
//   - a burst on it the moment it steps into the wave.
// It no longer stands in tall violet fire: the tongues rose well above the pack and read as purple lightning bolts
// over every elite (user, 2026-11-18: «quitarles los rayos morados verticales y dejarles solo el aura»).
// The art is tools/assets/pipeline/fx/flow.py (elite_sparks, elite_arrive, elite_crest).
// Violet with white: nothing else an enemy wears burns like it — fire and gold are the party's, yellow and
// crimson rims are the Priest's blessings on heroes, red is a boss's rage.

/**
 * How much bigger an elite's figure is drawn. Pixel art only scales cleanly by whole factors and ×2 would turn a
 * fighter into a boss, so this is a compromise that was looked at on every screen size (docs/redesign/PROGRESS.md,
 * 2026-11-15): at ×1.25 the strip's 3 backing pixels per art pixel become 3.75 — uneven by one backing pixel in
 * four, which reads as "the same creature, bigger" on ×2 and ×3 screens and is rough only on the smallest (×1).
 */
export const ELITE_FIGURE_SCALE = 1.25;

export const ELITE_CREST_FX = 'elite_crest';
export const ELITE_SPARKS_FX = 'elite_sparks';
export const ELITE_ARRIVE_FX = 'elite_arrive';

/** The rim's two lines (0xRRGGBB): the pale one hugging the figure and the violet one outside it. */
export const ELITE_RIM_INNER = 0xfffaf0; // palette `light`
export const ELITE_RIM_OUTER: readonly [number, number] = [0x8556ad, 0xcba2dd]; // palette `violet` 5 ↔ 7: it pulses between them
export const ELITE_RIM_PULSE_MS = 900;

/** Where the rim's copies of the figure sit behind it, in art pixels: the outer line first (drawn underneath). */
export const ELITE_RIM_OFFSETS: { outer: readonly (readonly [number, number])[]; inner: readonly (readonly [number, number])[] } = {
  outer: [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1], [2, 1], [-2, 1], [2, -1], [-2, -1], [1, 2], [-1, 2], [1, -2], [-1, -2]],
  inner: [[1, 0], [-1, 0], [0, 1], [0, -1]],
};

/** The outer line's colour `ms` into its pulse: it beats between its two tones (in steps — pixel art breathes in beats). */
export function eliteRimOuter(ms: number): number {
  const k = 0.5 - 0.5 * Math.cos(((ms % ELITE_RIM_PULSE_MS) / ELITE_RIM_PULSE_MS) * Math.PI * 2);
  return k < 0.5 ? ELITE_RIM_OUTER[0] : ELITE_RIM_OUTER[1];
}

/** Drawing order among the enemies (the party is above them all): an elite goes in front of the common enemies
 *  it overlaps, so neither its body nor its bar is buried in a pack. A boss's summon flies over the party itself. */
export const ENEMY_Z = { common: 1, elite: 1.5, summon: 3 } as const;

// The Priest's heals as CLEANSERS (user decision, 2026-11-16): Purify is no longer an ability — every heal she
// gives lifts harmful effects. An instant heal (Healing Light, Circle of Healing, Smite, any other) cleanses as it
// lands; a heal over time (Mend, Sanctuary…) as it is APPLIED, never on its ticks. Read by sim/abilities.

/** Harmful effects one heal lifts from each ally it lands on — ONLY those it heals (user, 2026-11-16: "cada cura
 *  quita TODOS los efectos dañinos, solo de los aliados a los que cura"). All of them; a finite number would lift
 *  that many, the one that matters most first (`cleansePriority` in data/effects, then the longest still to run). */
export const HEAL_CLEANSE_COUNT = Number.POSITIVE_INFINITY;

/** Healing Light's pick: an ally under this share of its life is healed first, whatever else is going on; over
 *  it, the ally carrying a harmful effect comes first (data/abilities target `triageAlly`). */
export const HEAL_URGENT_FRAC = 0.35;

/** How far ahead a heal over time is trusted to save an ally in danger (user, 2026-11-21: Healing Light landed on a
 *  Ranger Mend was already bringing back to full — the whole Mend wasted). Deciding where a heal goes, an ally counts
 *  what the heals over time on it still have to give; but one under HEAL_URGENT_FRAC even after what they give in this
 *  window is in danger and counts as hurt as it is — a slow heal does not stop the next blow (sim/abilities). */
export const HEAL_DANGER_WINDOW_MS = 2000;

/** An ally just struck hard (data/abilities HEAVY_HIT_LIFE_FRAC) draws a heal before the most hurt only while he is under
 *  this share of his life, counting the heals over time on him (2026-11-21: a Knight at 95 % after one big hit took
 *  Mend while the Ranger at 40 % waited — and an instant heal fired on a 97 % ally for its heavy-hit clause). */
export const HEAVY_HIT_HEAL_BELOW = 0.8;

/** Healing Light's pick (2026-11-21: it lifted a Venom off a full Ranger while the Knight at 38 % waited): a harmful
 *  effect that matters this much (`cleansePriority` in data/effects: Roots, Guilt, Gilded, Mortal Wound) is lifted
 *  before any wound over HEAL_URGENT_FRAC; a lesser one (a poison, a bleed) waits while an ally is under
 *  HEAL_WOUND_FIRST_FRAC. */
export const CLEANSE_URGENT_PRIORITY = 3;
export const HEAL_WOUND_FIRST_FRAC = 0.6;

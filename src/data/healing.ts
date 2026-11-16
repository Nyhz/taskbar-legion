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

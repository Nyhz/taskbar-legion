// How a hero spaces his casts (2026-11-18). A leaf module: data/abilities.ts and data/branchAbilities.ts both read
// it, and they import each other.

/** THE GLOBAL COOLDOWN (2026-11-18; user: «que los personajes no puedan usar sus 2 habilidades seguidas»): once a
 *  hero casts an ability, no other ability of his for this long — his swings go on as basic attacks meanwhile. A
 *  fixed time: neither cooldown reduction nor attack speed shortens it. Per hero (the Knight's Stone Skin and the
 *  Priest's Holy Shield still meet the same blow). Charge abilities wait it out with their charge kept; the
 *  ultimates (triggers) stand outside it. */
export const HERO_GLOBAL_COOLDOWN_MS = 2000;

/** A defence kept for a boss's blow still goes up when the hero it protects falls under this share of its life
 *  between blows (2026-11-18: «solo en emergencia, bajo 30 %») — spent earlier, it would be down for the next blow. */
export const EMERGENCY_LIFE_FRAC = 0.3;

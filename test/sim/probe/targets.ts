// THE PACING TARGET, per world (user, 2026-11-15, round 2: "Normal debería poder pasarse en 3-4 horas, y luego cada
// dificultad extra debería ser cada vez más y más exigente … y mantener esos 3 meses aprox hasta terminar
// Tormento"). The whole game is still about 3 calendar months at 8 h of play a day (≈ 720 active hours); the
// working split is Normal ≈ 4 h, Hell ≈ 40, Inferno ≈ 120, Eternal ≈ 230, Torment ≈ 325. Inside a difficulty every
// world is a little longer than the one before, and each new difficulty opens above where the last one ended.
// The pacing tuner (scripts/tune-pacing.ts) aims each wall at its entry; `npm run probe` prints them side by side.

/** Active hours per difficulty (Normal → Torment). */
export const DIFFICULTY_HOURS_TARGET: readonly number[] = [4, 40, 120, 230, 325];

/** How much longer a difficulty's last world is than its first (a straight line between them). Torment 1.25 → 2.0
 *  (user, 2026-11-21: «que tormento escale en horas, las etapas 1-4 no pueden tardar más que las 6-9… y el jefe final
 *  debe ser un buen muro»): ~22 h for Torment 1 up to ~43 h for its final wall, the same 325 h in all. */
const LAST_OVER_FIRST = [1.6, 2.2, 1.7, 1.4, 2.0];

/** Active hours for each of the 50 worlds. */
export const WORLD_HOURS_TARGET: readonly number[] = Array.from({ length: 50 }, (_, i) => {
  const d = Math.floor(i / 10);
  const k = i % 10; // 0 … 9 inside the difficulty
  const ratio = LAST_OVER_FIRST[d] ?? 1;
  const first = ((DIFFICULTY_HOURS_TARGET[d] ?? 0) / 10) * (2 / (1 + ratio)); // so the ten add up to the difficulty
  return first * (1 + ((ratio - 1) * k) / 9);
});

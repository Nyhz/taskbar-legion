// Small pure helpers for the lettering on and around the strip.

/** "3h 12m" / "47m" from a millisecond span (how long the party went on without the player). */
export function awayDuration(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "3-7": world and stage of a global stage inside its difficulty. */
export function placeLabel(world: number, stageInWorld: number): string {
  return `${world}-${stageInWorld}`;
}

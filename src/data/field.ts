// Spatial constants for the lane-pusher combat field (all in abstract world px).
// The party holds a formation around `partyX` (which only ever increases — they
// "walk forward"); the camera follows it, so on screen the party stays put and the
// parallax background scrolls. Enemy waves spawn ahead and advance toward the lead
// (front) hero. Attack ranges gate who can hit whom (melee/ranged/caster).

export type AttackStyle = 'melee' | 'ranged' | 'caster';

export const HERO_SPACING = 40; // column gap between party members (lead = front, slot 0).
// Widened for the bigger zoomed-in sprites so the column doesn't overlap (engaging OR
// reforming between waves).
export const ENEMY_SPREAD = 26; // gap between enemies in a spawned wave
// A combatant can't attack on a tick it actually moved (closed distance) — it must be
// standing still. No artificial settle delay: the instant it stops, it can swing/shoot.
// A per-tick displacement under this (px) counts as "holding position", not moving.
export const MOVE_EPS = 0.5;

// A fallen hero revives after this long IF the rest of the party is still fighting
// (a full party wipe instead retreats a stage and revives everyone immediately).
export const RESPAWN_MS = 60_000;

// A brief sim hold (no waves spawn) after a zone change or a wipe, so the render layer
// can play the teleport-out → blackout → teleport-in sequence and the party gets a real
// beat before combat resumes. Replaces the usual short between-wave advance at those
// transitions only (the render sequence is timed to roughly this window).
export const TELEPORT_HOLD_MS = 900;

// The full-party-wipe CINEMATIC. The fallen party plays out a scripted sequence (no combat
// / no rng — deterministic) before respawning, in five beats:
//   1. DEAD      — heroes lie dead on the field, death animations playing.
//   2. FADE      — the strip fades to black (a death-knell phrase fades in).
//   3. BLACK     — full black, the phrase held.
//   4. FADE      — fades back to the (now retreated) BACKGROUND ONLY — no heroes.
//   5. BGONLY    — empty world beat, then the party respawns and fights on.
// The stage retreat + field clear happen at WIPE_RETREAT_AT (fully black) so the world swap
// is hidden; the heroes revive at the very end (WIPE_TOTAL).
export const WIPE_DEAD_MS = 1000;
export const WIPE_FADE_MS = 500; // fade to/from black
export const WIPE_BLACK_MS = 1000; // full black + phrase
export const WIPE_BGONLY_MS = 1000; // background only (no heroes) before respawn
export const WIPE_RETREAT_AT_MS = WIPE_DEAD_MS + WIPE_FADE_MS; // 1500: fully black → retreat + clear the field
export const WIPE_TOTAL_MS = WIPE_DEAD_MS + 2 * WIPE_FADE_MS + WIPE_BLACK_MS + WIPE_BGONLY_MS; // 4000

// A wave teleports in as 3 BATCHES, one every 2 seconds (over ~6s), each batch a random
// slice of the wave's mobs (e.g. 2+2+1, or 3+5+2). Every batch is spawned a FIXED distance
// ahead of the party's current frontline (recomputed at each batch's release), so later
// batches land in front of the party even after it has advanced. Within a batch each mob is
// dropped at a random offset across WAVE_SPAWN_BAND px, so they arrive as a loose SUMMONED
// GROUP — visible, spread, not stacked.
export const WAVE_BATCHES = 3;
export const WAVE_BATCH_TICKS = 20; // 2s between batches (20 × 100ms ticks)
export const WAVE_SPAWN_BAND = 45; // px spread of a batch's mobs around the spawn point
// The party's single move speed — used both walking forward between waves AND closing to
// engage a wave (no separate faster "charge" any more). px/s.
export const WALK_SPEED = 150;
export const SPAWN_AHEAD = 240; // how far ahead of the lead hero a wave spawns

// Attack ranges by style (world px) — shared by heroes AND enemies. Ranged shoots from
// afar, casters from furthest still, so the back line hangs back (knight → ranger → priest)
// instead of stacking on the melee. (Balance of the buffed enemy snipers is the player's
// call to tune later.)
export const RANGE: Record<AttackStyle, number> = {
  melee: 50, // standard melee reach for ALL melee units (heroes, trash, bosses)
  ranged: 160, // ranger / archer hang well back
  caster: 195, // priest / mage (future) / enemy caster hang back furthest (+15 reach, 2026-06)
};

// Base movement speed by style (px/s) — deliberate, not a rush; the party out-paces
// them so the closing reads as the heroes advancing. Casters shuffle slowly.
export const MOVE_SPEED: Record<AttackStyle, number> = {
  melee: 100,
  ranged: 80,
  caster: 80, // unused — no caster enemy ships; kept to satisfy the AttackStyle record
};

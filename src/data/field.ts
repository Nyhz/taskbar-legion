// Spatial constants for the lane-pusher combat field (all in abstract world px).
// The party holds a formation around `partyX` (which only ever increases — they
// "walk forward"); the camera follows it, so on screen the party stays put and the
// parallax background scrolls. Enemy waves spawn ahead and advance toward the lead
// (front) hero. Attack ranges gate who can hit whom (melee/ranged/caster).

export type AttackStyle = 'melee' | 'ranged' | 'caster';

export const HERO_SPACING = 26; // column gap between party members (lead = front, slot 0)
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

// Each enemy in a wave spawns at a RANDOM tick within this ~3s window (30 × 100ms),
// so arrivals are IRREGULAR — some bunch, some trail — instead of a uniform burst.
export const WAVE_SPAWN_TICKS = 30;
export const WALK_SPEED = 62; // px/s the party walks forward between waves (was 50)
// The party CHARGES toward enemies to engage — now much faster than the (halved)
// enemy advance, so the party does almost all of the closing: it reads as the heroes
// RUNNING at the enemies. Also keeps the wave-engagement cadence up despite slower
// enemies (closing rate ≈ 105+18 ≈ old 75+35), so the farm/XP rate isn't dragged down.
export const PARTY_ENGAGE_SPEED = 105; // was 75
export const SPAWN_AHEAD = 300; // how far ahead of the lead hero a wave spawns

// Attack ranges by style (world px). Melee is short → the hero stands ADJACENT to
// its target (no visible gap); ranged + casters reach the SAME distance back (a
// caster is not longer-ranged than an archer). Tightened so the back line has to
// be reasonably close to contribute (the party stacks/moves freely to get there).
export const RANGE: Record<AttackStyle, number> = {
  melee: 22, // bumped from 10 for the larger (2×) hero sprites — keeps them clear of the enemy
  ranged: 75,
  caster: 75,
};

// Base movement speed by style (px/s) — deliberate, not a rush; the party out-paces
// them so the closing reads as the heroes advancing. Casters shuffle slowly.
export const MOVE_SPEED: Record<AttackStyle, number> = {
  melee: 18, // halved (was 35) so the party visibly does most of the closing — it reads
  ranged: 15, // as the heroes RUNNING at the enemies rather than meeting halfway (was 30)
  caster: 12, // (was 24)
};

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
/** Share of that hold after which the strip's blackout lifts and the party arrives in the new place; the stage's
 *  sign waits for it too (game/stageSign), so it never shows over the black. */
export const TELEPORT_LIFT_AT = 0.62;

// The full-party-wipe CINEMATIC (live game only — TickContext.animateWipe; headless probes and tests omit it and
// retreat + revive at once). The fallen party plays out a scripted sequence (no combat / no rng — deterministic)
// before it fights again, in beats that never overlap (user, 2026-11-15: "debería ser más escalonada, fundir a
// negro, la frase, fundir de nuevo a la zona y aparecer el cartel de la nueva zona después"):
//   1. DEAD     — the heroes lie fallen on the field, the last one's defeat playing out.
//   2. FADE     — the strip fades to black.
//   3. BLACK    — full black; the phrase comes up alone, is held to be read and leaves (WIPE_PHRASE_FADE_MS each way).
//   4. FADE     — the strip comes back from black, ALREADY on the stage the party fell back to — empty.
//   5. SIGN     — the empty stage; its sign shows (the UI's stage band, held back until now).
//   6. ARRIVE   — the heroes reappear one after another (render/arrival); nothing attacks yet.
// The stage retreat + field clear happen at WIPE_RETREAT_AT (fully black) so the world swap is hidden; the heroes
// are revived and placed at WIPE_ARRIVE_AT; the fight resumes at WIPE_TOTAL.
export const WIPE_DEAD_MS = 2400; // long enough for a hero's defeat clip (2.2–2.4 s) to play
export const WIPE_FADE_MS = 500; // fade to/from black
export const WIPE_BLACK_MS = 2200; // full black: the phrase in, held, out
export const WIPE_PHRASE_FADE_MS = 300; // the phrase's own fade in and out, inside WIPE_BLACK_MS
export const WIPE_SIGN_MS = 1800; // the empty stage under its sign (the stage band runs 1.8 s)
export const WIPE_ARRIVE_MS = 1300; // the party arriving, staggered (ARRIVE_STAGGER_MS apart)
export const WIPE_RETREAT_AT_MS = WIPE_DEAD_MS + WIPE_FADE_MS; // 2900: fully black → retreat + clear the field
export const WIPE_SIGN_AT_MS = WIPE_DEAD_MS + 2 * WIPE_FADE_MS + WIPE_BLACK_MS; // 5600: back from black → the stage's sign
export const WIPE_ARRIVE_AT_MS = WIPE_SIGN_AT_MS + WIPE_SIGN_MS; // 7400: the heroes are revived and start arriving
export const WIPE_TOTAL_MS = WIPE_ARRIVE_AT_MS + WIPE_ARRIVE_MS; // 8700
/** Heroes of a party that comes back (after a defeat, in a new world) arrive this far apart, front to back. */
export const ARRIVE_STAGGER_MS = 220;

// The BOSS-DOWN beat (live game only — TickContext.animateBossDown; headless probes and tests omit it, so pacing
// and determinism measurements do not change). When a boss falls the fight is over but the journey waits: the
// party stands, the boss plays its whole death clip in ITS world and lies there a moment, and only then the stage
// moves on (for a world boss: the teleport to the next world). No combat and no rng during the beat. The win
// itself — rewards and the cleared stage — is banked at the killing blow, so closing the game mid-beat loses
// nothing. Per rank, in ms; 0 = no beat. The world boss's must outlast the longest death clip a boss figure has
// (test/game/bossDown.test.ts checks it against the exported figures). A stage boss needs none: its stage is
// in the same world and its corpse keeps falling behind the party as it walks on.
export const BOSS_DOWN_MS: Readonly<Record<'stageBoss' | 'worldBoss', number>> = { stageBoss: 0, worldBoss: 5200 };
/** The strip fades to black over this last stretch of a world boss's beat when the win leads to another world. */
export const BOSS_DOWN_FADE_MS = 500;

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
// 110 (was 150) and the enemies' speeds below (were 100 / 80) are the user's call of 2026-11-15: "bajar la
// velocidad de movimiento de los héroes un poco, y hacer que los enemigos avancen también más lento… al spawnear
// prácticamente chocan al instante". With a wave appearing SPAWN_AHEAD px away the two sides now take about a
// second and a half to meet (it was three quarters of a second).
export const WALK_SPEED = 110;
export const SPAWN_AHEAD = 280; // how far ahead of the lead hero a wave spawns (was 240)

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
  melee: 50,
  ranged: 40,
  caster: 40, // unused — no caster enemy ships; kept to satisfy the AttackStyle record
};

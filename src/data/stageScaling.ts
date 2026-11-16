// THE scaling bible, implemented (DIFFICULTY.md — canonical, supersedes SPEC's
// linear example). Phase 2: the master scale Φ(S) is now a POLYNOMIAL B-curve
// P(S) = (1 + S/P_K)^P_EXP — NOT the old exponential product (which blew up to ~e42 by
// world 50). Enemy stats, mitigation, income and XP all derive from Φ; flat gear scales
// Φ^EG_FLAT (~1.0) and gems likewise, so the gear-vs-enemy RATIO is controlled and all
// magnitudes shrink together into a readable range (hundreds → low thousands, never e42).
// Percent stats are gently ilvl-scaled + bounded (sim/loot.ts + ENABLER_SOFT_CAPS).
//
// The curve is convex (absolute per-stage growth ACCELERATES — 50→51 harder than 1→2) but
// polynomially bounded, so the per-stage RATIO g(S)=P(S)/P(S-1) gently DECREASES (unlike the
// old exponential's increasing ratio). Consequence (§2d): the on-level power gap
// P(S)/P(S-lag) → ~1 at depth, so on-level fights stay winnable everywhere and the real
// time-gate is re-sourced onto the zone-boss WALLS + the gear-acquisition treadmill.

// ── Master growth — polynomial B-curve P(S) = (1 + S/P_K)^P_EXP ──
export const P_K = 600; // curve knee (stages) — larger = gentler early ramp, later acceleration
export const P_EXP = 3.0; // polynomial degree — steepness of the accelerating tail

// ── Enemy stats ──
export const DMG0 = 6;
// Phase 2: enemy damage = DMG0·Φ^DMG_EXP. DMG0 is the stage-1 FLOOR (kept low so the fresh
// solo-knight bootstrap survives 1-1 — memory fresh-start-must-bootstrap); DMG_EXP is the RAMP.
// Raised 0.82→1.0 so mid-game trash actually CHIPS the party (texture — the tank/healer matter)
// instead of the old "damage lags HP" near-zero threat, while leaving the bootstrap floor
// untouched. Tuned to sim-survival's minHP% column; bootstrap re-checked via sim-newgame.
export const DMG_EXP = 1.2; // tune-pass: 1.0→1.2 — enemy damage ramps harder with depth (waves + bosses threaten) while the stage-1 floor (Φ≈1) stays bootstrap-safe
export const ENEMY_BASE_ATTACK_SPEED = 0.8; // attacks/sec baseline

// ── DECOUPLED boss HP (2d) — each boss has its OWN Φ-power scale, INDEPENDENT of trash and of
// each other (user directive). Bosses scale STEEPER than party DPS (party ≈ Φ^1.6-2 fully
// geared) so their TTK HOLDS or GROWS with depth — the gate never erodes (the bug when bosses
// rode trash HP at ~Φ^1.3 and facerolled deep). Each function also takes an optional per-world
// OVERRIDE map for the rare world the formula misfits — the "tune individual bosses" escape
// hatch (the finite 50-world game, so only a rare misfit world ever needs a pin), layered on
// top of the clean default. Boss DAMAGE still rides enemyDamage × these mults.
export const BOSS_DMG_MULT = 6.5; // tune-pass: 5.0→6.5 — stage bosses actually pressure party HP (mildly challenging, not a faceroll)
export const ZONE_BOSS_DMG_MULT = 7.0; // tune-pass: 5.5→7.0 — world bosses hit hard (enrage on an over-long fight forces farming) without making the deep-tail survival cliff razor-thin

// Stage boss (W-1..W-9): a real fight, NOT a wall — 5–10 seconds against the on-gear party (the anchor table
// STAGE_BOSS_HP_TUNE below; an override pins a world by hand).
export const STAGE_BOSS_HP_OVERRIDE: Record<number, number> = {}; // world → absolute HP (rare manual pin)
export function stageBossHp(S: number): number {
  const o = STAGE_BOSS_HP_OVERRIDE[worldOf(S)];
  if (o !== undefined) return o;
  return STAGE_BOSS_HP_TUNE[tunePoint(S)] ?? 1;
}

// Zone/world boss (W-10): THE WALL / gear-check. Scales a HAIR steeper than party power (Φ^1.8)
// so its TTK GROWS with depth → each world takes a bit longer = the decelerating curve. Sized so
// good world ITEMS clear it within the enrage+survival window (gems/level are premium HEADROOM,
// never required — directive); the PREVIOUS world's gear fails → you farm a few new pieces. Each
// world's LENGTH is set by the per-world `WORLD_WALL_MULT` table × the farm treadmill.
export const ZONE_BOSS_C = 260_000; // tune-pass: small bump over the 240k smoothing pass — the wall→months curve is hypersensitive near the gear ceiling (240k→1.7mo, 300k→7.9mo+bricks), so nudge gently toward ~2.5mo
export const ZONE_BOSS_EXP = 1.0; // track gear's Φ^1.0 ilvl growth — the boss BASE keeps pace with raw gear; the per-world WALL excess comes from WORLD_WALL_GROWTH, so no difficulty bricks at its tail
// Soft SATURATION (deep-tail flattener): the realistic gear ceiling saturates (level cap + gem
// caps), so a pure Φ^2.1 wall would cross it and brick (~W165). Dividing by (1+Φ/SAT) flattens
// the deep wall to ~Φ^1.1, keeping it well below the absolute ceiling (0.2-0.5×) through W250+ —
// so the deep Torment tail is the intended multi-week grind, never a hard stop. Calibrated via
// `npm run probe` (the finite curve is shaped per-world in `WORLD_WALL_MULT`).
export const ZONE_BOSS_SAT = 80; // tune-pass: 18→80 — finite game (Φ tops ~6.2), so relax the deep-tail flattener; the wall should BITE through Torment, not saturate away
// Early-world ramp (the "easy opening"): the flat C dominates when the party is still weak, so
// without this the early walls would exceed the (low) early-game gear ceiling and brick. Ramp
// 0.12 (W1) → 1.0 (W22) — long/low so the opening worlds stay beatable as gear ramps up.
export const ZONE_BOSS_RAMP_START = 0.12;
export const ZONE_BOSS_RAMP_END_WORLD = 22;
export const ZONE_BOSS_HP_OVERRIDE: Record<number, number> = {}; // world → absolute HP (rare manual pin)
export function zoneBossHp(S: number): number {
  const W = worldOf(S);
  const o = ZONE_BOSS_HP_OVERRIDE[W];
  if (o !== undefined) return o;
  const ramp = Math.min(1, ZONE_BOSS_RAMP_START + (1 - ZONE_BOSS_RAMP_START) * Math.max(0, W - 1) / (ZONE_BOSS_RAMP_END_WORLD - 1));
  // wallWorldMult is the per-world table (it already bakes in the per-difficulty step).
  return (ZONE_BOSS_C * phi(S) ** ZONE_BOSS_EXP * ramp * wallWorldMult(S)) / (1 + phi(S) / ZONE_BOSS_SAT);
}
// A stage is a lane-pusher "area": 20 enemy WAVES (each fills the progress bar 5%)
// then the stage boss. Each wave is 2–8 mixed enemies that advance from the edge.
// Trash are weaker than the §12 reference enemy (TRASH_HP_FRACTION) so ~100 enemies
// per stage clear in a reasonable, watchable time. Bosses/zone boss use the full
// reference HP × their mult. (Pacing knobs — the §12 enemyHp/Φ/income are unchanged.)
// WAVES PER STAGE, BY DIFFICULTY (Normal … Torment) — user, 2026-11-15 round 2: "Normal debería poder pasarse en
// 3-4 horas, y luego cada dificultad extra debería ser cada vez más y más exigente". With enemies that take two or
// three hits a wave lasts 10 s (five enemies) to 30 s (twenty-two), so twenty waves make an X-9 a ten-minute
// stage — right for Eternal and Torment, and three times what Normal's four hours allow (100 stages in 240
// minutes). Normal's stages are eight waves (about 1¼ minutes at X-1, 3½ at X-9: a world in some 20 minutes), and
// the count grows with each difficulty until the full twenty.
// Normal 16 · Hell 17 · Inferno 18 · Eternal 19 · Torment 20 (user decision, 2026-11-15; wired 2026-11-16).
export const WAVES_BY_DIFFICULTY: readonly number[] = [16, 17, 18, 19, 20];
export function wavesPerStage(S: number): number {
  return WAVES_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor((Math.max(1, S) - 1) / 100)))] ?? 20;
}

// Wave size ramps by the stage's position WITHIN its world (X-1 easiest → X-9 hardest),
// so difficulty climbs across a world instead of within a single stage's waves. Indexed by
// stageInWorld 1..9; X-10 is the boss (no trash waves). A wave teleports in as WAVE_BATCHES
// batches (field.ts), each spread across a band so they arrive as loose groups.
const WAVE_SIZE_BY_STAGE = [5, 6, 7, 8, 10, 12, 15, 18, 22] as const; // tune-pass: steeper X-7/8/9 spike (more mobs = more incoming pressure late in a world)

/** × wave size by difficulty (Normal → Torment). Normal's stage went from 8 waves to 16 (2026-11-16) and Normal must
 *  stay a 3–4 hour stroll: its waves are smaller instead of its enemies weaker (an enemy still takes its 2–3 hits). */
export const WAVE_SIZE_MULT_BY_DIFFICULTY: readonly number[] = [0.6, 1, 1, 1, 1];

/** Enemies per wave for a stage, ramped by its position within the world (X-1..X-9), × its difficulty's share. */
export function waveSizeForStage(globalStageIndex: number): number {
  const s = stageInWorld(globalStageIndex); // 1..10 (10 = boss stage)
  const base = WAVE_SIZE_BY_STAGE[Math.min(s, 9) - 1] ?? 5;
  const mult = WAVE_SIZE_MULT_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor((Math.max(1, globalStageIndex) - 1) / 100)))] ?? 1;
  return Math.max(3, Math.round(base * mult));
}

// Elite ("champion") trash: a per-mob chance to roll a beefed-up enemy — bigger, hits and
// soaks 5× a normal mob of its kind, and DOUBLES its chest-drop chance (the loot carrot).
// Elites are the on-level THREAT (the doc's §2d "trash is clearable on-level" leaves a built
// party near-untouched by normal mobs — the healer-trio out-heals base chip — so the texture
// comes from these champion spikes, NOT from inflating base HP0/DMG0, which would break the
// fresh-start bootstrap). At 5×/5× an elite is a serious burst of DANGER (the tank/healer must
// react) AND a chunkier kill. Rarer now (5%) so the spikes stay occasional rather than constant.
// Rides on enemyDamage, so it stays bootstrap-safe. Tuned to sim-survival's minHP% dips.
export const ELITE_CHANCE = 0.08; // tune-pass: 0.05→0.08 — more frequent champion spikes (the wave threat texture)
export const ELITE_MIN_STAGE = 5; // no elites before this global stage — protects the fresh-Knight bootstrap (a single elite one-shots a naked L1); elites become the threat once you have a few drops
export const ELITE_HP_MULT = 4.5; // a grunt takes ~2.5 hits of the party's hardest hitter, so an elite about 11 (the anchor: 10–12)
export const ELITE_DMG_MULT = 5;
export const ELITE_CHEST_MULT = 2;
// Trash are tuned to be "soldiers", not glass cannons: enough HP that a single auto
// doesn't delete them (no faceroll), but their hits are softened so a geared frontline
// survives the longer fight (TRASH_DMG_FRACTION). Bosses are untouched by these.
// Trash sit at 1.5× the §12 reference enemy HP — durable "soldiers" that take several
// autos so a low-gear / no-talent / no-tech party can't 1-2-shot them, while the early
// game stays reasonably snappy (a 2× bump made the gearless opening a slog). This is a
// flat multiplier on the reference, NOT a steeper Φ exponent — the exponent must stay
// at the geared baseline or invariant #2 "geared never hard-walls" breaks. Damage is
// left softer (0.6) so a geared frontline still tanks the longer fight. The fresh
// *healer* (priest, 5 dmg) is exempt from invariant #0's "not a slog" bound.
export const TRASH_HP_FRACTION = 1.5;
// ── THE TOUGHNESS ANCHORS and their tables (user, 2026-11-15) ──
// Enemy toughness is anchored to HITS and SECONDS against a party with on-level gear (the probe's average
// player at that point — test/sim/probe), not to a formula's guess of what gear should be:
//   - a NORMAL enemy (a grunt) survives 2–3 basic hits of the party's hardest hitter: never a one-shot;
//   - an ELITE has ELITE_HP_MULT times that (about 11 hits);
//   - a STAGE boss (X-1 … X-9) lasts 5–10 seconds against the full party;
//   - the WORLD boss is the wall, tuned for the length of its world (WORLD_WALL_MULT), not for seconds.
// Each rank has its OWN table, one entry per tuning point: the ten stages of world 1 one by one (the opening,
// where a party goes from one naked Knight to a trio in an hour), then one entry per world, 2 … 50. A party's
// power moves while it farms at a wall, not during the fifty minutes of a pass, so inside a world the tables are
// flat (the waves grow instead: WAVE_SIZE_BY_STAGE) and they step up at each new world. TRASH_DMG_TUNE is the
// counterweight: enemies that live longer hit for longer, so trash damage is lowered, per point, to what the
// arriving party clears without wiping. The tables are written by `scripts/tune-pacing.ts`, which measures the
// probe's party at every point (a weapon is most of a hero's hit, so the numbers leap when the first ones drop:
// from world 1 to world 2 a grunt's life grows tenfold); `scripts/measure-anchors.ts` prints the anchors along
// the game and test/sim/anchors.test.ts pins them.
export const TUNE_POINTS = 59;
/** The tuning point of a global stage: 0–9 = stages 1-1 … 1-10, then 10 + (world − 2) for worlds 2 … 50. */
export function tunePoint(S: number): number {
  const g = Math.max(1, Math.floor(S));
  return g <= 10 ? g - 1 : Math.min(TUNE_POINTS - 1, 8 + worldOf(g));
}
/** Life of a GRUNT (the plain melee enemy) at each tuning point: 2.5 basic hits of the on-gear hardest hitter. */
export const GRUNT_HP_TUNE: number[] = [
  31.5, 54.7, 60.7, 70.1, 74.0, 84.4, 92.1, 100, 101, 101,
  113, 149, 342, 531, 685, 782, 821, 846, 881, 1070,
  1560, 2350, 3310, 4050, 4700, 5490, 6070, 6620, 7260, 8140,
  9330, 10100, 10900, 12200, 13800, 15500, 17200, 19400, 22900, 27200,
  30800, 34500, 39300, 45600, 53300, 62700, 72100, 79700, 89600, 101000,
  109000, 117000, 129000, 147000, 169000, 190000, 210000, 233000, 254000,
];
/** Life of the STAGE BOSS at each tuning point: 7.5 seconds of the on-gear party. */
export const STAGE_BOSS_HP_TUNE: number[] = [
  86.9, 148, 180, 194, 504, 583, 666, 845, 943, 943,
  1100, 1560, 2990, 4720, 5900, 6720, 7080, 7430, 8180, 10300,
  16100, 27500, 40200, 50100, 57500, 62300, 66900, 75600, 88300, 99300,
  109000, 121000, 134000, 156000, 197000, 237000, 277000, 333000, 399000, 462000,
  531000, 634000, 790000, 963000, 1100000, 1280000, 1510000, 1670000, 1850000, 2110000,
  2250000, 2310000, 2600000, 3120000, 3680000, 4090000, 4490000, 5080000, 5550000,
];
/** Trash DAMAGE at each tuning point, as a share of the formula's (`enemyDamage`): 1 where the arriving party
 *  clears the point's hardest stage cleanly, less where it would wipe. */
export const TRASH_DMG_TUNE: number[] = [
  1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 0.620, 0.750, 0.620, 1.00,
  0.390, 0.320, 0.240, 0.220, 0.200, 0.200, 0.220, 0.240, 0.234, 0.170,
  0.200, 0.291, 0.350, 0.390, 0.449, 0.470, 0.510, 0.560, 0.576, 0.510,
  0.500, 0.470, 0.607, 0.715, 0.750, 0.820, 0.952, 1.00, 0.908, 0.680,
  0.680, 0.748, 0.820, 0.952, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00,
  1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00,
];
// ── THE BOSS-HIT ANCHOR (round 6, 2026-11-16; docs/redesign/PACING_REPORT.md «Ronda 5 · C», «Ronda 6») ──
// A boss's life is anchored to the party's damage; since round 6 its DAMAGE is anchored to the tank's life. Round 5 · C
// measured why nothing threatened a geared party: the formula's damage (DMG0·Φ^1.2·1.3^d) went flat against the
// Knight from Inferno on, while the Priest's heals — a % of the life healed — refill ~4 % a second whatever the
// gear. So the hit a boss deals is a fixed table, one entry per world, written ONCE by `scripts/boss-hit-tune.ts`
// from the probe's average Knight at that wall (its life, its armour and magic resist against the boss's own
// physical/magic mix): the world boss's sustained damage on him — its basic hits and its area blow's main hit —
// takes BOSS_THREAT_PCT % of his life a second after his mitigation, before block, Stone Skin, Debilitating Cleave
// and heals (the defensive build's tools). It is DATA, not a reaction: a player who outgears the average Knight takes
// less, one below it more. The difficulty's target eases in over its first worlds with the rest of the world-boss
// pressure (bossKit pressureWeight), and the enrage multiplies on top. World 1 keeps the formula (the bootstrap).
/** % of the average Knight's life a second the WORLD boss takes off him after his mitigation, Normal … Torment.
 *  Set against what the probe's Priest can heal him a second when he is pressed (scripts/heal-capacity.ts, round 6):
 *  ≈ 3.5–5 % in Hell, 5–9 % in Inferno, ≈ 11 % in Eternal, 15–28 % in Torment — her heals are a % of his life × her
 *  heal power, so they grow with her gear. Hell sits at what she heals (an offensive Knight scrapes through); from
 *  Inferno it sits above it by about what Stone Skin and Debilitating Cleave take off (a Knight without them does
 *  not hold the minute). The user chose 2 / 3 / 3.5 / 4 % on a first estimate of a flat ~4 % of healing, which
 *  the measure proved wrong; these keep the decision's intent («cerca de lo que cura la Priest»). */
export const BOSS_THREAT_PCT: readonly [number, number, number, number, number] = [1, 4, 9, 14, 24];
/** A STAGE boss presses the front at this share of its world boss's target: the defensive build shows outside the
 *  walls too, while a stage boss (5–10 s) never threatens the farm. */
export const STAGE_BOSS_THREAT_SHARE = 0.6;
/** The world boss's basic hit, world 1 … 50 (scripts/boss-hit-tune.ts). */
export const ZONE_BOSS_HIT_TUNE: number[] = [
  17.4, 5.45, 6.09, 6.25, 6.65, 8.3, 9.78, 10.9, 14.2, 14.4,
  36.5, 80, 129, 167, 250, 294, 383, 421, 597, 714,
  963, 1170, 1660, 1830, 2270, 2370, 2730, 2730, 3030, 3040,
  3570, 5070, 5140, 5640, 6190, 6960, 7210, 7170, 7120, 8380,
  9770, 15600, 18300, 26700, 30100, 31600, 31100, 30500, 30500, 30800,
];
/** The stage bosses' basic hit, world 1 … 50 (scripts/boss-hit-tune.ts; against the Knight that reaches the wall). */
export const STAGE_BOSS_HIT_TUNE: number[] = [
  13.2, 3.26, 3.66, 3.73, 4.01, 4.99, 5.56, 6.66, 6.63, 8.74,
  19, 31.7, 50.3, 59.5, 65.5, 109, 115, 157, 173, 243,
  426, 542, 661, 780, 902, 1040, 1150, 1290, 1290, 1440,
  1700, 2030, 2960, 2800, 3100, 3380, 3600, 3840, 3890, 3810,
  5480, 6440, 10300, 10700, 15600, 17600, 18500, 18200, 17900, 17800,
];

/** The world boss's basic hit at global stage `S`: the anchor table, or the formula where it has no entry (world 1). */
export function zoneBossHit(S: number): number {
  const w = worldOf(S);
  const tuned = w >= 2 ? ZONE_BOSS_HIT_TUNE[w - 1] : undefined;
  return tuned ?? enemyDamage(S) * ZONE_BOSS_DMG_MULT;
}
/** A stage boss's basic hit at global stage `S`: the anchor table, or the formula where it has no entry (world 1). */
export function stageBossHit(S: number): number {
  const w = worldOf(S);
  const tuned = w >= 2 ? STAGE_BOSS_HIT_TUNE[w - 1] : undefined;
  return tuned ?? enemyDamage(S) * BOSS_DMG_MULT;
}

export function trashDmgTune(S: number): number {
  return TRASH_DMG_TUNE[tunePoint(S)] ?? 1;
}
export const TRASH_DMG_FRACTION = 0.75; // tune-pass: 0.6→0.75 — waves chip harder (kept moderate to protect the solo-knight bootstrap)

// Boss/zone-boss kills pay a multiple of per-kill income.
export const BOSS_INCOME_MULT = 8;
export const ZONE_BOSS_INCOME_MULT = 40;

// ── Mitigation ──
// C_MIT is the armor "half-value" coefficient: on-level DR = armor/(armor + C_MIT·Φ^MIT_EXP),
// so DR≈50% when a tank's aggregated armor ≈ C_MIT·Φ. Phase 2 re-anchor against the widened
// tier mults (T8=9×) + GEAR_POWER=9. Tuned to scripts/sim-survival.ts (a realistic best-drops
// tank, not a pure-armor-stack): C_MIT=450 yields a DR that ramps with the tier ladder —
// squishy early (~10-25% at W5-10, only low tiers unlocked), ~46-49% through the heart of the
// game (W50-80, the ~50% target), and a farm-reward climb to ~65-70% deep (still under the 90%
// cap). MIT_EXP stays 1.0 (armor is a flat Φ^1.0 stat; tier inflation is the factor C_MIT
// absorbs). Was 50 (tuned to the old exponential Φ, which tracked the exploding armor for free).
export const C_MIT = 450;
export const MIT_EXP = 1.0; // MUST track EG_FLAT (armor is a flat stat)
// Cap on the flat `damageReduction` stat (a defensive-buff mechanic) so it can never
// reach immunity, however many sources stack — a bounded percent stat (DIFFICULTY.md §6).
export const MAX_DAMAGE_REDUCTION = 80;
// NOTE: multistrike / critChance / block / cooldownReduction are now bounded via the
// DIMINISHING-RETURNS soft caps in data/stats.ts (ENABLER_SOFT_CAPS), not hard caps here.

// Boss enrage (the DPS-race wall, DIFFICULTY.md §5). A boss hits as written for its window and then its damage
// doubles every RAMP: the fight is meant to END at the window. A world boss's life is tuned so that a party geared
// at 80-90 % of what its world offers kills it at ~60 s (user, 2026-11-15); a party below that has to hold some
// seconds of enrage to finish, and a party far below does not make it. Stage bosses share the window and are
// meant to die in 5-10 s, so theirs only bites a party that should not be there.
export const ZONE_ENRAGE_MS = 60_000; // world boss (X-10) — the gate
export const STAGE_ENRAGE_MS = 60_000; // stage bosses share the window
// Boss damage doubles every RAMP ms past the window: ×2 after 2 s, ×6 after 5 s, ×32 after 10 s. Measured: a party
// holds about ten seconds of it in Hell and up to fifteen in Torment (its tank is sturdier there) — "unos segundos".
export const BOSS_ENRAGE_RAMP_MS = 2000;
/** The ramp by difficulty, Normal … Torment (round 5, 2026-11-16, user: «sí, más dura»): from Inferno a boss's
 *  damage doubles every second past the window (×32 five seconds in), so holding its enrage is all but impossible
 *  and the ladder's % is what a party really needs to end the fight at the minute. Normal and Hell keep the
 *  softer ramp: a party a little short still scrapes through with a few seconds of it. */
export const ENRAGE_RAMP_MS_BY_DIFFICULTY: readonly [number, number, number, number, number] = [2000, 1500, 1000, 1000, 1000];

/** The enrage ramp of a boss at difficulty index `d`. */
export function enrageRampMs(d: number): number {
  return ENRAGE_RAMP_MS_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor(d)))] ?? BOSS_ENRAGE_RAMP_MS;
}

/** Boss damage multiplier from enrage: 1 until `windowMs`, then doubles every `rampMs`. */
export function enrageMultiplier(fightMs: number, windowMs: number, rampMs: number = BOSS_ENRAGE_RAMP_MS): number {
  if (fightMs <= windowMs) return 1;
  return 2 ** ((fightMs - windowMs) / Math.max(1, rampMs));
}

// ── Gear power ──
export const EG_FLAT = 1.0; // flat-stat gear exponent — MUST be ~1.0 (in [0.98,1.0])
// Global multiplier on FLAT gear-stat rolls (REBALANCE re-anchor knob). Hero base
// stats were cut so a fresh hero is matched to stage 1; this lifts the Φ-scaled
// gear term to recover full power once geared. Tuned via the smoke harness.
export const GEAR_POWER = 9.0;

// Gem rework: a socketed gem grants this fraction of ONE same-tier, same-ilvl gear affix
// of its stat (sim/gems.gemGrants), using the SAME normalization gear uses (roll-band ×
// tierMult × GEAR_POWER × Φ(ilvl)). So every gem type is a consistent, predictable
// fraction of an affix at any tier/ilvl — and scales with ilvl + tier exactly like gear.
// Multi-stat gems (Diamond) split this fraction across their stats. BALANCE: raising this
// lifts aggregate gear power (up to 4 sockets/item) — re-check the walls via sim-worlds /
// sim-survival when changing it.
export const GEM_AFFIX_FRACTION = 0.9; // tune-pass: 0.5→0.9 — gems are a major, depth-weighted power axis (T8 gems across ~20-30 sockets ≫ T4). Farming a full T8 gem set is the "perfect your gear" grind that gives the DPS ceiling to crack the deep S-curve walls within the enrage window

// The master scale Φ(S) = P(S) = (1 + S/P_K)^P_EXP. Closed-form (no memo needed); accepts
// fractional S (used for ilvl/expectedLevel) and is monotonic, convex, and finite everywhere.
export function phi(S: number): number {
  if (S <= 0) return 1;
  return Math.pow(1 + S / P_K, P_EXP);
}

// Per-stage growth RATIO g(S) = P(S)/P(S-1). Kept for callers/tests that reason about
// per-stage difficulty. Under the polynomial this gently DECREASES toward 1 with depth
// (the relative jump shrinks), while the ABSOLUTE increment P(S)-P(S-1) grows — that
// rising absolute increment is the "accelerating difficulty" (DIFFICULTY.md §11 #4).
export function g(S: number): number {
  if (S <= 1) return phi(1) / phi(0);
  return phi(S) / phi(S - 1);
}

// ── Per-DIFFICULTY escalation (the accelerating curve) ──
// phi(S) is near-flat (1→6.2 over the whole game) and its per-difficulty RATIO actually
// DECELERATES, while player gear jumps a full tier each difficulty — so without an explicit
// per-difficulty step, difficulty mathematically decelerates. These key off the difficulty index
// (0=Normal … 4=Torment). Normal (d=0) is ×1 — "quick progress, no walls". Enemies + stage bosses
// take a modest step each difficulty; WORLD bosses get the big ACCELERATING wall multiplier (the
// farm-gate that must grow each difficulty). Tuned against the progression probe (npm run probe).
export const ENEMY_DIFF_MULT = 1.3; // per-difficulty enemy HP & damage step. Kept modest because it ALSO compounds into boss damage (×ZONE_BOSS_DMG_MULT) — too high turns deep walls into binary instant-wipe cliffs instead of tunable DPS-races
// World-boss difficulty is a SMOOTH S-CURVE (logistic) over the 50 worlds — NOT a per-difficulty
// cliff, NOT a geometric runaway, NOT a front-loaded saturating curve. Shape:
//   mult(w) = 1 + (WALL_CEIL-1) / (1 + e^(-WALL_RATE·(w - WALL_MID)))
// This is FLAT & low early (Normal/Hell cruise), ACCELERATING through the middle (Inferno/Eternal
// — "it increases a lot the further you go"), then SATURATING toward WALL_CEIL deep in Torment so
// it approaches but never crosses the capped gear ceiling (no brick). The grind stays DISTRIBUTED
// (farm a little, beat one, repeat); the deep-game LENGTH comes from gear getting slow near max
// (farming the last T8 pieces + a full T8 gem set), not the wall outrunning gear.
export const WALL_CEIL = 64; // deep-game world-boss HP multiplier the S-curve approaches — kept modest: CEIL=72 pushed the Eternal/Torment walls into the gear ceiling and BRICKED (W39 stalled 1.7mo). Slightly above the 62 smoothing pass for a touch more deep bite.
export const WALL_MID = 40; // world index of the curve's steepest point — pushed deeper (35→40) so the steep wall climb lands in Eternal/Torment, NOT at the Inferno gate (W30), flattening the Inferno spike
export const WALL_RATE = 0.15; // steepness of the ramp through the middle
// Explicit per-DIFFICULTY wall step (d = 0 Normal … 4 Torment), multiplied INTO the world
// boss HP on top of the world S-curve. The S-curve SATURATES toward WALL_CEIL at the top, so
// without this Torment's walls grow SLOWER than Eternal's just as the T8 gear jump (×1.5 tier
// power) lands → Torment ends up EASIER/faster than Eternal (probe: Torment bosses died in
// ~40s vs Eternal ~60s, and Torment added only ~0.6d active). This step re-asserts the design
// goal — each difficulty's wall is NOTICEABLY harder than the last, back-loaded so Torment is
// the grind. Early difficulties stay at ×1 (Normal/Hell cruise, the good early ramp untouched);
// it ramps up super-linearly through Inferno→Eternal→Torment. ONLY scales wall HP (TTK/gear-
// gate), never boss DAMAGE — so deeper walls are a longer DPS race, not an instant-wipe cliff.
// Tuned against the progression probe (npm run probe).
export const WALL_DIFF_MULT = [1, 1, 1, 1.25, 1.7] as const;
function difficultyStep(S: number): number {
  return Math.max(0, Math.min(4, Math.floor((Math.max(1, S) - 1) / 100)));
}
export function enemyDiffMult(S: number): number {
  return ENEMY_DIFF_MULT ** difficultyStep(S);
}
/** Per-difficulty multiplier applied to WORLD-BOSS HP (the wall) — counters the S-curve's
 *  top-end saturation so each difficulty's wall grows noticeably over the previous. */
export function wallDiffMult(S: number): number {
  return WALL_DIFF_MULT[difficultyStep(S)] ?? 1;
}
/** The pure S-curve × difficulty-step wall multiplier — kept as the GENERATOR/fallback that
 *  seeds the hand-tuned per-world table below (and covers any world past 50). */
export function wallCurveMult(S: number): number {
  const w = worldOf(S);
  return (1 + (WALL_CEIL - 1) / (1 + Math.exp(-WALL_RATE * (w - WALL_MID)))) * wallDiffMult(S);
}

// ── PER-WORLD wall table (the finite game has only 50 worlds, so we tune each one) ──
// One HP multiplier per world (index = world-1), applied to the zone-boss base. This REPLACES
// the global S-curve so each difficulty's gate can be shaped individually — guaranteeing a
// MONOTONIC, progressively-harder curve with no single spike and the deep Torment worlds as the
// real grind. Seeded from the smoothed S-curve (WALL_MID=40), then hand-raised through Torment
// (W41-50) so the back end keeps climbing instead of trivializing once T8 gear lands. The
// wall→months response is hypersensitive near the gear ceiling, so values are tuned against the
// progression probe (npm run probe), NOT derived analytically. Worlds past 50 fall back to the
// S-curve generator (wallCurveMult).
// THE LADDER (user, 2026-11-16, rounds 4c–4e: «manda la escalera»; a game longer than ≈ 720 h is accepted): each wall
// asks, as a % of its zone's GRADUAL CEILING (the 60 s of damage of a set at the zone's top rarity, item level, mid
// rolls and gems — climbing within a difficulty from the world-1 rarity to the world-10 one; test/sim/probe/zoneGear
// gradualCeilingDamage), a share rising in a straight line from world 1 to world 10, and each difficulty STARTS WHERE
// THE PREVIOUS ONE ENDED (round 4e): Normal 10→20 %, Hell 20→55 %, Inferno 55→70 %, Eternal 70→80 %, Torment 80→90 %.
// Fitted (round 4e) with the probe that plays like a player — Cube, life when it dies, gems counted — in three passes
// of 3 seeds (scripts/ceiling-pass.ts, scripts/wall-ask.ts: the measured ask on arrival, median, × target ÷ ask).
// Hell 1, Eternal 1 and Torment 1 sit a hair under the wall before them (same share of nearly the same ceiling).
// ROUND 5 (2026-11-16, user: «horas que suban con la dificultad», «presión gradual»): worlds 1 and 2 of Hell→Torment
// ask ×0.85 and ×0.93 of their line, and each difficulty is moved within the ±5 points the ladder allows to shape the
// hours: Normal −5, Hell −5, Inferno −5, Eternal +5, Torment −5 (scripts/ceiling-pass.ts, 4 passes of 3 seeds with the
// round-5 combat: harder enrage, gradual pressure, front lean, fixed physical/magic mix). Measured: 4 / 116 / 187 /
// 198 / 419 h. Docs: PACING_REPORT.md rounds 4c–4e and 5. Before it (round 3 · 3b, tuned for the hours ≈ 4 / 40 / 120 / 230 / 325):
// 0.27 0.193 0.2 0.16 0.16 0.135 0.14 0.16 0.141 0.15 · 0.167 0.293 0.647 0.938 0.96 0.96 0.938 0.938 1.03 1.19 ·
// 2.15 2.29 2.45 2.6 2.92 3.55 4.35 5.21 6.11 7.12 · 8.1 8.99 9.95 11.1 12.6 14.1 16.1 18.9 20.9 23.4 ·
// 30.5 33.8 39.9 48.4 55.7 63 74.8 89.4 88.4 90.
export const WORLD_WALL_MULT: readonly number[] = [
  0.236, 0.212, 0.237, 0.319, 0.36, 0.404, 0.458, 0.514, 0.558, 0.504,
  0.342, 0.521, 0.917, 1.09, 1.46, 1.77, 2.39, 3.32, 3.76, 4.32,
  3.72, 4.25, 7.13, 8.35, 10.6, 12.6, 14.9, 16.1, 18.5, 21.1,
  21.2, 26.8, 32.6, 38.6, 44.2, 50.2, 58.3, 62.5, 66.8, 71.5,
  48.8, 76.1, 115, 158, 178, 195, 227, 254, 285, 292,
];
export function wallWorldMult(S: number): number {
  return WORLD_WALL_MULT[worldOf(S) - 1] ?? wallCurveMult(S);
}

// Early-game damage ramp (bootstrap protector): a fresh solo naked Knight must survive 1-1, but
// the raised trash damage + wave swarm wore it down. Enemy DAMAGE ramps from EARLY_DMG_FLOOR at
// stage 1 up to full by EARLY_DMG_RAMP_END (~world 2), so the opening is forgiving and full
// difficulty arrives once you've geared a few pieces. Only touches the OPENING (≥END ⇒ ×1).
export const EARLY_DMG_FLOOR = 0.28; // stage-1 enemy-damage multiplier
export const EARLY_DMG_RAMP_END = 60; // global stage where enemy damage reaches full (≈ world 2, stage 2)
export function earlyDmgRamp(S: number): number {
  if (S >= EARLY_DMG_RAMP_END) return 1;
  return EARLY_DMG_FLOOR + (1 - EARLY_DMG_FLOOR) * ((Math.max(1, S) - 1) / (EARLY_DMG_RAMP_END - 1));
}

/** The trash REFERENCE HP: a grunt has TRASH_HP_FRACTION times it, each enemy kind its own share (data/enemies).
 *  Read from the anchor table (bosses have their own: stageBossHp / zoneBossHp). */
/** × wave enemies' life in Normal: its stages grew from 8 waves to 16 (2026-11-16) and Normal stays a 3–4 hour
 *  stroll (the user: "en Normal puede ser más relajado") — there a grunt falls to one or two hits. */
export const NORMAL_TRASH_HP_MULT = 0.6;

export function enemyHp(S: number): number {
  return ((GRUNT_HP_TUNE[tunePoint(S)] ?? 1) / TRASH_HP_FRACTION) * (S <= 100 ? NORMAL_TRASH_HP_MULT : 1);
}
export function enemyDamage(S: number): number {
  return DMG0 * phi(S) ** DMG_EXP * enemyDiffMult(S) * earlyDmgRamp(S);
}

// Hard cap on armor/MR damage reduction (Diablo-style). The stage-scaled denominator keeps
// an on-level tank well under this; the cap only bites when armor ≫ K(S) (massively over-geared).
export const MAX_ARMOR_DR = 0.9;

/** Mitigation in [0, MAX_ARMOR_DR]: armorEff / (armorEff + C_MIT * Φ^MIT_EXP), DR-capped. */
export function mitigation(armorEff: number, S: number): number {
  const denom = armorEff + C_MIT * phi(S) ** MIT_EXP;
  if (denom <= 0) return 0;
  return Math.min(MAX_ARMOR_DR, armorEff / denom);
}

/** The on-level armor/MR for stage S — the defense value that yields ~50% mitigation
 *  (the design anchor: DR = armor/(armor + C_MIT·Φ) = 50% when armor = C_MIT·Φ). The stats
 *  UI compares a hero's actual armor/MR to this to flag under-/over-defended for the stage. */
export function expectedDefense(S: number): number {
  return C_MIT * phi(S) ** MIT_EXP;
}

// ── Item level / level-curve spine (the rebalance) ──
// ilvl is a PURE POWER source (item flat stats scale Φ^EG_FLAT of their ilvl). There is
// NO equip-gate (DIFFICULTY.md §0: any hero equips any item; only the weapon/off-hand class
// lock remains). `expectedLevel(S)` is the level a player is meant to be at stage S and the
// anchor for generated-item ilvl: it tracks stage 1:1 through world 1 so the intro stays
// brisk, then grows SUB-LINEARLY so level (and thus geared power) LAGS the raw stage by a
// GROWING-BUT-CAPPED amount: the lag is the difficulty (you farm/level to close it, and it
// widens through the early worlds = ramped walls), but the CAP keeps the power gap
// Φ(S)/Φ(expectedLevel) BOUNDED so on-level stays winnable at any stage (an unbounded lag
// makes late stages mathematically impossible — the bug the survival probe caught).
// FINITE model (DIFFICULTY.md §7): the on-track level over the 500-stage game maps to
// [1..~115] — fast early, decelerating, landing ~L115 by Torment 10-10 (L120 is the
// post-completion grind). This is also the anchor for generated-item ilvl, so gear power
// now tracks an L≤120 party instead of the old infinite expectedLevel≈stage (which put
// ilvl~480 gear on a level-capped party — trivializing the truncated curve). Curve:
// L(G) = LVL_AT_END·(1 - (1 - G/500)^LVL_EXP). Fitted to the spine bands (≈L42/66/86/103/114).
export const FINITE_STAGES = 500; // = MAX_GLOBAL_STAGE (kept local to avoid a data import cycle)
export const LVL_AT_END = 115; // on-track level at G=500 (Torment 10-10); L120 is the post-grind
export const LVL_EXP = 1.6; // curve steepness (fast early, decelerating)

export function expectedLevel(S: number): number {
  const g = Math.max(0, Math.min(FINITE_STAGES, S));
  const lvl = LVL_AT_END * (1 - Math.pow(1 - g / FINITE_STAGES, LVL_EXP));
  return Math.max(1, Math.min(MAX_LEVEL, Math.round(lvl)));
}

// ── Percent-affix ilvl feel (so items feel like upgrades) ──
// Flat affixes scale with Φ(ilvl); percent affixes (attackSpeed/crit/healPower/CDR) deliberately do
// NOT (they're bounded enablers — raw ilvl scaling would blow past their soft caps). To still make a
// higher-ilvl item of the SAME tier feel like an upgrade on its %, the percent roll is multiplied by
// a BOUNDED ilvl factor growing PCT_AFFIX_LO→PCT_AFFIX_HI across the level spine. The soft caps
// (sim/stats) absorb the top, so this can't run away. Applied to item affixes AND gem grants.
export const PCT_AFFIX_LO = 0.5; // percent-affix multiplier at ilvl 1
export const PCT_AFFIX_HI = 1.5; // percent-affix multiplier once SATURATED (≈ Inferno-ilvl onward)
export const PCT_AFFIX_FULL_ILVL = 80; // ilvl where the buff saturates (~Inferno) — beyond here, % upgrade feel comes from the TIER jump, not more ilvl (avoids over-buffing the endgame)
export function pctAffixIlvlMult(ilvl: number): number {
  const t = Math.max(0, Math.min(1, (ilvl - 1) / (PCT_AFFIX_FULL_ILVL - 1)));
  return PCT_AFFIX_LO + (PCT_AFFIX_HI - PCT_AFFIX_LO) * t;
}

// ── Income (sub-linear in Φ so the economy keeps pace without trivializing) ──
// Deliberately TIGHT (design directive): gold gates the tech-unlock pace and XP
// gates leveling, so the player must FARM, not just advance non-stop. Tech gold×/xp×
// bonuses (up to ~23×/~13× fully invested) are the relief that rewards Economy nodes.
// These bases supersede BALANCE.md's looser 5/6 (see DIFFICULTY.md §8 note).
export const GOLD_PER_KILL_BASE = 3; // was 5 (×3 test-mult also removed)
export const XP_PER_KILL_BASE = 4; // was 6 — leveling ~1.5× slower (kept early-snappy)
// Gold buys NON-COMBAT tech only (economy/QoL), so it can't be a buy-your-power runaway —
// the old ^0.8 tame (to throttle combat-tech) is no longer needed; back to ^0.85.
export function goldPerKill(S: number): number {
  return Math.round(GOLD_PER_KILL_BASE * phi(S) ** 0.85);
}
export function xpPerKill(S: number): number {
  return Math.round(XP_PER_KILL_BASE * phi(S) ** 0.5);
}

// ── Level curve — cheap early, steep tail, hard-capped at MAX_LEVEL ──
// Two regimes: a cheap polynomial (0.5·L^3.5) so a fresh party levels into its core talents/
// abilities fast (≈L50 by world ~8) and the opening worlds flow, plus a steep tail
// (4.4^(L-39), negligible below ~L45) that turns the climb to the cap into a months-long
// grind tracking the deep, wall-gated worlds. Safe to be steep because gear is DECOUPLED
// from level (it can't gate content) and level is hard-capped — so this can't recreate the
// old impossibility. Paced against the finite difficulty timeline (~2-3 months to Torment
// 10-10); L120 is the post-completion grind, not on the critical path.
export const MAX_LEVEL = 120;
// FINITE model: a pure polynomial (the old 4.4^(L-39) tail hard-capped a farming party at
// ~L46, far below the L≤115 the 500-stage game now needs). Cheap early (core talents/abilities
// land fast), steepening smoothly so the climb to L115+ is a long farm spread across the deep
// difficulties — but always reachable (no exponential brick). Co-tuned with xpPerKill.
// RETUNE 2026-11-15 (the 3-month game, ~720 active hours): the pure 0.7·L^3.5 put a party at L72 by the end of
// Normal and at the cap in Inferno, so levels stopped mattering for the second half. Two factors now stretch it
// without touching the opening: `(1 + (L/XP_MID_LEVEL)^XP_MID_EXP)` makes the middle levels cost more (≈×1.6 at
// L20, ×2.9 at L50, ×4.6 at L88), and a steep last-levels tail keeps L120 for the end of Torment. Fitted to the
// experience the probe's player earns at the target pace (away time included): about L50 at the end of Normal,
// L70 Hell, L88 Inferno, L107 Eternal, L119 Torment.
export const XP_BASE = 0.7;
export const XP_EXP = 3.5;
export const XP_MID_LEVEL = 30;
export const XP_MID_EXP = 1.05;
export const XP_TAIL = 2_000_000; // experience the tail adds at the cap
export const XP_TAIL_EXP = 20;
export function totalExpToReach(L: number): number {
  const Lc = Math.min(L, MAX_LEVEL);
  if (Lc <= 1) return 0;
  return Math.round(XP_BASE * Math.pow(Lc, XP_EXP) * (1 + Math.pow(Lc / XP_MID_LEVEL, XP_MID_EXP)) + XP_TAIL * Math.pow(Lc / MAX_LEVEL, XP_TAIL_EXP));
}

// ── World/stage helpers ──
/** Stage index within its world: 1..9 normal, 10 = zone boss (W-10). */
export function stageInWorld(globalStageIndex: number): number {
  return ((globalStageIndex - 1) % 10) + 1;
}
export function worldOf(globalStageIndex: number): number {
  return Math.floor((globalStageIndex - 1) / 10) + 1;
}
export function isZoneBossStage(globalStageIndex: number): boolean {
  return stageInWorld(globalStageIndex) === 10;
}
/** True when clearing this stage's boss reaches the W-9 → W-10 key gate. */
export function isPreZoneGate(globalStageIndex: number): boolean {
  return stageInWorld(globalStageIndex) === 9;
}

/** First global stage index of a world (its W-1). */
export function worldFirstStage(world: number): number {
  return (world - 1) * 10 + 1;
}

/** Highest world fully unlocked for travel — a boss has been beaten in it. The
 *  travel set is worlds 1..this. 0 = nothing cleared yet (still in world 1). */
export function highestUnlockedWorld(maxClearedStage: number): number {
  return maxClearedStage <= 0 ? 0 : worldOf(maxClearedStage);
}

/** Where the player resumes after a refresh: the natural progression frontier
 *  derived from the highest beaten boss. A cleared W-9 stays on W-9 (the key gate,
 *  §14) rather than being pushed into the un-keyed W-10; a cleared zone boss (W-10)
 *  advances to the next world's W-1; otherwise it's the next stage. */
export function resumeStageFor(maxClearedStage: number): number {
  if (maxClearedStage <= 0) return 1;
  if (isPreZoneGate(maxClearedStage)) return maxClearedStage; // farm W-9 until keyed
  return maxClearedStage + 1;
}

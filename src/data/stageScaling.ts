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
export const HP0 = 40;
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

// Stage boss (W-1..W-9): a ~10-20s fight with DECENT (not great) gear — a real fight, NOT a wall.
// Scales ~Φ^1.7 (a hair over party power → ~constant TTK). The early-world bossHpRamp keeps the
// fresh-party bootstrap burstable (the 1-1 boss); STAGE_BOSS_C is the W20+ anchor.
export const STAGE_BOSS_C = 45_000; // tune-pass: 37k→45k — a bit beefier (mildly challenging)
export const STAGE_BOSS_EXP = 1.85; // tune-pass: 1.7→1.85 — TTK grows a touch with depth
export const STAGE_BOSS_HP_OVERRIDE: Record<number, number> = {}; // world → absolute HP (rare manual pin)
export function stageBossHp(S: number): number {
  const o = STAGE_BOSS_HP_OVERRIDE[worldOf(S)];
  if (o !== undefined) return o;
  return STAGE_BOSS_C * phi(S) ** STAGE_BOSS_EXP * bossHpRamp(S) * enemyDiffMult(S);
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
export const WAVES_PER_STAGE = 20; // design value (was a temporary 5 for fast testing)

// Wave size ramps by the stage's position WITHIN its world (X-1 easiest → X-9 hardest),
// so difficulty climbs across a world instead of within a single stage's waves. Indexed by
// stageInWorld 1..9; X-10 is the boss (no trash waves). A wave teleports in as WAVE_BATCHES
// batches (field.ts), each spread across a band so they arrive as loose groups.
const WAVE_SIZE_BY_STAGE = [5, 6, 7, 8, 10, 12, 15, 18, 22] as const; // tune-pass: steeper X-7/8/9 spike (more mobs = more incoming pressure late in a world)

/** Enemies per wave for a stage, ramped by its position within the world (X-1..X-9). */
export function waveSizeForStage(globalStageIndex: number): number {
  const s = stageInWorld(globalStageIndex); // 1..10 (10 = boss stage)
  return WAVE_SIZE_BY_STAGE[Math.min(s, 9) - 1] ?? 5;
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
export const ELITE_HP_MULT = 5;
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

// Boss enrage (the DPS-race wall, DIFFICULTY.md §6). Geared boss TTK is ~constant in Φ
// (gear flat ~Φ tracks boss HP ~Φ), so a FIXED enrage window gates every stage the
// same way: kill the boss before it enrages, or wipe.
//
// Design (per design directive): ONLY the zone boss (every 10th stage, W-10) is a
// hard DPS+survival gate, with a generous 30s window — your frontline must tank it
// for 30s AND your DPS must kill it within 30s using ~that stage's gear. Normal
// stage bosses (W-1..W-9) do NOT enrage; they are survival-gated (a squishy
// frontline dies to them — the user's W1-9 rule), and you can take your time.
// A generous 30s enrage on EVERY boss: when roughly geared you kill a normal stage
// boss in a few seconds (well under 30s, so it never bites) and the W-10 zone boss
// in ~20-25s (the real DPS+survival gate, via its ×35 HP / ×3 damage). It only
// triggers when badly under-geared → a clean wipe-and-farm signal, not a 6-minute
// grind. Same window for both keeps one tunable number (the user's "30s").
export const ZONE_ENRAGE_MS = 30_000; // zone boss enrage window (W-10) — the gate
export const STAGE_ENRAGE_MS = 30_000; // normal stage bosses share the 30s window
// Boss damage doubles every RAMP ms past the enrage window. Softened 2500→5000 (2d): a slower
// ramp means a SURVIVABLE tank buys real extra seconds to finish the kill past the window — so
// the world-boss gate rewards survivability + DPS together, not a hard DPS cliff at exactly 30s.
export const BOSS_ENRAGE_RAMP_MS = 5000;

// ── Stage-boss HP ramp (the "easy early worlds") ──
// REWORK: only the W-10 ZONE bosses are walls (design directive); the regular stage
// bosses (W-1..W-9) must stay BEATABLE on the low-tier gear available early (T0-T3 until
// tiers unlock at worlds 12-20). So the stage-boss HP scales up GENTLY across the whole
// easy-opening band (worlds 1-20): ~4.5% of full at 1-1, reaching the full ×150 only at
// world 20 (global 191), by when the tier ladder is fully unlocked. The W-10 zone boss is
// NOT ramped — it stays the §14 wall.
export const BOSS_HP_RAMP_START = 0.011; // stage-1 boss kept ~400 HP under STAGE_BOSS_C — a base solo knight bursts it inside the 30s enrage
export const BOSS_HP_RAMP_END = 191; // full ×150 only from world 20 (global 191) onward — easy stage bosses through the opening worlds
/** Fraction (BOSS_HP_RAMP_START..1) scaling a STAGE boss's HP in the opening. */
export function bossHpRamp(S: number): number {
  if (S >= BOSS_HP_RAMP_END) return 1;
  if (S <= 1) return BOSS_HP_RAMP_START;
  return BOSS_HP_RAMP_START + (1 - BOSS_HP_RAMP_START) * ((S - 1) / (BOSS_HP_RAMP_END - 1));
}

/** Boss damage multiplier from enrage: 1 until `windowMs`, then doubles every RAMP. */
export function enrageMultiplier(fightMs: number, windowMs: number): number {
  if (fightMs <= windowMs) return 1;
  return 2 ** ((fightMs - windowMs) / BOSS_ENRAGE_RAMP_MS);
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

// ── Gear-power tracking (the constant-hit-count anchor) ──
// The party's DPS rides Φ × (tier inflation × gems × affix-count × level) — a multiplier that
// Φ ALONE does not capture, so without it enemy HP (∝ Φ) falls ever further behind gear and
// trash collapses to a one-shot at depth. gearTrack(S) folds that on-level gear-power inflation
// into the enemy REFERENCE so trash/boss TTK stays ~constant in HIT-COUNTS at every depth
// (the design directive — see memory enemy-scaling-decoupled). It ramps from ~1 at stage 1
// (a FRESH, ungeared party — so the bootstrap 1-1 is untouched) up to GEARTRACK_MAX once the
// tier ladder is fully unlocked + a progressing party is broadly geared (~W20), then plateaus
// (deeper gear growth is the Φ factor + gems, already in Φ). The MULTS that ride the reference
// (TRASH_HP_FRACTION / BOSS_HP_MULT / ZONE_BOSS_HP_MULT) stay INDEPENDENT per-role knobs.
// Two regimes. RAMP (S≤W20): fresh→geared, 1 → GEARTRACK_BASE as the tier ladder unlocks and
// a new party gears up (starts at 1 so the stage-1 bootstrap is untouched). CONTINUED GROWTH
// (S>W20): gear keeps inflating past the T8 tier-cap via ilvl (Φ), accumulated gems, and the
// rarity-depth tier-lift — empirically ≈ Φ^1.6 total, i.e. a Φ^~0.3 factor ON TOP of enemy HP's
// Φ^1.0. gearTrack MUST keep tracking that or enemies fall behind deep and the late game
// facerolls / re-accelerates (the bug). So past W20 it grows as (Φ(S)/Φ(W20))^GEARTRACK_EXP —
// NO plateau. Tuned to hold trash at ~2-3 DPS hits at every depth (sim measurement).
// FINITE model: gear power is BOUNDED now (ilvl tracks L≤115, not stage≈480), so the deep
// gear-inflation these track is much smaller than the old infinite model assumed — base cut
// 60→28 and continued-growth exponent 0.3→0.12 so deep enemy HP doesn't outrun the capped
// gear ceiling (which bricked the agent at ~Inferno). Co-tuned via scripts/sim-worlds.ts.
export const GEARTRACK_BASE = 28; // gear-power inflation vs a fresh party by W20 (tier×gem×affix)
export const GEARTRACK_RAMP_END = 191; // W20 — end of the fresh→geared ramp
export const GEARTRACK_EXP = 0.12; // continued growth past W20 (bounded finite gear)
export function gearTrack(S: number): number {
  if (S <= 1) return 1;
  if (S < GEARTRACK_RAMP_END) return 1 + (GEARTRACK_BASE - 1) * ((S - 1) / (GEARTRACK_RAMP_END - 1));
  return GEARTRACK_BASE * Math.pow(phi(S) / phi(GEARTRACK_RAMP_END), GEARTRACK_EXP);
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
export const WORLD_WALL_MULT: readonly number[] = [
  1.18, 1.21, 1.24, 1.28, 1.33, 1.38, 1.44, 1.51, 1.60, 1.69, //  W1-10  Normal
  1.80, 1.93, 2.08, 2.25, 2.45, 2.65, 2.85, 3.05, 3.25, 3.45, //  W11-20 Hell (gate W20 ≤1d)
  // Each difficulty: gentle ramp through x-1..x-9 (the ~1-2d farming worlds), then a clear
  // STEP at x-10 (the GATE = the difficulty's climax). Sized so beating x-9 does NOT trivialize
  // the gate. Gate day-targets (probe): Inferno W30 ~2-3d, Eternal W40 ~5-6d, Torment W50 = the
  // final wall, needing near-perfect T8 gear (pushed toward the T8 brick ceiling ~110).
  4.40, 4.80, 5.30, 5.80, 6.40, 6.90, 7.50, 8.40, 9.60, 13.00, //  W21-30 Inferno (gate W30 ~3-4d)
  18.0, 20.0, 22.0, 25.0, 28.0, 31.0, 34.0, 37.0, 40.0, 44.0, //  W31-40 Eternal — firm ramp + gate step → W40 ~5-6d with a tight range (a bigger step hits 7-8d but reopens 26d+ outliers from loot-gear variance, so we keep it moderate)
  54, 59, 64, 69, 74, 80, 86, 91, 96, 100, //  W41-50 Torment — even ramp, the hardest band (78 wipes, far above the rest); W50 toward the T8 brick = near-perfect-gear endgame climax ≈ 5-6d (T8 is the best gear in the game, so a CLEAN 7+ here would need a near-brick tail — capped for a sane range instead)
];
export function wallWorldMult(S: number): number {
  return WORLD_WALL_MULT[worldOf(S) - 1] ?? wallCurveMult(S);
}

// Early-game damage ramp (bootstrap protector): a fresh solo naked Knight must survive 1-1, but
// the raised trash damage + wave swarm wore it down. Enemy DAMAGE ramps from EARLY_DMG_FLOOR at
// stage 1 up to full by EARLY_DMG_RAMP_END (~world 2), so the opening is forgiving and full
// difficulty arrives once you've geared a few pieces. Only touches the OPENING (≥END ⇒ ×1).
export const EARLY_DMG_FLOOR = 0.65; // stage-1 enemy-damage multiplier
export const EARLY_DMG_RAMP_END = 12; // global stage where enemy damage reaches full (≈ world 2, stage 2)
export function earlyDmgRamp(S: number): number {
  if (S >= EARLY_DMG_RAMP_END) return 1;
  return EARLY_DMG_FLOOR + (1 - EARLY_DMG_FLOOR) * ((Math.max(1, S) - 1) / (EARLY_DMG_RAMP_END - 1));
}

export function enemyHp(S: number): number {
  return HP0 * phi(S) * gearTrack(S) * enemyDiffMult(S);
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
export function totalExpToReach(L: number): number {
  const Lc = Math.min(L, MAX_LEVEL);
  return Math.round(0.7 * Math.pow(Lc, 3.5));
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

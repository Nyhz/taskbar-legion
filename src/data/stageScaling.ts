// THE scaling bible, implemented (PROGRESSION.md — canonical, supersedes SPEC's
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
export const DMG_EXP = 1.0;
export const ENEMY_BASE_ATTACK_SPEED = 0.8; // attacks/sec baseline

// ── DECOUPLED boss HP (2d) — each boss has its OWN Φ-power scale, INDEPENDENT of trash and of
// each other (user directive). Bosses scale STEEPER than party DPS (party ≈ Φ^1.6-2 fully
// geared) so their TTK HOLDS or GROWS with depth — the gate never erodes (the bug when bosses
// rode trash HP at ~Φ^1.3 and facerolled deep). Each function also takes an optional per-world
// OVERRIDE map for the rare world the formula misfits — the "tune individual bosses" escape
// hatch (the game is infinite + always-decelerating, so only a bounded prefix ever needs pins),
// layered on top of the clean default. Boss DAMAGE still rides enemyDamage × these mults.
export const BOSS_DMG_MULT = 5.0;
export const ZONE_BOSS_DMG_MULT = 5.5;

// Stage boss (W-1..W-9): a ~10-20s fight with DECENT (not great) gear — a real fight, NOT a wall.
// Scales ~Φ^1.7 (a hair over party power → ~constant TTK). The early-world bossHpRamp keeps the
// fresh-party bootstrap burstable (the 1-1 boss); STAGE_BOSS_C is the W20+ anchor.
export const STAGE_BOSS_C = 37_000;
export const STAGE_BOSS_EXP = 1.7;
export const STAGE_BOSS_HP_OVERRIDE: Record<number, number> = {}; // world → absolute HP (rare manual pin)
export function stageBossHp(S: number): number {
  const o = STAGE_BOSS_HP_OVERRIDE[worldOf(S)];
  if (o !== undefined) return o;
  return STAGE_BOSS_C * phi(S) ** STAGE_BOSS_EXP * bossHpRamp(S);
}

// Zone/world boss (W-10): THE WALL / gear-check. Scales a HAIR steeper than party power (Φ^1.8)
// so its TTK GROWS with depth → each world takes a bit longer = the decelerating curve. Sized so
// good world ITEMS clear it within the enrage+survival window (gems/level are premium HEADROOM,
// never required — directive); the PREVIOUS world's gear fails → you farm a few new pieces. The
// deep-world LENGTH (W60≈3-4mo, W100≈1yr, approximate) is this growing gate × the farm treadmill.
export const ZONE_BOSS_C = 185_000;
export const ZONE_BOSS_EXP = 1.9; // FINITE: softened 2.1→1.9 so the wall tracks (not outruns) the bounded finite gear ceiling; C sized so the X-10 walls bite (force farming) without bricking
// Soft SATURATION (deep-tail flattener): the realistic gear ceiling saturates (level cap + gem
// caps), so a pure Φ^2.1 wall would cross it and brick (~W165). Dividing by (1+Φ/SAT) flattens
// the deep wall to ~Φ^1.1, keeping it well below the absolute ceiling (0.2-0.5×) through W250+ —
// so the deep tail is GLACIAL (the intended multi-month grind), never a hard stop. Calibrated
// via scripts/sim-pace.ts (the analytic pacing harness). NOTE: full W200≈1yr pacing also needs
// the depth-dependent gear-treadmill slowdown — see the pacing writeup / difficulty-tier plan.
export const ZONE_BOSS_SAT = 18;
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
  return (ZONE_BOSS_C * phi(S) ** ZONE_BOSS_EXP * ramp) / (1 + phi(S) / ZONE_BOSS_SAT);
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
const WAVE_SIZE_BY_STAGE = [5, 6, 7, 8, 9, 10, 12, 14, 15] as const; // X-1 … X-9 mobs/wave

/** Enemies per wave for a stage, ramped by its position within the world (X-1..X-9). */
export function waveSizeForStage(globalStageIndex: number): number {
  const s = stageInWorld(globalStageIndex); // 1..10 (10 = boss stage)
  return WAVE_SIZE_BY_STAGE[Math.min(s, 9) - 1] ?? 5;
}

// Elite ("champion") trash: a per-mob chance to roll a beefed-up enemy — bigger, hits and
// soaks 2× a normal mob of its kind, and DOUBLES its chest-drop chance (the loot carrot).
// Elites are the on-level THREAT (the doc's §2d "trash is clearable on-level" leaves a built
// party near-untouched by normal mobs — the healer-trio out-heals base chip — so the texture
// comes from these champion spikes, NOT from inflating base HP0/DMG0, which would break the
// fresh-start bootstrap). DMG (4×) leads HP (3×) so an elite is a burst of DANGER (the tank/
// healer must react) rather than a tanky slog. Rides on enemyDamage, so it stays bootstrap-safe
// at the 8% roll. Tuned to sim-survival's minHP% dips. (Was 2×/2×.)
export const ELITE_CHANCE = 0.08; // ~0–1 elite per 5-10 wave
export const ELITE_HP_MULT = 3;
export const ELITE_DMG_MULT = 4;
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
export const TRASH_DMG_FRACTION = 0.6;

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
// reach immunity, however many sources stack — a bounded percent stat (PROGRESSION §6).
export const MAX_DAMAGE_REDUCTION = 80;
// NOTE: multistrike / critChance / block / cooldownReduction are now bounded via the
// DIMINISHING-RETURNS soft caps in data/stats.ts (ENABLER_SOFT_CAPS), not hard caps here.

// Boss enrage (the DPS-race wall, PROGRESSION §6). Geared boss TTK is ~constant in Φ
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

// The master scale Φ(S) = P(S) = (1 + S/P_K)^P_EXP. Closed-form (no memo needed); accepts
// fractional S (used for ilvl/expectedLevel) and is monotonic, convex, and finite everywhere.
export function phi(S: number): number {
  if (S <= 0) return 1;
  return Math.pow(1 + S / P_K, P_EXP);
}

// Per-stage growth RATIO g(S) = P(S)/P(S-1). Kept for callers/tests that reason about
// per-stage difficulty. Under the polynomial this gently DECREASES toward 1 with depth
// (the relative jump shrinks), while the ABSOLUTE increment P(S)-P(S-1) grows — that
// rising absolute increment is the "accelerating difficulty" (PROGRESSION §11 #4).
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

export function enemyHp(S: number): number {
  return HP0 * phi(S) * gearTrack(S);
}
export function enemyDamage(S: number): number {
  return DMG0 * phi(S) ** DMG_EXP;
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

// ── Item level / level-curve spine (the rebalance) ──
// ilvl is a PURE POWER source (item flat stats scale Φ^EG_FLAT of their ilvl). There is
// NO equip-gate (PROGRESSION §0: any hero equips any item; only the weapon/off-hand class
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

// ── Income (sub-linear in Φ so the economy keeps pace without trivializing) ──
// Deliberately TIGHT (design directive): gold gates the tech-unlock pace and XP
// gates leveling, so the player must FARM, not just advance non-stop. Tech gold×/xp×
// bonuses (up to ~23×/~13× fully invested) are the relief that rewards Economy nodes.
// These bases supersede BALANCE.md's looser 5/6 (see PROGRESSION §8 note).
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
// old impossibility. Re-paced against the zone-wall W100≈1yr timeline so roughly L100 lands
// a few months in and L120 ~15 months (the long tail).
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

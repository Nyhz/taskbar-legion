// THE scaling bible, implemented (PROGRESSION.md — canonical, supersedes SPEC's
// linear example). Accelerating difficulty via a per-stage growth ratio g(S);
// cumulative Φ(S) = Π g(i). Enemy stats, mitigation, income and XP all derive
// from Φ. Flat gear scales Φ^EG_FLAT (~1.0 → geared TTK constant); percent stats
// are bounded (handled in sim/loot.ts). Numbers stay finite to ~stage 2800 (§10).

// ── Master growth ──
export const G0 = 1.12; // early per-stage ratio (+12%/stage)
export const G1 = 1.3; // asymptotic late ratio (+30%/stage)
export const KMID = 160; // half-way stage of the early→late ramp

// ── Enemy stats ──
export const HP0 = 40;
export const DMG0 = 6;
export const DMG_EXP = 0.82; // damage lags HP → DPS-race wall
export const ENEMY_BASE_ATTACK_SPEED = 0.8; // attacks/sec baseline

// Bosses are multiples of a same-stage NORMAL grunt (grunt HP = enemyHp(S) × 1.5).
// Tuned WAY UP so bosses don't melt with mediocre gear — they're meant to demand
// farm time and burn into the 30s enrage window.
export const BOSS_HP_MULT = 150; // stage boss (W-1..W-9) = 150× a grunt
export const BOSS_DMG_MULT = 5.0;
// Act/zone boss (W-10) = 220× a grunt — ~1.5× a stage boss, the big act-ending wall.
// Down from the old 450/7.5 (which was propped against the now-removed combat tech).
// Post-overhaul, the deep wall is carried by per-world HP scaling (ZONE_WALL_GROWTH
// below), not a flat multiplier. Tuned via scripts/sim-zoneboss.ts / sim-calib.ts
// against the items-are-power curve (PROGRESSION §0, W100 ≈ ~1yr).
export const ZONE_BOSS_HP_MULT = 220;
export const ZONE_BOSS_DMG_MULT = 5.5;
// Zone-boss WALL scaling (§14, the W100≈1yr timeline). The W-10 boss HP grows PER WORLD on
// top of its Φ scaling, so each act demands a little more farming than the last — gentle
// through the easy opening (worlds 1-20 stay ~1×), then escalating, so deeper acts force
// days of grinding for rarer-tier gear to break through. growth^max(0, world-WALL_EASY_END).
// Tuned via scripts/sim-calib.ts to hit the ~1-year W100 pace.
export const ZONE_WALL_GROWTH = 1.11; // per-world HP multiplier past the easy band
export const ZONE_WALL_EASY_END = 30; // worlds 1-30 have ~no extra wall (the easy opening)
export function zoneWallHpFactor(world: number): number {
  return Math.pow(ZONE_WALL_GROWTH, Math.max(0, world - ZONE_WALL_EASY_END));
}
// A stage is a lane-pusher "area": 20 enemy WAVES (each fills the progress bar 5%)
// then the stage boss. Each wave is 2–8 mixed enemies that advance from the edge.
// Trash are weaker than the §12 reference enemy (TRASH_HP_FRACTION) so ~100 enemies
// per stage clear in a reasonable, watchable time. Bosses/zone boss use the full
// reference HP × their mult. (Pacing knobs — the §12 enemyHp/Φ/income are unchanged.)
export const WAVES_PER_STAGE = 20; // design value (was a temporary 5 for fast testing)
export const WAVE_MIN = 2;
export const WAVE_MAX = 8;
export const WAVE_MAX_EARLY = 5; // smaller waves (2-5) through world 1 — easier opening
export const WAVE_SIZE_RAMP_END = 11; // full-size waves (2-8) from stage 11 (2-1) onward
/** Max enemies per wave: 5 through world 1 (global stages 1-10), 8 from stage 11. */
export function waveMax(S: number): number {
  return S < WAVE_SIZE_RAMP_END ? WAVE_MAX_EARLY : WAVE_MAX;
}
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
export const C_MIT = 50;
export const MIT_EXP = 1.0; // MUST track EG_FLAT (armor is a flat stat)
// Cap on the flat `damageReduction` stat (a defensive-buff mechanic) so it can never
// reach immunity, however many sources stack — a bounded percent stat (PROGRESSION §6).
export const MAX_DAMAGE_REDUCTION = 80;

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
export const BOSS_ENRAGE_RAMP_MS = 2500; // boss damage doubles every RAMP ms past the window

// ── Stage-boss HP ramp (the "easy early worlds") ──
// REWORK: only the W-10 ZONE bosses are walls (design directive); the regular stage
// bosses (W-1..W-9) must stay BEATABLE on the low-tier gear available early (T0-T3 until
// tiers unlock at worlds 12-20). So the stage-boss HP scales up GENTLY across the whole
// easy-opening band (worlds 1-20): ~4.5% of full at 1-1, reaching the full ×150 only at
// world 20 (global 191), by when the tier ladder is fully unlocked. The W-10 zone boss is
// NOT ramped — it stays the §14 wall.
export const BOSS_HP_RAMP_START = 0.045; // stage-1 boss = 4.5% of full HP — a base solo warrior can burst it inside the 30s enrage
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

export function g(S: number): number {
  return G0 + (G1 - G0) * (S / (S + KMID));
}

// Φ memoized iteratively (PROGRESSION §3): phiCache[S] = phiCache[S-1] * g(S).
const phiCache: number[] = [1]; // Φ(0) = 1
export function phi(S: number): number {
  if (S <= 0) return 1;
  const s = Math.floor(S);
  for (let i = phiCache.length; i <= s; i++) {
    const prev = phiCache[i - 1] ?? 1;
    phiCache[i] = prev * g(i);
  }
  return phiCache[s] ?? Infinity;
}

export function enemyHp(S: number): number {
  return HP0 * phi(S);
}
export function enemyDamage(S: number): number {
  return DMG0 * phi(S) ** DMG_EXP;
}

/** Mitigation in [0,1): armorEff / (armorEff + C_MIT * Φ^MIT_EXP). */
export function mitigation(armorEff: number, S: number): number {
  const denom = armorEff + C_MIT * phi(S) ** MIT_EXP;
  if (denom <= 0) return 0;
  return armorEff / denom;
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
export const LEVEL_LAG_RATE = 0.3; // levels of lag added per stage past world 1
export const LEVEL_LAG_CAP = 12; // max levels the intended level trails the raw stage

export function expectedLevel(S: number): number {
  if (S <= 10) return Math.max(1, Math.round(S));
  const lag = Math.min(LEVEL_LAG_CAP, (S - 10) * LEVEL_LAG_RATE);
  return Math.max(1, Math.round(S - lag));
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
export function totalExpToReach(L: number): number {
  const Lc = Math.min(L, MAX_LEVEL);
  return Math.round(0.5 * Math.pow(Lc, 3.5) + Math.pow(4.4, Lc - 39));
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

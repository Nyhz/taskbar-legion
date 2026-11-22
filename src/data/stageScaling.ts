import { difficultyIndexOf, worldInDifficulty } from './difficulties';
import { levelCurve, powerAt, refGearFill, refTierPosition, REF_ILVL_LAG } from './power';
import { TIERS } from './tiers';

// Stage scaling that is NOT power: waves, elites, the threat shares, the enrage, income, levels and mitigation.
// Since the power-curve redesign (docs/redesign/POWER_CURVE.md, 2026-11-22) every number of POWER comes from one
// curve (data/power P(S)): items and class stats read it directly, enemies through the typical party of their zone
// (sim/reference → sim/enemyScale). The measured per-world tables (GRUNT_HP_TUNE, STAGE_BOSS_HP_TUNE, TRASH_DMG_TUNE,
// TRASH_BACK_DMG_TUNE, ZONE/STAGE_BOSS_HIT_TUNE, KNIGHT_EHP_TUNE, BACK_LIFE_TUNE, WORLD_WALL_MULT) are gone; their
// history is in git and docs/redesign/PACING_REPORT.md.

// ── Income's curve (kept from the old model: gold and XP a kill grow gently, Φ 1 → 6.2 over the game) ──
export const P_K = 600;
export const P_EXP = 3.0;
/** Φ(S) = (1 + S/P_K)^P_EXP — only the economy (gold and XP a kill) reads it now. */
export function phi(S: number): number {
  if (S <= 0) return 1;
  return Math.pow(1 + S / P_K, P_EXP);
}

// ── Enemy rhythm ──
export const ENEMY_BASE_ATTACK_SPEED = 0.8; // attacks/sec baseline
/** A stage boss's / a world boss's hits BEHIND the front hero, × a wave enemy's (sim/enemyScale enemyDamage). */
export const BOSS_DMG_MULT = 6.5;
export const ZONE_BOSS_DMG_MULT = 7.0;

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
export const WAVES_BY_DIFFICULTY: readonly number[] = [12, 17, 18, 19, 20]; // 2026-11-18: Normal 16 → 12 so it takes 4–6 h (user; ×0.7 smaller waves did not shorten it — a wave has a fixed arrival time)
export function wavesPerStage(S: number): number {
  return WAVES_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor((Math.max(1, S) - 1) / 100)))] ?? 20;
}

// Wave size ramps by the stage's position WITHIN its world (X-1 easiest → X-9 hardest),
// so difficulty climbs across a world instead of within a single stage's waves. Indexed by
// stageInWorld 1..9; X-10 is the boss (no trash waves). A wave teleports in as WAVE_BATCHES
// batches (field.ts), each spread across a band so they arrive as loose groups.
const WAVE_SIZE_BY_STAGE = [9, 10, 11, 12, 13, 15, 17, 19, 22] as const; // 2026-11-17: fuller openings (X-1 was 5, 3 in Normal: one enemy per batch); X-9 unchanged

/** × wave size by difficulty (Normal → Torment). Normal ran at 0.6 to stay a 3–4 hour stroll; since 2026-11-17 its waves
 *  are as full as every other difficulty's (the user's call: thin waves felt empty), at the cost of a longer Normal. */
export const WAVE_SIZE_MULT_BY_DIFFICULTY: readonly number[] = [1, 1, 1, 1, 1]; // 2026-11-17: Normal's waves are as full as the others (user decision; was 0.6)

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
// Trash life: a grunt has TRASH_HP_FRACTION × the reference enemy life (sim/enemyScale enemyHp), each kind its share.
export const TRASH_HP_FRACTION = 1.5;
/** × a wave enemy's kind damage (data/enemies dmgMult) — kept as a knob. */
export const TRASH_DMG_FRACTION = 0.75;

// ── THE THREAT SHARES (what the enemies' hits are sized to, against the TYPICAL party — sim/enemyScale) ──
/** % of the average Knight's life a second a wave takes off him while it fights him, Normal … Torment (user: ~3 % in
 *  Normal, «subir un poco cada una»; lowered one point each the same day, when 3–5 % stretched Normal from 6–10 h to
 *  ~14 h in the probe; then 1.5 / 2 / 2.5 / 3 / 3.5 — «so a little over is not serious» — and the table re-measured). */
export const TRASH_THREAT_PCT: readonly number[] = [1.5, 2, 2.5, 3, 3.5];
/** % of the back line's life a second the waves take off it while they fight, Normal … Torment (the user's ~0.5 % in
 *  Normal up to ~1 % in Torment). */
export const TRASH_BACK_THREAT_PCT: readonly number[] = [0.5, 0.55, 0.6, 0.7, 0.75];
/** % of the average Knight's life a second the WORLD boss takes off him after his mitigation, Normal … Torment.
 *  What the probe's Priest heals him a second when he is pressed (scripts/heal-capacity.ts, round 6): ≈ 3.5–5 % in
 *  Hell, 5–9 % in Inferno, ≈ 11 % in Eternal, 15–28 % at the end of Torment (her heals are a % of his life × her heal
 *  power). The user chose 2 / 3 / 3.5 / 4 % on my first, wrong estimate of a flat ~4 % of healing. Tried at her
 *  capacity (1 / 4 / 9 / 14 / 24): every wall became a survival coin-toss with tens of failed attempts. Then, by the
 *  user's rule for round 6 · B («menos daño de bosses y más vida … la amenaza es llegar a la furia»), lowered to
 *  1 / 2 / 4 / 6 / 8: the wall is a race against the enrage, the boss's hit still the tank's business. */
// ROUND 7 (2026-11-16): from Inferno a share of that pressure moved into the Crushing Blow (data/bossKit CRUSH) — the
// heavy blow a Knight braces for — so the sustained part is lower there (4 / 6 / 8 → 3 / 4.5 / 6): a Knight who
// braces for the blow takes about what he took before; one who does not, about half again as much.
// ROUND 8 (2026-11-17): Torment 6 → 7.5. (Round 10 found it never reached the game: the target only writes the hit
// tables below, which were not re-written. Round 10 rescales them: × the new target over the old for every world —
// Torment's 7.5, and the new easing, the previous difficulty's target held through worlds 1–2 and coming in over 3–5.)
export const BOSS_THREAT_PCT: readonly [number, number, number, number, number] = [1, 2, 3, 4.5, 7.5];
/** A STAGE boss presses the front at this share of its world boss's target: the defensive build shows outside the
 *  walls too, while a stage boss (5–10 s) never threatens the farm. */
export const STAGE_BOSS_THREAT_SHARE = 0.45;

// Boss/zone-boss kills pay a multiple of per-kill income.
export const BOSS_INCOME_MULT = 8;
export const ZONE_BOSS_INCOME_MULT = 40;

// ── Mitigation ──
// DR = armor / (armor + expectedDefense(S)): a hero with the on-level defence of his zone turns half away. On-level
// defence follows the power curve and the zone's usual rarity (data/power), so the typical Knight sits near 50 % at
// every stage (test/sim/powerCurve.test.ts holds it).
export const DEF_SCALE = 55;
/** The share of on-level defence that is the class's own (the rest comes with the gear, filled in over world 1). */
export const DEF_BASE_SHARE = 0.25;
// Cap on the flat `damageReduction` stat (a defensive-buff mechanic) so it can never reach immunity.
export const MAX_DAMAGE_REDUCTION = 80;
// Hard cap on armor/MR damage reduction.
export const MAX_ARMOR_DR = 0.9;

/** The on-level armour (or magic resist) at global stage S: the defence that turns half a hit away (memoised per
 *  whole stage — it is read on every hit). */
const defenseMemo = new Map<number, number>();
export function expectedDefense(S: number): number {
  const key = Math.max(1, Math.round(S));
  const hit = defenseMemo.get(key);
  if (hit !== undefined) return hit;
  const v = defenseAt(key);
  defenseMemo.set(key, v);
  return v;
}
function defenseAt(S: number): number {
  const pos = refTierPosition(S);
  const lo = TIERS[Math.floor(pos)]?.statMultiplier ?? 1;
  const hi = TIERS[Math.ceil(pos)]?.statMultiplier ?? lo;
  const budget = lo + (hi - lo) * (pos - Math.floor(pos));
  return DEF_SCALE * powerAt(S - REF_ILVL_LAG) * (DEF_BASE_SHARE + (1 - DEF_BASE_SHARE) * refGearFill(S) * budget);
}

/** Mitigation in [0, MAX_ARMOR_DR]: armorEff / (armorEff + expectedDefense(S)). */
export function mitigation(armorEff: number, S: number): number {
  const denom = armorEff + expectedDefense(S);
  if (denom <= 0) return 0;
  return Math.min(MAX_ARMOR_DR, armorEff / denom);
}

// Boss enrage (the DPS-race wall, DIFFICULTY.md §5). A boss hits as written for its window and then its damage
// doubles every RAMP: the fight is meant to END at the window. A world boss's life is tuned so that a party geared
// at 80-90 % of what its world offers kills it at ~60 s (user, 2026-11-15); a party below that has to hold some
// seconds of enrage to finish, and a party far below does not make it. Stage bosses share the window and are
// meant to die in 5-10 s, so theirs only bites a party that should not be there.
export const ZONE_ENRAGE_MS = 60_000; // world boss (X-10) — the gate
/** THE OPENING WALL (round 11, 2026-11-17; user: «solo el mundo 1»): the world boss of a difficulty's WORLD 1 (from
 *  Hell) gives the party this long before it enrages, so the gear a party ends a difficulty with — which stands right at
 *  its last wall's threshold, since it is the attempt that took it — takes the first wall of the next one. Its life
 *  and its % of the ceiling stay on the ladder (the % is measured over the usual 60 s): only the clock is longer. */
export const OPENING_ENRAGE_MS = 120_000;
/** The enrage window of the world boss of global stage `S`: the opening wall's longer clock, else the usual one. */
export function zoneEnrageMs(S: number): number {
  return difficultyIndexOf(S) > 0 && worldInDifficulty(S) === 1 ? OPENING_ENRAGE_MS : ZONE_ENRAGE_MS;
}
export const STAGE_ENRAGE_MS = 60_000; // stage bosses share the window
// Boss damage doubles every RAMP ms past the window: ×2 after 2 s, ×6 after 5 s, ×32 after 10 s. Measured: a party
// holds about ten seconds of it in Hell and up to fifteen in Torment (its tank is sturdier there) — "unos segundos".
export const BOSS_ENRAGE_RAMP_MS = 2000;
/** The ramp by difficulty, Normal … Torment (round 5, 2026-11-16, user: «sí, más dura»): from Inferno a boss's
 *  damage doubles every second past the window (×32 five seconds in), so holding its enrage is all but impossible
 *  and the ladder's % is what a party really needs to end the fight at the minute. Normal and Hell keep the
 *  softer ramp: a party a little short still scrapes through with a few seconds of it. */
export const ENRAGE_RAMP_MS_BY_DIFFICULTY: readonly [number, number, number, number, number] = [2000, 1500, 1000, 1000, 1000];
/** THE FURY (round 10, 2026-11-17; user: «Tormento algo más difícil» and «subir y emparejar»): from Torment a WORLD
 *  boss's enrage has an end — this long after its window closes it wipes the party. Without it a party a little short
 *  outlived the doubling for 5–13 s depending on the boss (its mechanic holding its swings, a Last Stand…), so a wall
 *  asked ~75–100 % of its ladder value by boss: some late Torment walls fell at once while others cost 60–80 h. With it
 *  every wall asks what its ladder says. Normal … Torment (Infinity: none). */
export const BOSS_FURY_GRACE_MS: readonly [number, number, number, number, number] = [Infinity, Infinity, Infinity, Infinity, 4000];

/** The enrage ramp of a boss at difficulty index `d`. */
export function enrageRampMs(d: number): number {
  return ENRAGE_RAMP_MS_BY_DIFFICULTY[Math.max(0, Math.min(4, Math.floor(d)))] ?? BOSS_ENRAGE_RAMP_MS;
}

/** Boss damage multiplier from enrage: 1 until `windowMs`, then doubles every `rampMs`. */
export function enrageMultiplier(fightMs: number, windowMs: number, rampMs: number = BOSS_ENRAGE_RAMP_MS): number {
  if (fightMs <= windowMs) return 1;
  return 2 ** ((fightMs - windowMs) / Math.max(1, rampMs));
}

// ── Levels ──
/** The level a party is meant to have at global stage S (data/power levelCurve, rounded; 1 … 115 over the game). */
export function expectedLevel(S: number): number {
  return Math.max(1, Math.min(MAX_LEVEL, Math.round(levelCurve(S))));
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

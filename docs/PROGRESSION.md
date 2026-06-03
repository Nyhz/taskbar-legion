# PROGRESSION.md — The scaling bible (infinite, gear-checked)

> **⛔ SUPERSEDED BY `docs/DIFFICULTY.md` (2026-06-03).** The game pivoted from **infinite scaling** to a
> **finite 5-difficulty** model (Normal/Hell/Inferno/Eternal/Torment × 10 worlds × 10 stages). `DIFFICULTY.md`
> is now canonical for structure, difficulty, loot tiers, walls, XP bands, and pacing. The infinite model
> below — §0's per-world zone-boss walls + `ZONE_WALL_GROWTH`, §1's "infinite scaling", §13's world-depth
> rarity + `unlockStage` schedule, §14's zone-key gate, and the W100≈1yr tail — is **retired.** What is
> **retained and re-parameterized** for the finite span: the polynomial Φ curve, `gearTrack` hit-count anchor,
> decoupled boss scales, mitigation, `expectedLevel`, the FLAT-vs-PERCENT stat rule (§6), and the income shape.
> Read `DIFFICULTY.md` first; treat the sections below as background on the surviving machinery only.
>
> **⚠️ MID-REWORK (read first).** The **exponential Φ scaling described below is being replaced** by a
> polynomial "B-curve" so numbers stay readable (a bow's attackDamage hit ~1e42 by world 50 — rejected). The
> stat-system changes are DONE (scaler/enabler split, soft caps, slot restrictions, dodge/hpPerHit removed,
> damageIncrease/lifesteal buff-only, multistrike added, 90% armor-DR cap). The **scaling spine + enemy
> rebalance is Phase 2** (target: T4 flat ~125@il50 → ~2k@W100 → ~10k@W200; percent scalers gain gentle ilvl
> growth; enablers diminish via `ENABLER_SOFT_CAPS`; difficulty re-sourced onto the zone-boss walls + gear
> treadmill since the on-level gap flattens under polynomial). On-level armor DR target ~50%, W100≈1yr kept.
> Until Phase 2 lands, the magnitude sections below are STALE. **Phase 2 handoff: `docs/PHASE2_REBALANCE.md`**
> (read that first); see also memory `number-system-rework`.

This is the canonical model for difficulty, power, loot, and XP scaling. It **supersedes the example
numbers in SPEC §4.6 / §5.3 and the first-pass curves in an earlier draft of BALANCE.md** — those were
linear placeholders, and linear gear power cannot keep pace with exponential enemies (the game would become
impossible by ~stage 10). The SPEC marked all these values `tune`; this is the tuned model. Implement the
*shape* exactly; the *constants* are co-tuned by the smoke harness (last section) until the four invariants
hold.

---

## 0. THE CURRENT MODEL (post-overhaul) — read this first; it supersedes the rest where they conflict

A large progression overhaul re-shaped how power, difficulty, leveling and loot work. Where sections below
still describe the older model (level-gated gear, combat-tech, exponential-and-uncapped levels, "geared never
hard-walls"), **this section wins.** The §11 invariants are now validated by the dev probes
(`scripts/sim-calib.ts`, `sim-gear.ts`, `sim-multiseed.ts`), not all by unit tests.

- **Combat power lives in ITEMS** (ilvl × tier × affixes × gems) + talents + level + ultimates. A new drop —
  especially a tier jump — is what changes your power. `GEAR_POWER = 9.0`.
- **Tech is NON-COMBAT only** (Economy / Chests / Utility: gold, XP, drops, storage, auto-open, recruitment).
  The old combat tech nodes are gone, so gold can never become a buy-your-power runaway. Gold = `Φ^0.85`.
- **No equip-gate.** `ilvl` is a pure power stat; any hero may equip any item (only the class lock on
  weapons/off-hands remains). Keeping gear CURRENT is the dominant axis — a naked party hard-walls by
  **world 2**; tier (the rare chase) is the secondary, impactful boost that breaks the deep walls.
- **Tier multipliers are WIDENED** so high tiers feel impactful and gate the deep walls: T0=1.0 … **T8=9.0×**
  (was 4.2). Low/mid tiers kept near their old values so the baseline/opening don't shift. `GENERATOR_VERSION=4`.
- **Level is hard-capped at `MAX_LEVEL = 120`.** XP curve = `0.5·L^3.5 + 4.4^(L-39)` — cheap-polynomial early
  (party gets its kit fast), steep tail (the climb to the cap is a months-long grind). Safe to be steep
  because gear is decoupled from level and level is capped — it can't recreate the old impossibility.
- **Ultimates unlock at L30** (was a temporary L2).
- **The walls are the W-10 zone bosses.** Base `ZONE_BOSS_HP_MULT = 220` / `DMG 5.5` (down from 450/7.5,
  which was propped against the old combat-tech). On top, boss HP scales **per world**:
  `× ZONE_WALL_GROWTH^max(0, world-30)` (~1.11) — gentle through the easy opening (worlds 1–30), then a
  steepening, farmable ramp tuned for **world 100 ≈ ~1 year** of 24/7 play. No hard cliff: farm the rarer
  tier to break each one.
- **Loot:** `WAVES_PER_STAGE = 20`. Kills yield chests (normal **2%**/kill, stage-boss 25%, zone-boss 100%).
  A gem is EXTRA (never replaces gear). Zone **keys** come from stage-boss chests (which always carry one);
  zone-boss chests give none. **Rarity is world-depth-scaled** (replaces §13): `weight[tier] =
  TARGET100[tier] × R(world)^tier`, `R(world)=(world/100)^0.58`, with tier UNLOCKS pushed out (T0–T3 from
  world 1; T4→T8 unlock one per 2 worlds over worlds 12–20). T8 ≈ 0.1% of drops at world 100, creeping up
  with depth. **Auto-salvage** (Cube → Alchemy) melts marked rarities to gold on arrival.

The rest of this doc is the still-valid *shape* (accelerating Φ, mitigation, enrage, the gear-check feel).

---

## 1. Design goals (the feel we are tuning to)

1. **Infinite scaling.** Stages never end; numbers get very large (idle-genre big numbers are expected).
2. **Accelerating difficulty.** Going stage 50→51 is *harder* than 1→2 — the per-stage power *ratio* rises
   with stage, not just the absolute numbers.
3. **Fast early game.** The first ~2 worlds blow by in seconds per stage; the player feels powerful quickly.
4. **A gear-check treadmill, not a coast.** You CAN advance using gear from the previous stage or two, but
   you CANNOT keep advancing without continually equipping newer drops and spending talent/tech points.
   Freezing any power axis stalls you within a few stages.
5. **Stages are balanced around their monster level and the gear they drop.** Loot power is anchored to the
   stage that produced it, so "the gear from stage S" is, by construction, calibrated to "the enemies at
   stage S."

> The combat sim is deterministic, so all of this is **measurable**. We don't guess the balance — the smoke
> harness runs the sim and reports whether the invariants in §9 hold, and the constants are tuned until they do.

## 2. Power is multiplicative across axes (why you can't coast)

A hero's effective combat power is the **product** of independent axes:

```
Power(hero) ≈ GearPower × LevelPower × TalentPower × TechPower
```

- **GearPower** — from equipped items (the dominant late-game axis; grows fastest).
- **LevelPower** — from hero level (base stats + per-level growth). Big early, plateaus late (steep XP).
- **TalentPower** — from talent ranks (1 point/level; passives + scaled abilities).
- **TechPower** — from tech-tree combat nodes (global, account-wide).

Because the axes multiply, **neglecting one axis caps your whole power**, not just a slice of it. Enemy
power grows every stage; if GearPower (or any axis) stops growing, the product falls behind within a few
stages and you wall. That is the "must swap gear / spend points" requirement, expressed as math.

## 3. Monster level & the master growth curve (accelerating)

Let `S` = **global stage index** (1-based). **Monster Level `ML(S) = S`.** All scaling derives from one
**accelerating** per-stage growth ratio:

```
g(S) = G0 + (G1 - G0) * S / (S + KMID)        // rises from ~G0 early to ~G1 late
Φ(S) = Π_{i=1..S} g(i)                         // cumulative enemy power scalar (compute iteratively, cache)
```

Starting constants (`data/stageScaling.ts`):

```
G0   = 1.12     // early per-stage ratio (+12%/stage)  → fast early game
G1   = 1.30     // asymptotic late ratio (+30%/stage)   → brutal late game
KMID = 160      // half-way stage of the early→late ramp
```

Sample per-stage ratios (this is what makes later stages harder *per step*):

| Stage step | g(S) | meaning |
|---|---|---|
| 1 → 2 | 1.121 | +12.1% |
| 50 → 51 | 1.163 | +16.3% |
| 120 → 121 | 1.197 | +19.7% |
| 300 → 301 | 1.237 | +23.7% |
| 1000 → 1001 | 1.275 | +27.5% |

So 50→51 is meaningfully steeper than 1→2 (invariant #4 in §9), and the *cumulative* `Φ` makes the
absolute jump enormous on top of that.

> Implementation: compute `Φ` with a memoized iterative loop (`phiCache[S] = phiCache[S-1] * g(S)`), not a
> closed form. Keep it in `data/stageScaling.ts` as pure functions. `Φ(0) = 1`.

## 4. Enemy stats (`data/stageScaling.ts`)

```
enemyHp(S)     = HP0  * Φ(S)                 // HP0  = 40
enemyDamage(S) = DMG0 * Φ(S)^DMG_EXP         // DMG0 = 6,  DMG_EXP = 0.82
enemyAttackSpd = 0.8 attacks/sec baseline (enemy kinds vary ±0.2)

bossHpMult       = 8      bossDamageMult     = 1.7     // stage boss (W-1..W-9), ends a normal stage
zoneBossHpMult   = 35     zoneBossDamageMult = 3.0     // zone boss (W-10): a HARD farming gate, see §14

killsPerStage    = 10     // normal kills to fill the progress bar before the stage boss
```

> **Difficulty assumes near-BiS gear (§14).** Players are expected to farm `W-9` until they're almost fully
> geared *and* hold a zone key before clearing `W-10`. So tune the geared margin tight: normal stages clear
> comfortably when geared, but the **zone boss is a deliberate wall** that demands farmed high-tier upgrades.
> This keeps it an *idle* game — you set the party farming and come back, rather than babysitting constant
> gear swaps to advance every minute.

`DMG_EXP < 1` makes enemy **damage lag enemy HP**: the primary wall is a **DPS race** (you must out-damage
to clear in reasonable time), with survivability a secondary check. This avoids "one-shot" late-game spikes
while still pressuring defensive gear (via §5).

## 5. Combat mitigation (keeps defense relevant at every stage)

Flat armor would become worthless against exponential damage. Mitigation is therefore **relative to a
stage-scaled constant**, so defensive gear stays on the treadmill too:

```
mitigation(S) = armorEff / (armorEff + C_MIT * Φ(S)^MIT_EXP)     // in [0,1)
  where armorEff = armor * (1 - enemyPenetration)                // penetration cuts your armor's value
damageTaken = rawDamage * (1 - mitigation(S))

C_MIT   = 50
MIT_EXP = 1.0      // MUST track EG_FLAT (§6): armor is a FLAT stat scaling ~Φ^1.0, so the denominator
                   // scales ~Φ^1.0 too → mitigation stays ~constant when geared, and collapses when frozen.
```

To hold a given mitigation %, your `armor` must keep pace with `Φ` — i.e. you must keep equipping newer armor.
`magicResist` mitigates magic enemies via the identical formula; `block`/`dodge` are independent rolls on
top (block reduces a blocked hit by a %, dodge avoids it entirely). `health`/`hpRegen`/`hpPerHit`/`lifesteal`
provide the sustain that turns "survive the fight" into the secondary gate.

## 6. Gear power & loot scaling — FLAT vs PERCENT (READ THIS — the subtle part)

**Loot power is driven by the stage that dropped it.** This replaces SPEC §4.6 step 4's linear
`value = roll × ilvl × tierMult`. The chest's `origin.stageIndex` (in the item's deterministic birth
certificate) is the anchor. **But flat stats and percent stats scale completely differently** — getting this
wrong breaks the whole game (see the "two failure modes" box below).

```
EG_FLAT = 1.0      // flat-stat gear exponent (see why it must be ~1.0 below)

// FLAT stats  (attackDamage, health, armor, magicResist, hpRegen, hpPerHit):
statValue = round2( rand(min,max) * tierDef.statMultiplier * Φ(origin.stageIndex) ** EG_FLAT )

// PERCENT stats  (attackSpeed, critChance, critDamage, damageIncrease, penetration, lifesteal, dodge, block):
statValue = round2( rand(min,max) * tierDef.statMultiplier )        // NO stage scaling — bounded
```

- `rand(min,max)` from `data/stats.ts` (a small roll band, NOT ×ilvl).
- `round2` = round to 2 decimals so values are stable/deterministic (SPEC §4.6).
- `baseAffix.value` uses the same rule (flat vs percent by the affix's own `kind`).

**Why flat stats scale ~`Φ^1.0` and percent stats don't scale at all** — the two failure modes I verified by
computing the curves:

1. **If percent stats scaled exponentially:** effective DPS multiplies them
   (`attackDamage × (1+damageIncrease) × critMult × attackSpeed`). If each grew with `Φ`, the *product* grows
   like `Φ^4` → late game trivializes (you one-shot everything). **So percent stats must be BOUNDED rolls** —
   a crit roll gives +X% whether it dropped at stage 5 or 5000. Their growth comes from **higher tiers (more
   substats, bigger `statMultiplier`) and more sockets**, not from stage. They are the *build* layer.
2. **If flat stats scaled at `Φ^0.55` (or any exponent < 1):** flat damage *adds* across slots, so total flat
   ≈ `Φ^EG`. Enemy HP ≈ `Φ`. Time-to-kill ≈ `Φ^(1−EG)` → **unbounded growth**. At `EG=0.95` the geared
   shortfall is `Φ^0.05`, which is **138× by stage 500 and ~600,000× by stage 1200** (computed) — far more
   than tiers+levels+talents+tech can ever cover. The game becomes impossible. **So `EG_FLAT` must be ~1.0**:
   total flat power then tracks enemy HP exactly, and geared time-to-kill stays *constant* forever.

**Where the treadmill pressure then comes from** (since gear at `EG=1.0` only treads water on normal enemies):
- **Freezing gear drops the `Φ` term entirely** → you fall behind `Φ` per stage → stall in `B` stages (§3,§11).
- **Bosses are the meta-axis gate.** A stage boss has ×7 HP / ×1.6 damage (zone boss ×22 / ×2.2). Gear keeps
  TTK constant on *normals*, but to kill a boss before it kills you, you need the extra margin from **levels,
  talents, tech combat nodes, and percent-stat build (tiers/sockets)**. Neglect those and the boss walls you
  even with current gear — that is the "must spend hero/talent points" requirement, expressed as the boss check.

> Goal #5 still holds: a flat stat's power is a pure function of the **monster level of the stage that
> dropped it** (`Φ(stageIndex)`). "Stage-S gear" is calibrated to "stage-S enemies" by construction.
> `EG_FLAT` (≈1.0) is the treadmill knob; the harness may nudge it within [0.98, 1.0] but **not lower** —
> below ~0.97 the late-game shortfall explodes (computed above).

## 7. Item level bands (display + plausibility, not the power source)

`ilvl` stays a readable, linearly-growing band (SPEC's "1, 5, 10, 15…") used for **tooltips, sorting, and
the v2 plausibility cross-check** — power comes from `P(stageIndex)` in §6, not from `ilvl` directly.

```
ilvl(S) = max(1, 5 * round(0.5 * S))     // S=1→1(clamped), S=2→5, S=10→25, S=50→125, S=300→750
```

Both `ilvl` and `stageIndex` are recorded on the item (`ilvl` field + `origin.stageIndex`). Keep them
consistent (derive `ilvl` from `origin.stageIndex`) so a future server can sanity-check them.

## 8. XP / levels (extreme late-game curve) & income

**Level curve — polynomial early, exponential late (SPEC §6.4: "extremely big numbers"):**

```
totalExpToReach(L) = floor( 50 * L^3 + 8 * 1.55^L )      // cumulative XP to reach level L
expToNext(L)       = totalExpToReach(L+1) - totalExpToReach(L)
```

Sanity: Lv.36 ≈ 59M, Lv.60 ≈ 2.1e12, Lv.100 ≈ 8e19 — leveling effectively plateaus late, by design, so
**gear becomes the dominant axis in the late game** (classic idle treadmill) while levels + talents carry
the early/mid game. 1 talent point per level → talent points are precious and you must spend them well.

**Income per kill (scales with stage so economy keeps pace, but sub-linearly so it never trivializes):**

```
xpPerKill(S)       = round( 6 * Φ(S)^0.50 )    // leveling slows vs stages late → levels plateau
goldPerKill(S)     = round( 5 * Φ(S)^0.85 )    // gold funds tech (main sink) + inventory + class unlocks
// researchPerKill: NOT earned in v1 — research is reserved/unused (tech costs gold). Kept for forward-compat.
```

Boss/zone-boss kills pay a multiple of these (e.g. ×8 / ×40, `tune`).

## 9. Loot quality scales with stage (tierBias)

Higher stages and better chests bias drops toward higher tiers, so "the gear they drop" improves with
monster level (SPEC §4.6 step 2):

```
effectiveWeight[tier] = tierDef.dropWeight * (1 + tier * (S / 40) * chestFactor)
chestFactor = { normal: 1.0, stageBoss: 1.6, zoneBoss: 2.4 }
```

Combined with §6 (per-stat power keyed to `stageIndex`), a boss chest at stage S yields gear that is both
**higher-tier** and **higher-power** than a normal chest earlier — the reward gradient the player chases.

## 10. Big numbers — representation & display (a real, computed limit)

`Φ`, flat stat values, gold, and XP grow exponentially. **I computed exactly where JS `number` (doubles,
max ≈ 1.8e308) breaks:**

- **`Φ(S)` reaches `Infinity` at stage ≈ 2888–2962.** enemyHP/flat-gear/gold overflow at the same point.
- **`totalExpToReach(L)` overflows at level ≈ 1615.**

So plain `number` is **not literally infinite** — it caps around **stage ~2800 / level ~1600**. That is far
beyond any realistic v1 session (no human idles to stage 2800 in a browser prototype), so:

- **v1 default: use plain `number`,** and treat ~stage 2800 as the practical horizon. **Be honest in any
  "infinite" UI copy** — it's "effectively unbounded for v1," not literally infinite.
- **Mandatory: a thin numeric seam.** Route the unbounded quantities (anything derived from `Φ`: enemyHP/dmg,
  flat stat values, gold, research, XP, costs) through small helper functions (`add/mul/pow/cmp/format`) in
  one module (`sim/num.ts`). Don't scatter raw `**`/`*` on these values across the codebase.
- **For literal infinity (optional, the genre-correct upgrade):** drop **`break_infinity.js`** (a
  mantissa+exponent `Decimal`, built for idle games, handles ~1e9e15) in behind that seam. Because the seam
  exists, this is a localized swap, not a rewrite. **Not added in v1 by default** — flag to the user if they
  want true-infinite now (it adds a dep + a small determinism caveat for v2 server regen, irrelevant in v1).

- **A number formatter** (`sim/num.ts` `format()`): `1.24K / 3.4M / 9.1B / 2.7T / 4.5Qa / 6.7Qi …` then
  scientific (`1.2e45`) beyond named suffixes. Used everywhere a counter/stat is shown.

## 11. The treadmill calibration & the SIX invariants (testable)

The constants above (`EG_FLAT`, `G0/G1/KMID`, `HP0/DMG0/DMG_EXP`, `C_MIT/MIT_EXP`, tier weights/unlocks, the
income exponents, key/drop rates) are **co-tuned by the smoke harness** until all hold. Encode these as tests
/ harness assertions in Phase 1 (`scripts/sim-smoke.ts` + `test/sim/progression.test.ts`):

1. **Fast early game.** Stages 1–15, played "greedily" (always equip best dropped item per slot, spend
   points), each clear in **< ~8 s** of sim time.
2. **Geared progression on normals never hard-walls.** A "greedy" party (always re-gears from current-stage
   chests + spends talent/tech points) clears **normal stages** in bounded time (< ~25 s) for ≥ 300 stages.
   (Zone bosses are a *deliberate* wall — invariant #6 — not a violation of this.)
3. **No coasting (the gear check).** A "frozen" party — identical, but it **stops equipping new gear** at
   stage `S0` (keeps leveling/talents/tech) — must **stall** by stage `S0 + B`, with **B ∈ [2, 3]** (tighter
   than before, since we assume near-BiS farming). Run at several `S0` (e.g. 20, 80, 200).
4. **Accelerating difficulty.** `g(S)` is strictly increasing in `S`, so the per-stage power ratio at
   `S=50` is strictly greater than at `S=1` (and `Φ` is strictly increasing / monotonic).
5. **Rare high-tier drops (§13).** Simulate ~24 h of stage-50 farming throughput; the dropped-tier counts
   approximate the target: **~2× T6, ~1× T7 per day, ~1× T8 per 2 days** (items + gems combined). T4–T8 are
   **0%** before their unlock stage. (Calibrate the `RARITY` knob; report measured daily counts.)
6. **Zone boss = a farming gate (§14).** On first reaching `W-9` cleared with only `W-9`-level gear, the
   party **cannot immediately beat the `W-10` zone boss** — it requires farming time to accumulate higher-tier
   upgrades. And `W-10` is unreachable until a **zone key** drops (target: ~1 key / 30 min of farming).

**Stall threshold note (for the harness's invariant #3):** the analytic estimate uses "frozen gear stalls
once enemies are ~1.5–1.6× tougher than the gear was tuned for" — that's where the lengthening DPS race and
the collapsing mitigation jointly cause wipes. At that threshold the computed buffer is **B = 4 early → 2
late** (it tightens as `g(S)` steepens), squarely in [2,4]. The harness measures the *real* B with the full
combat sim; treat 1.5–1.6× as the sanity anchor, not the literal rule.

If an invariant fails, adjust the knobs (**`EG_FLAT` stays in [0.98, 1.0]** — see §6, lower breaks the late
game; tune the *boss* multipliers and the meta-axis magnitudes to set how hard you must lean on
levels/talents/tech; adjust `G1`/`KMID` for the late-game ramp) and re-run. **The build agent must report the
measured `B`, the early clear times, and the geared late-game clear time in PROGRESS.md when Phase 1 closes.**

## 12. Worked example (computed from the formulas above)

Generated by running the formulas (`G0=1.12, G1=1.30, KMID=160, EG_FLAT=1.0`). This is the **target the
smoke harness tunes against** — if your implementation's numbers don't match these, a formula is wrong.

| Region | S | g(S) | Φ(S) | enemyHP `40Φ` | enemyDmg `6Φ^0.82` | flatGear `Φ^1.0` | ilvl | gold/kill | research/kill | frozen B |
|---|---|---|---|---|---|---|---|---|---|---|
| **Early** | 1 | 1.121 | 1.12 | 44.8 | 6.6 | 1.12 | 1 | 6 | 1 | 4 |
| | 10 | 1.131 | 3.27 | 131 | 15.9 | 3.27 | 25 | 14 | 2 | 4 |
| | 25 | 1.144 | 22.8 | 912 | 77.9 | 22.8 | 65 | 71 | 9 | 4 |
| **Mid** | 50 | 1.163 | 824 | 33.0K | 1.48K | 824 | 125 | 1.5K | 110 | 3 |
| | 100 | 1.189 | 2.88M | 115M | 1.19M | 2.88M | 250 | 1.55M | 33.2K | 3 |
| | 200 | 1.220 | 406T | 16.2Qa | 5.71T | 406T | 500 | 13.1T | 16.8B | 3 |
| **Late** | 350 | 1.244 | 1.8e28 | 7.3e29 | 9.0e23 | 1.8e28 | 875 | 5.3e24 | 6.1e19 | 3 |
| | 500 | 1.256 | 6.7e42 | 2.7e44 | 7.9e35 | 6.7e42 | 1250 | 1.3e37 | 9.5e29 | 2 |
| | 1200 | 1.279 | 3.6e115 | 1.4e117 | 3.4e95 | 3.6e115 | 3000 | 8.3e98 | 7.7e80 | 2 |

XP milestones: Lv.10 ≈ 50.6K · Lv.36 ≈ 59.2M · Lv.50 ≈ 26.3B · Lv.100 ≈ 86.3Qi · Lv.200 ≈ 9.3e38.
(The `research/kill` column is illustrative only — research is reserved/unused in v1; gold is the sink.)

Reading the table: per-step enemy HP jump is **+12.2% at 1→2, +16.4% at 50→51, +23.8% at 300→301**
(accelerating, invariant #4). `flatGear = Φ` exactly tracks the `Φ` in enemyHP, so **geared time-to-kill on
normals stays constant** at every region (invariant #2) while **frozen gear stalls in B = 2–4 stages**
(invariant #3). Numbers stay within `number` range until the §10 horizon (~stage 2800).

> These invariants are the concrete, automated expression of the design requirements — checked by running
> the deterministic sim, not by eyeballing.

## 13. Tier rarity — unlock schedule, stage-scaled weights & drop-rate targets

Tiers (T0–T8 for items; **T1–T8 for gems, §14b**) are **gated by stage and extremely rare at the top**.
This governs both items and gems (they share one tier-roll function, `rollTier(S, chestFactor, rng)`).

**Unlock schedule (a tier's drop weight is 0 before its unlock stage):**

| Tier | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|---|
| Unlock stage `S≥` | 1 | 1 | 1 | 3 | **10** | **20** | **30** | **40** | **50** |

So before stage 10 the best possible drop is T3; T8 cannot appear until stage 50. (`data/tiers.ts` gains a
`unlockStage` per tier.)

**Stage-scaled weights (`rollTier`):**

```
baseWeight = [T0:1000, T1:620, T2:340, T3:170, T4:48, T5:11, T6:2.0, T7:0.30, T8:0.05]   // brutal top-end falloff
w(tier, S) = (S < unlockStage[tier]) ? 0
           : baseWeight[tier] * (1 + tier * (S/40) * chestFactor) * RARITY
chestFactor = { normal: 1.0, stageBoss: 1.6, zoneBoss: 2.6 }
RARITY      = 1.0   // global knob the harness tunes to hit the drop-rate target below
```

The `(1 + tier*(S/40)*chestFactor)` term makes higher tiers gradually **more likely with stage and with
better chests** (so deep farming + boss chests are where top tiers come from), while the tiny `baseWeight`
keeps them **rare in absolute terms**. Normalize `w` over unlocked tiers to get drop probabilities.

**Drop-rate target (invariant #5 — the thing the harness calibrates `RARITY`/`baseWeight` against):** a
player **farming at stage ~50, killing nonstop**, should obtain roughly:

| Tier | Target rate |
|---|---|
| T6 | ~2 per day |
| T7 | ~1 per day |
| T8 | ~1 per **2** days |

(Counts are items **and** gems combined.) The harness simulates ~24 h of stage-50 farming *throughput*
(kills → chests respecting caps + auto-open → opens → tier rolls) and tunes the weights until the measured
T6/T7/T8 counts land near these. Lower stages → even rarer (and 0 below unlock); higher stages → the unlock
gates open and the bias slowly lifts, but the top tiers stay a long-tail chase.

> Implementation: `rollTier` lives in `sim/loot.ts` (deterministic from rng), reads `data/tiers.ts`
> (`baseWeight`, `unlockStage`) + the `RARITY` constant. The existing tier-mean tests still hold (boss chests
> roll higher); add the unlock-gate test (no T4 before S=10, no T8 before S=50) and the drop-rate calibration.

## 14. The farming loop, zone keys & the zone-boss gate

This is the core idle loop and the reason difficulty is tuned tight (assume near-BiS).

**The loop.** Within a world `W`, stages `W-1 … W-9` are normal stages (trash → fill bar → stage boss →
auto-advance). The party farms these — especially repeating **`W-9`** — to accumulate: (a) higher-**tier**
gear/gems (rare, §13), and (b) **zone keys**.

**Zone keys.**
- Keys drop **rarely while farming the current world** (from chests, any type — `data/chests.ts`
  `zoneKeyChance`). **Target: ~1 key per ~30 min of `W-9` farming.** Harness-calibrated like the tier rates.
- **Multiple keys stockpile** (no cap beyond inventory sanity). Holding several lets the player **repeatedly
  fight the zone boss** to farm its guaranteed `zoneBoss` chest (the best loot source) before moving on.

**`W-10` is a single boss-fight stage (no trash, no progress bar).**
- It is **unreachable without a key**. Clearing `W-9` does **not** auto-advance to `W-10`; the party keeps
  farming `W-9` until it holds a key.
- Entering `W-10` **consumes one key** and starts a direct fight vs the zone boss
  (`zoneBossHpMult=35 / zoneBossDamageMult=3.0` — §4; a deliberate wall).
- **Win →** guaranteed `zoneBoss` chest, then auto-advance to `(W+1)-1`.
- **Loss (wipe) →** retreat to `W-9`; the key is **spent** (tunable: could be win-only — start with
  *consumed on attempt* so under-geared pushes cost something and reinforce farming). Keep farming gear + keys.
- Because the player can stockpile keys and the zone-boss chest is the top loot source, "farm the end boss"
  is a real activity: spend keys → kill zone boss → open its chest → repeat, until ready to advance.

**Why this is the gate (not raw stage scaling):** by §6 a geared party treads water on *normal* enemies
forever, so what actually stops you at the end of a world is (1) needing a **key** (≈30 min farm) and (2)
needing **farmed high-tier upgrades** to survive the ×35-HP/×3-damage zone boss. Both are **time-gated by
rare drops**, which is the correct *idle* pressure: leave the party farming `W-9` for a while, come back
stronger with keys, push the boss. No twitch, no minute-by-minute babysitting.

> Harness check (invariant #6): from a fresh `W-9` clear with only `W-9`-level gear, the party should NOT
> one-shot-clear `W-10` immediately; it needs N minutes of simulated farming (gear + a key) first. Tune the
> zone-boss multipliers + key rate so that N is "a while" (a meaningful idle session), not seconds and not hours.

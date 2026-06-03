# PHASE 2 — Polynomial scaling rework + enemy rebalance (HANDOFF)

> **You are a fresh agent picking this up.** Read this whole file, then read CLAUDE.md, `docs/PROGRESSION.md`
> (it has a mid-rework banner), and the memory `number-system-rework`. This is the second half of a large
> stat-system overhaul. **Phase 1 (all structural changes) is DONE and merged into the working tree.** Your
> job is Phase 2: replace the exponential scaling with a polynomial curve so numbers stay readable, then
> rebalance enemies + restore the deferred tests.

---

## 0. The one-sentence goal

Kill the exponential number bloat (a T4 bow's attackDamage hit **~1e42 by world 50**, ~1e80 by world 100 —
the user called this "absolutely dumb") by moving all scaling onto a **polynomial "B-curve"** with readable
magnitudes, then re-tune enemies + income so the game stays balanced and the deferred tests pass again.

## 1. What Phase 1 already did (current state — do NOT redo)

All of this is implemented, sim-green (140 tests pass / 1 skip), and documented (AFFIXES.md + DATA_MODEL.md
rewritten; PROGRESSION.md/BALANCE.md/TALENTS.md have mid-rework banners):

- **Scaler / Enabler split.** SCALERS (unbounded): `attackDamage, attackSpeed, critDamage, armor,
  magicResist, health, healPower`. ENABLERS (diminishing-returns soft-capped, `ENABLER_SOFT_CAPS` in
  `data/stats.ts`, applied once in `sim/stats.ts` `aggregate`): `critChance` 100/k60, `block` 75/k50,
  `cooldownReduction` 50/k40, `multistrike` 25/k20. Formula `effective = cap·raw/(raw+k)`.
- **Removed entirely:** `dodge`, `hpPerHit`, `penetration`. **Buff-only:** `damageIncrease`, `lifesteal`,
  `damageReduction`. **Base-only:** `hpRegen`. **Added:** `multistrike` (% chance of a 2nd auto-hit).
- **Enabler slot restrictions** (AFFIXES.md): block→knight sword/shield; multistrike→knight+ranger weapons;
  critChance→all weapons-but-priest-armor + jewelry; CDR→jewelry only. Armor = scalers only (`FLEX_STATS`=7);
  jewelry = `JEWELRY_STATS` (FLEX + crit + CDR). Tome base CDR→healPower.
- **Crit applies to heals** (heal/HoT crit off caster crit chance × crit damage).
- **Gems redesigned:** scaler-only, one stat each (Ruby=AD, Sapphire=critDamage, Amethyst=attackSpeed,
  Emerald=health, Topaz=healPower, Diamond=armor+MR).
- **90% armor/MR DR cap** (`MAX_ARMOR_DR` in `data/stageScaling.ts`).
- **Wave rework:** flat **5-10 mobs/stage**, teleport in as 3 batches ~1s apart (`partitionWave` in
  `sim/stages.ts`), spread across a 45px band; **elites** (`ELITE_CHANCE` 8%, 2× hp/dmg/chest, `isElite` flag).

## 2. The Phase 2 work (in order)

### 2a. Swap the exponential spine for a polynomial — `data/stageScaling.ts`
The master scale is `phi(S)` (product of `g(i)` — **exponential**). Everything that scales rides it:
- `enemyHp(S) = HP0 · phi(S)` (`HP0=40`)
- `enemyDamage(S) = DMG0 · phi(S)^DMG_EXP` (`DMG0=6`, `DMG_EXP=0.82`)
- `mitigation(armor,S) = armor/(armor + C_MIT·phi(S)^MIT_EXP)` (`C_MIT=50`, `MIT_EXP=1.0`), now `Math.min(MAX_ARMOR_DR,…)`
- gear flat stats: `sim/loot.ts rollStatValue` → `rand·tierMult·GEAR_POWER·phi(ilvl)^EG_FLAT` (`GEAR_POWER=9`, `EG_FLAT=1.0`)
- gems: `sim/gems.ts gemGrants` → flat grants `·phi(stageIndex)^EG_FLAT`

**Replace `phi`/`g` with a polynomial `P(S)`** shared by ALL of the above (so the gear-vs-enemy RATIOS are
controlled and numbers shrink together). The flat exponent is the B-curve's `~1.05` (tunable). Keep the
flat/percent split in `rollStatValue`.

### 2b. ADD gentle ilvl scaling to percent stats (NEW — they're flat today)
Currently `rollStatValue` percent branch = `rand·tierMult` (no ilvl). Phase 2 adds a gentle ilvl factor:
- **Percent SCALERS** (critDamage/attackSpeed/healPower): `~ilvl^0.37` — target ~5%@il50 → ~14%@W100 → ~20%@W200.
- **Enabler RAW** (critChance/block/CDR/multistrike): also a gentle ilvl growth so their soft-capped
  EFFECTIVE climbs across the WHOLE game (target e.g. crit ~40%@W50 → ~90%@W200), not walling early. The
  diminishing-returns happen in `aggregate`; here you just make the raw grow with ilvl. Tune the `k` values
  in `ENABLER_SOFT_CAPS` together with this growth.

### 2c. Magnitude targets (references, not exact — user said "treat as adjustable")
- ilvl ≈ global stage (`expectedLevel(S) ≈ S − lag`, `LEVEL_LAG_CAP=12`). World W ≈ ilvl W·10.
- **Flat scaler (a T4 item):** ~125 @ ilvl50 → ~2,000 @ ilvl1000 (W100) → ~10,000 @ ilvl2000 (W200). NEVER e42.
- **Percent scaler:** ~5% @ il50 → ~14% @ W100 → ~20% @ W200.
- Exponents `~1.05` (flat) / `~0.37` (percent) are STARTING points; tune in-sim to hit these.

### 2d. Re-source difficulty (CRITICAL — don't just swap the function)
Under a polynomial curve the **on-level power gap nearly vanishes**: `P(S)/P(S−12) → ~1` at deep worlds (vs
exponential `g^12 ≈ const`). So on-level fights get trivially easy with depth unless you move the difficulty.
**Re-derive it onto:** (1) the **zone-boss walls** (`ZONE_BOSS_HP_MULT` × `zoneWallHpFactor(world)` — make
this the primary time-gate) and (2) the **gear-acquisition treadmill** (you out-gear each wall by farming
higher tier/ilvl, which paces the year). Regular waves should be "clearable on-level"; the walls + farm carry it.

### 2e. Re-anchor enemies + income
Re-tune `HP0`, `DMG0`, `DMG_EXP`, `C_MIT`, the zone-wall growth, and income bases (`goldPerKill`/`xpPerKill`
in `data/stageScaling.ts`) onto the polynomial. Account for: the party is **squishier** now (removed sustain
stats) and waves are **bigger** (5-10 + elites). Target **on-level armor DR ~50%** (sets `C_MIT` vs gear armor).

## 3. Confirmed inputs (the user already decided these)
- On-level armor DR **~50%**, hard cap **90%** (already in `MAX_ARMOR_DR`).
- **Keep "World 100 ≈ 1 year"** as the pacing target.
- Curve exponents **adjustable** (tune to the §2c magnitudes).
- **Tight economy + slow XP stay** (see memory `economy-pacing-directive`) — fix pacing via enemy/wall/curve
  tuning, NOT by loosening income.

## 4. Validate (the acceptance gate)
- `npm run typecheck && npm run lint && npm test` — green.
- `npx tsx scripts/sim-newgame.ts` — fresh solo-knight MUST still bootstrap 1-1 (memory `fresh-start-must-bootstrap`).
- `npx tsx scripts/sim-smoke.ts` — full curve report (sane, readable magnitudes, no e42).
- `scripts/sim-calib.ts` / `sim-gear.ts` / `sim-multiseed.ts` — calibration probes (see CLAUDE.md).
- Watch the RNG-tail sensitivity on progression #1/#2 (memory `progression-tail-is-rng-sensitive` — pool across
  seeds; don't loosen a bound for a single-seed flake).

## 5. RESTORE the 3 deferred tests (un-do the Phase-1 markers)
Grep for `PHASE 2` in `test/`:
- `test/sim/progression.test.ts:~67` — restore `minStage ≥ 30` and `all.length > 4500` (now 15 / 1500).
- `test/sim/smoke.test.ts` — restore `r.stage ≥ 25` and `norm.length > 40` (now 15 / 10).
- `test/sim/frontline.test.ts` — un-`it.skip` "a bulkier melee front holds the line far longer"; restore the
  `≥ 1.15×` margin. They should PASS at the rebalanced numbers (if not, the rebalance isn't done).

## 6. Finish-up
- **Bump `GENERATOR_VERSION` 5→6** in `data/lootTables.ts` (gear magnitudes change → clean-wipe old gear on load).
- **Un-stale the docs:** rewrite PROGRESSION.md's scaling section for the polynomial + remove its banner;
  refresh BALANCE.md's magnitude tables + remove its banner.
- Update the memory `number-system-rework` Status → Phase 2 done.

## 7. Out of scope for Phase 2 (separate, still pending — don't get pulled in)
- **Item-tooltip raw+effective `(±%)` display** (all surfaces; buffs vs current stats) — a UI task, decided
  but unbuilt. See memory `number-system-rework`.
- **Elite/teleport RENDER** (bigger elite sprite + "summon poof") — sim exposes `isElite` + batch timing; render-only.
- **`src/game/render/characterFrames.ts` is broken** — the user is mid-reorganizing character art (deleted
  `assets/characters/ranger/*.png`, added untracked `Archer/` + `mage/`). The **production build will fail**
  until those import paths are fixed. This is unrelated to the sim and not your concern unless asked.

## 8. Key files
- `src/data/stageScaling.ts` — the scaling spine (phi/g, enemyHp/Damage, mitigation, expectedLevel, income, wave/elite/zone constants).
- `src/sim/loot.ts` — `rollStatValue` (flat vs percent scaling).
- `src/sim/gems.ts` — gem grant scaling.
- `src/data/stats.ts` — `ENABLER_SOFT_CAPS`, `FLEX_STATS`/`JEWELRY_STATS`, stat defs (`rollPerIlvl` bands).
- `src/sim/stats.ts` — `aggregate` (where soft caps apply).
- `test/sim/progression.test.ts` / `smoke.test.ts` / `frontline.test.ts` — the gates to restore.
- `scripts/sim-*.ts` — the tuning harness. Beyond newgame/smoke/calib/gear/multiseed, these are directly
  useful for Phase 2: `sim-worlds.ts` (per-world pacing), `sim-zoneboss.ts` (the wall gate),
  `sim-survival.ts` (tank survivability), `sim-pacing.ts`, `sim-rarity.ts`, `sim-wipes.ts`. Run `ls scripts/`.

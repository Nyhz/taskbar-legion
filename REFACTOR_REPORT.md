# Refactor Report — Behavior-Preserving Cleanup Pass

**Branch:** `refactor/cleanup-pass` (6 commits; NOT merged to `main`)
**Date:** 2026-06-03
**Mode:** autonomous senior-architect cleanup, unsupervised. Every change verified against the test gate;
anything risky/untested was logged rather than applied.

---

## TL;DR

A conservative, fully-green cleanup. The codebase was already in **good shape** (clean architecture, mostly
high-signal comments, no comment-rot/TODOs/commented-out code). The wins were: removing genuinely-dead code,
correcting a cluster of **actively-misleading stale comments** (the most valuable being a phantom "equip-gate"
documented in 3 places that does not exist in code), and one safe hot-path allocation removal.

- **Net −84 LOC** (141 deletions / 57 insertions), 2 dead files deleted, 1 dead scratch script pruned.
- **Gate green throughout:** `typecheck` ✅ · `lint` ✅ (0 warnings) · `test` ✅ **139/139** (unchanged).
- Determinism, RNG order, save schema, and all tuned balance numbers **untouched**.

---

## Baseline (recorded before any change)
- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm test` ✅ — 139 tests, 26 files, ~27s.
- Source: 15,066 LOC. `tsconfig`/lint cover **only `src` + `test`** — `scripts/` is dev-only and outside the
  gate, so changes there were limited to deletion of a provably-unreferenced file.

---

## Changes made (6 commits)

### 1. Dead files & exports — `eea5772`
- **Deleted `src/game/render/Backdrop.ts`** (50 LOC). `createBackdrop` was its only export; nothing imports
  it (superseded by `StageBackground.ts` / `backgroundLayers.ts`). Proven unused across src/test/scripts.
- **Deleted `src/game/camera.ts`** (10 LOC). Self-described "Phase 0 stub"; `GameStrip.ts` implements its own
  inline spring-camera, so this `createCamera`/`Camera` stub was never wired up.
- **Removed `expToNext`** (`data/stageScaling.ts`) — dead derived helper, zero callers (leveling uses
  `totalExpToReach`).

### 2. Stale-comment corrections — `84ca8b3` (comment-only)
Comments still described the **pre-overhaul** model. Each was verified against the live constant first:
- **Ultimate unlock L60 → L30** (`ULTIMATE_UNLOCK_LEVEL = 30`): `data/ultimates.ts`, `sim/loadout.ts` (×2),
  `sim/world.ts` (×2), `data/talents.ts`.
- **Zone boss "450× / ⚠ NEEDS RE-TUNE" → 220×** (`ZONE_BOSS_HP_MULT = 220 / DMG 5.5`): rewrote the stale
  block in `data/stageScaling.ts`. The retune is *done* (project memory + PROGRESSION §0); the deep wall is
  now carried by per-world `ZONE_WALL_GROWTH`, not a flat multiplier.
- **Removed the phantom "equip-gate"** framing in `data/stageScaling.ts` — it claimed ilvl is "the equip
  requirement (a hero must be `level >= ilvl`)". **Verified no such gate exists anywhere in code** (the only
  live equip restriction is the weapon/off-hand class lock, `cannotEquip = wrongClass` in PartyPanel).
  Rewrote to describe `expectedLevel(S)` as the intended level curve + generated-item ilvl anchor.

### 3. Hot-path allocation removal — `0d64e23` (perf)
- `sim/combat.ts` upkeep loop allocated a fresh `[...heroes, ...enemies]` array **every tick** (10^7–10^8×
  in dev probes). Extracted the body to `tickCombatantUpkeep(...)` and split into two order-preserving loops
  (heroes then enemies). The upkeep step **consumes no RNG** (verified `tickEffectDurations`/`tickCooldowns`/
  dot/hot/regen are all RNG-free), and the spread order was exactly heroes-then-enemies, so this is
  **byte-identical** — confirmed by the determinism tests + PROGRESSION invariants.
- **Measured (before/after micro-bench, 2M ticks × 5 seeds):** `8245 → 8150 ns/tick`, ~1.1% end-to-end. The
  array is small, so the real value is reduced GC pressure (one fewer allocation per fighting tick); it is a
  strict no-regression.

### 4. Unused exports & scratch script — `ccb000f`
- Removed `transfigCost` + `TransfigCost` (`sim/cube.ts`) — dead; the live transfigure path uses
  `canTransfigure`/`transfigPool`/`transfigureRoll`. Removed `hasId` (`sim/slots.ts`) — dead predicate.
- Deleted `scripts/_ab.ts` — an ad-hoc scratch probe (leading underscore, unreferenced). The maintained
  `sim-*` calibration probes are referenced from source comments and were **kept**.

### 5. Dead tech-effect branch — `751b6c5`
- **`chestDropMult` had no producing tech node** (confirmed: chest drops are tuned per-type via
  `chestTypeDropMult`; the *global* multiplier comes only from the `lucky_cat` pet). Removed the dead union
  member (`data/techTree.ts`), its unreachable case in the tech loop (`sim/bonuses.ts`), and its two
  unreachable case labels in the UI formatter (`ui/.../techDisplay.ts`). Provably behavior-neutral (no node
  ever produced it); typecheck enforces switch-exhaustiveness. Documented the pet-only source. The pet path
  (`Bonuses.chestDropMult`, `chests.ts`, PetsPanel) is fully intact.

### 6. Dead helper + remaining stale comments — `1e53033`
- Removed `isPercentStat` (`data/stats.ts`) — dead duplicate of the inline `STATS[k].kind === 'percent'`.
- Fixed the same phantom equip-gate claim in `sim/loot.ts` (`rollItemLevel` docstring) and a stale
  "equip gate (level ≥ ilvl)" comment in `test/state/inventoryGems.test.ts` (comment-only; test behavior
  unchanged).

---

## Verified-safe and intentionally LEFT ALONE (with rationale)

These were checked and deliberately not touched — either deliberate seams, tested API, or save-compat:
- **`combatMods` channel** (`sim/bonuses.ts`) — always-empty reserved party-combat channel, threaded through
  engine/loadout/harness and **asserted length-0 by `test/sim/bonuses.test.ts`**. Deliberate + tested. KEPT.
- **Numeric `cmp`** (`sim/num.ts`) — lone untested member of the §10 big-number seam (`add/mul/pow` are
  tested). Part of the documented forward-compat seam. KEPT.
- **`listSurfaces`/`clearSurfaces`** (`platform/surfaces.ts`) — the v1.5 hit-test consumer seam
  (ARCHITECTURE.md: "no consumer in v1"). KEPT.
- **`deriveSeed`** (`sim/rng.ts`) — unused determinism sub-stream primitive. Left untouched (no value in
  editing the RNG core unsupervised; no runtime/order impact either way).
- **`hasTag` + the `tag` effect kind** (`sim/effects.ts` / `data/effects.ts`) — data-driven effect
  extensibility point; KEPT.
- **`hasHot`** (`game/render/fx.ts`), **`PaletteKey`** (`styles/palette.ts`), **`MAX_SUBSTATS`/`ENEMY_SPREAD`**
  (data constants) — verified-unused but low value and/or data-sensitive; left for human review.
- **Save schema** (`persistence/saveManager.ts`) — `inventoryGems: []` (retired), `researchPoints`, `cube`,
  `online` reserved fields, and the `migrate()` legacy `zoneKeys`/`chests` handlers are all deliberate
  save-compat retentions (golden rule #4). Clean — no change.

---

## Risky items LOGGED for human review (NOT done — would change behavior or aren't test-protected)

1. **Latent bug — `root` effect is applied but never enforced.** The `root` effect kind is *produced*
   (`sim/abilities.ts`) but its only intended consumer, `isRooted` (`sim/effects.ts`), is **called nowhere**.
   `combat.ts` movement does not check `isRooted`, so rooting an enemy/hero currently has **no effect on
   movement** (unlike `isSilenced`, which *is* enforced for casting). Either wire `isRooted` into the
   movement gates in `combat.ts`, or remove the root machinery. Left as-is (removing the consumer would hide
   the gap). Needs a design decision.

2. **Perf — `heroStats`/`casterStats` recompute + allocate in the hot path.** `heroStats(c)` runs
   `aggregate(c.baseStats, [...c.staticMods, ...effectStatMods(c.effects)])`, allocating 2 arrays + 3 objects
   per call, and is called multiple times per combatant per tick (regen, each hero attack, and once *per
   attacking enemy* for the same front hero). A per-tick memo of each combatant's `EffectiveStats` (the
   inputs don't change within the attack phase) would remove the largest remaining per-tick allocation/CPU.
   It's a structural cache-invalidation change in the determinism-sensitive stats path — wants human review,
   though `aggregate` is verified side-effect-free so the result would be identical.

3. **Modularization of oversized UI/render files (untested layer).** `ui/panels/CubePanel.tsx` (457),
   `ui/panels/PartyPanel.tsx` (429), `game/render/HeroSprite.ts` (427) exceed the ~200-line soft cap and have
   clean subcomponent/extraction seams. **Deliberately not done**: `ui/` and `game/` are **not covered by any
   test** (the gate only protects sim/state/persistence), so a behavioral/visual regression wouldn't be
   caught. These are safe, mechanical extractions for a supervised session with a visual check.

4. **`test/sim/harness.ts` (471 LOC).** The `GreedyRunner` agent is cohesive but large; the tech-buying and
   chest-handling logic could be extracted into helper modules. Low priority (test infra, not shipped); left
   to avoid churn.

### Considered but explicitly NOT split (cohesion > line-count)
- **`sim/abilities.ts` (361).** Its tooltip helpers deliberately reuse the cast engine's exact
  magnitude/duration math so tooltips can't diverge from real combat — a feature, not a smell. Splitting would
  force exporting internals. Kept whole.
- **`sim/loot.ts` (201).** Single responsibility (deterministic item generation); no real seam.

---

## Final status

- `npm run typecheck` ✅
- `npm run lint` ✅ (0 warnings)
- `npm test` ✅ — **139/139** passing (identical to baseline; determinism invariants hold)
- Branch `refactor/cleanup-pass`, 6 commits, **−84 LOC net**, left un-merged per instructions.

**Confidence:** high. Every change is either (a) provably dead code removed with grep-proof, (b) a comment-only
correction verified against the live constant, or (c) a byte-identical hot-path refactor confirmed by the
determinism test suite. No tuned numbers, RNG order, or save fields were altered.

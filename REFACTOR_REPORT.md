# Refactor Report — Behavior-Preserving Cleanup Pass

**Branch:** `refactor/cleanup-pass`
**Started:** 2026-06-03
**Operator:** autonomous senior-architect cleanup (unsupervised)

## Baseline (green)
- `npm run typecheck` ✅
- `npm run lint` ✅ (zero warnings)
- `npm test` ✅ — 139 tests, 26 files, ~27s
- Source: 15,066 LOC across src + test + scripts.

Note: `tsconfig` include = `["src","test",...]`; lint targets `src test`. **`scripts/` is dev-only and
outside the gate** — changes there are not verified by typecheck/lint/test, so they are limited to deletion
of provably-unreferenced files.

## Lead verification (before touching anything)
- **`combatMods`** — NOT dead. Reserved party-wide combat-mod channel, currently always-empty (tech is
  non-combat), but threaded through `engine.ts`, `loadout.ts`, `harness.ts` and **asserted length 0** by
  `test/sim/bonuses.test.ts`. Load-bearing API + tested → KEEP. Logged as intentional.
- **`chestDropMult`** — NOT dead. Fed by the `lucky_cat` pet (`data/pets.ts`) and present in the tech-effect
  union; consumed in `chests.ts`. KEEP.
- **`scripts/_ab.ts`** — no references anywhere (src/test/scripts). Deletion candidate (dev-only).

---

## Changes made

### 1. Dead code removal (commit `eea5772`)
- **Deleted `src/game/render/Backdrop.ts`** — `createBackdrop` was its only export and nothing imported it
  (superseded by `StageBackground.ts` / `backgroundLayers.ts`). Proven unused across src/test/scripts.
- **Deleted `src/game/camera.ts`** — self-described "Phase 0 stub"; `GameStrip.ts` implements its own
  spring-camera inline, so this `createCamera`/`Camera` stub was never wired up. Proven unused.
- **Removed `expToNext` from `data/stageScaling.ts`** — dead derived helper (`totalExpToReach(L+1) -
  totalExpToReach(L)`) with zero callers; leveling uses `totalExpToReach` directly.

### 2. Stale-comment fixes (commit `84ca8b3`) — comment-only, behavior-preserving
Comments still described the PRE-overhaul model. Verified each against the live constant before fixing:
- **Ultimate unlock L60 → L30** (actual `ULTIMATE_UNLOCK_LEVEL = 30`): fixed in `data/ultimates.ts:2`,
  `sim/loadout.ts:132` & `:199`, `sim/world.ts:34-35`, `data/talents.ts:12`.
- **Zone boss "450× / NEEDS RE-TUNE" → 220×** (actual `ZONE_BOSS_HP_MULT = 220 / DMG 5.5`): rewrote the
  stale `data/stageScaling.ts:23-27` block. The retune is *done* (per project memory + PROGRESSION §0);
  the deep wall is now carried by per-world `ZONE_WALL_GROWTH`, not the flat multiplier.
- **Removed the phantom "equip-gate" framing** in `data/stageScaling.ts:155-164` — it claimed ilvl is "the
  equip requirement (a hero must be `level >= ilvl`)". Verified NO such gate exists anywhere in code;
  PROGRESSION §0 says ilvl is pure power with no equip-gate. Rewrote to describe `expectedLevel(S)` as the
  intended level curve + generated-item ilvl anchor, preserving the bounded-lag rationale.

## Risky items intentionally left for human review

- **`sim/bonuses.ts` `combatMods` channel** — currently always-empty (tech is non-combat), but threaded
  through `engine.ts`/`loadout.ts`/`harness.ts` and **asserted length-0 by `test/sim/bonuses.test.ts`**.
  It's a deliberate reserved channel + tested API. KEPT.
- **`isRooted` (sim/effects.ts)** — the `root` effect kind is *produced* (abilities.ts) but `isRooted`, its
  only intended consumer, is never called, so root effects are applied but **not enforced** (no movement
  block). Possible latent bug. Left as-is (removing the consumer would hide the gap); flagged for design.
- **Numeric seam `cmp` (sim/num.ts)** — lone untested member of the §10 big-number seam (`add/mul/pow` are
  tested). KEPT as part of the documented forward-compat seam.
- **`listSurfaces`/`clearSurfaces` (platform/surfaces.ts)** — unused v1.5 hit-test seam (ARCHITECTURE.md
  documents "no consumer in v1"). KEPT.
- **`deriveSeed` (sim/rng.ts)** — unused determinism sub-stream primitive. KEPT (touching the RNG core
  unsupervised isn't worth the marginal LOC; no runtime/order impact either way).
- Other verified-unused but low-value / data-sensitive orphans left in place: `hasTag`+`tag` effect-kind
  (data-driven effect extensibility), `hasId` (slots.ts), `hasHot` (fx.ts), `transfigCost`/`TransfigCost`
  (cube.ts), `MAX_SUBSTATS`/`ENEMY_SPREAD` (data constants), `isPercentStat` (stats.ts), `PaletteKey`.

## Final status

(filled at completion)

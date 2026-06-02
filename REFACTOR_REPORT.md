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

(updated as work proceeds)

## Risky items intentionally left for human review

(updated as work proceeds)

## Final status

(filled at completion)

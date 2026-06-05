# TESTING.md — Test strategy & the mandatory list

Tests are part of "done," not an afterthought. The simulation is the trust anchor of the whole game (and,
later, of anti-cheat), so it carries real coverage. The UI is verified visually.

## Tooling

- **Vitest.** `npm test` (run once) / `npm run test:watch` (watch) / `npm run test:cov` (coverage).
- Default test environment is **node** (`vite.config.ts`). This is deliberate: **no test for `sim/` or
  `data/` may import Pixi or React** (SPEC §11). If a file genuinely needs the DOM (rare — a component
  test), opt in per-file with a top-of-file comment: `// @vitest-environment jsdom`.
- Tests live in `test/` (mirroring `src/`, e.g. `test/sim/loot.test.ts`) or co-located as `*.test.ts`.

## What gets tested where

| Layer | Coverage expectation |
|---|---|
| `sim/`, `data/` | **High.** Pure functions — unit-test thoroughly. The mandatory list below is the floor, not the ceiling. |
| `platform/` | `surfaces` registry logic if any branching. (v1.5's `hitTest` test is deferred with the feature.) |
| `state/` | Light — test non-trivial slice reducers (equip moves item, caps enforced). |
| `game/`, `ui/` | **Visual**, not unit. Verified by running the app / screenshot per phase. |

## The mandatory test list (SPEC §4.6, §4.8, §4.10, §11)

Write these in Phase 1. Each must pass before Phase 1 is done.

**Loot generation (`sim/loot.ts`):**
- [ ] T3 (Epic) weapon, ilvl 20 → baseAffix = `attackDamage`, **exactly 2 offensive substats** + **1 empty
      socket**, no defensive stat present.
- [ ] T8 (Primordial) chest armor, ilvl 30 → baseAffix = `armor`, **exactly 4 defensive substats (cap)**,
      **4 empty sockets**.
- [ ] No jewelry item ever rolls at T0 (run many rolls; assert none are `category:'jewelry' && tier:0`).
- [ ] Substat keys are distinct (no duplicate stat on one item), never exceed 4, never equal the base affix.
- [ ] Substats respect routing (armor→defensive only; weapon→offensive only) per `docs/AFFIXES.md`.
- [ ] **Jewelry rolls from both pools, mixed:** a defensive stat on jewelry is legal (not rejected); over
      many jewelry rolls, both offensive-only and defensive-containing items appear.
- [ ] **Determinism:** `generateItem(origin)` called twice with identical `origin` returns deep-equal items.
- [ ] Every generated item has a populated `origin` and `bound === false`.

**Gems (tiered T1–T8):**
- [ ] A gem's **signature** grant is category-dependent: Ruby's first stat in **armor** is `health`, in
      **weapon** is `attackDamage` (group rules hold; jewelry may be either).
- [ ] **Tier = more affixes:** a T1 gem grants `gemAffixCount(1)`=1 stat; a T7/T8 gem grants 4. Higher tier →
      bigger values (`gemTierMult`).
- [ ] A gem's flat grants scale with `Φ(gem.origin.stageIndex)`; percent grants do not (same rule as items).
- [ ] Socketing any gem sets `item.bound = true`; gem grants stack on top of item affixes (can exceed 4).

**Tier rarity & unlock (`rollTier`, DIFFICULTY.md §13):**
- [ ] No tier drops before its `unlockStage` (no T4 before S=10, no T8 before S=50) — for items AND gems.
- [ ] Drop-rate target: simulated stage-50 farming yields ~2 T6/day, ~1 T7/day, ~1 T8/2days (calibration).

**Tech tree (gold sink):**
- [ ] Node `goldCost(ring, rank)` increases exponentially with ring and with rank (monotonic; deep ≫ shallow).
- [ ] Buying a node deducts **gold** (not research); research stays 0/unused.

**Chests (`sim/chests.ts`):**
- [ ] Boss/zone chests have a **measurably higher mean tier** than normal chests at the same stage
      (sample N opens; compare means).
- [ ] Per-type storage caps **stop accrual** when full (further kills of that source yield no chest).
- [ ] Opening a chest frees a storage slot and yields the configured item count.

**Stages (`sim/stages.ts`):**
- [ ] `W-10` is a **boss-only stage, unreachable without a zone key**: clearing `W-9` does not advance; the
      party keeps farming `W-9` until a key drops; keys **stockpile**; entering `W-10` **consumes one key**;
      win → guaranteed zoneBoss chest + advance to `(W+1)-1`; wipe → retreat to `W-9` (key spent). No trash /
      no progress bar on `W-10`.
- [ ] Stage scaling is **monotonic** (enemy HP/damage, gold, research, ilvl band all non-decreasing in
      global stage index).

**Progression / gear-check treadmill (`docs/DIFFICULTY.md` §11 — the four invariants):**
- [ ] **Accelerating difficulty:** `g(S)` strictly increasing → per-stage power ratio at S=50 > at S=1;
      `Φ(S)` strictly increasing.
- [ ] **Fast early game:** a "greedy" party (always equips best dropped item per slot, spends points) clears
      stages 1–15 in < ~8 s sim-time each.
- [ ] **Geared progression never hard-walls:** greedy party keeps per-stage clear time bounded (< ~25 s) for
      ≥ 300 stages.
- [ ] **No coasting (the gear check):** a "frozen" party that stops equipping new gear at S0 (but keeps
      leveling/talents/tech) **stalls by S0 + B with B ∈ [2,4]** — test at S0 ∈ {20, 80, 200}. Report the
      measured B in PROGRESS.md.

**Effects & abilities (`sim/effects.ts`, `sim/abilities.ts`):**
- [ ] Applying **Fuego Rápido** (`buff_fast_fire`) raises effective `attackSpeed` by +50% for exactly 8s,
      then it reverts.
- [ ] A **stun** effect blocks the unit's attacks for its duration (and `silence` blocks casts).
- [ ] Two stacking debuffs stack per their `stackRule` (`refresh` vs `extend` vs `independent`).
- [ ] Effect application/expiry is deterministic under a fixed seed.

**Combat (`sim/combat.ts`):**
- [ ] Deterministic: same seed + same initial state ⇒ identical tick-by-tick outcome (hash the state stream
      or compare final state).
- [ ] On party wipe, the party retreats one stage and resumes (no permadeath).

**Offline (`sim/offline.ts`):**
- [ ] Offline yield scales with elapsed time and stage, is **capped**, respects per-type chest caps, and
      applies `offlineMult`. Deterministic from the seed.

**Bonuses (`sim/bonuses.ts`):**
- [ ] `getBonuses` merges tech + pets correctly (e.g. two `goldMult` sources sum; a pet bonus applies
      regardless of selection).

> Convert each `[ ]` to a real `it(...)`. Treat the list as the minimum. Add edge-case tests freely.

## Visual checks (per phase)

Every phase ends with a visual gate (PLAN.md). To verify:

1. `npm run dev`, open the printed localhost URL.
2. Observe the specific behaviors in the phase's ✅ gate (e.g. progress bar fills, boss dies, panel drags).
3. Capture a screenshot (or short screen recording) as evidence. If you have the `verify`/`run` skills
   available, use them to drive the app and capture the screen. Otherwise describe what you observed and,
   if a headless browser (Playwright/Puppeteer) is available, script a screenshot to `scripts/`.
4. Note the result in `PROGRESS.md`.

## A good habit: a sim smoke harness

Add `scripts/sim-smoke.ts` (or a `describe('smoke')` test) that runs the Simulation for ~100 stages and
prints curves (HP, gold, research, tier histogram, time-to-clear). It's the fastest way to sanity-check
balance and catch runaway/zero curves — and it proves the sim runs fully headless.

# CLAUDE.md — Taskbar Legion (Ambient Idle RPG)

> **You are building v1: the complete single-player game, in the browser, 100% offline.**
> No Tauri, no online/server, no transparency, no click-through. Those are v1.5 / v2 and are **out of scope**.

This file is your operating manual. Read it fully, then read `docs/PLAN.md` and start at the first
unchecked phase in `docs/PROGRESS.md`. The full design is in `SPEC.md`; the `docs/` folder distills it into
actionable rules.

**Authority order when sources disagree:** SPEC.md is the default authority, **EXCEPT** where a `docs/` file
explicitly states it overrides/supersedes the SPEC — those are deliberate, post-SPEC design decisions and
they win. The standing overrides are:
- **PROGRESSION OVERHAUL (current model — see `docs/PROGRESSION.md` §0, which supersedes the rest where they
  conflict).** Combat power lives in **ITEMS** (ilvl × tier × affixes × gems) + talents + level + ultimates —
  *not* tech. **Tech is NON-COMBAT only** (Economy/Chests/Utility). **No equip-gate** (ilvl is pure power;
  any hero equips any item bar the class lock). **Level is hard-capped at 120** (cheap-early/steep-tail XP
  curve). **Tier multipliers widened** (T8 = 9×) so drops feel impactful and gate the deep walls. The **walls
  are the W-10 zone bosses**, HP scaling per-world (`ZONE_WALL_GROWTH`), tuned for **world 100 ≈ ~1 year**.
  Normal chests **2%**/kill; gem is EXTRA; keys come from stage-boss chests. `WAVES_PER_STAGE = 20`. Naked
  party walls by world 2. Validated by `scripts/sim-calib.ts` / `sim-gear.ts` / `sim-multiseed.ts`.
- **`docs/PROGRESSION.md` supersedes SPEC §4.6 / §5.3 scaling** — gear power and difficulty are *exponential
  and accelerating*, not the SPEC's linear example (linear would make the game impossible by ~stage 10).
  Flat stats scale `Φ^1.0`, percent stats are bounded (§6). Tier drop-rate is world-depth-scaled + gated
  (§0/§13). The farming loop + zone-key/zone-boss gate is §14.
- **`docs/AFFIXES.md` overrides SPEC §4.2 jewelry routing** — jewelry AND armor are flex slots, rolling
  *both* offensive and defensive stats mixed (armor also rolls its base affix from a mixed pool, so it can be
  fully offensive/defensive/hybrid — pick offensive armor for DPS, defensive for tanks). Weapon stays
  offensive-only.
- **Tech tree is the main v1 GOLD sink (overrides SPEC §6's research-points currency) — and is NON-COMBAT
  ONLY now** (Economy/Chests/Utility; the combat `cmb_*` nodes were removed — combat power is items). A
  **flat catalogue of ONE endlessly-rankable node per type** (no DAG/rings/prereqs) — `cost = baseCost ·
  costGrowth^rank` grows exponentially per rank, so nodes never "complete". Grouped into categories for the
  UI only. `researchPoints` is reserved/unused in v1 (BALANCE.md / DATA_MODEL.md).
- **Gems are tiered T1–T8 (overrides SPEC §4.5's single-stat gem).** Higher tier = more affixes; gems are
  instances with their own origin; tier drop-rate scales with stage like items (DATA_MODEL + BALANCE).
- **Only 3 classes ship — Warrior · Ranger · Priest (overrides SPEC §4.7's 5-class roster).** Mage and Rogue
  were removed so ALL tuning happens against the canonical tank·dps·healer trio (one fixed party comp = easier
  to balance). New classes get added later with comparable stat curves + skill damage. `CLASS_KEYS` in
  `data/classes.ts` is the canonical list; the harness/probes field exactly this trio.

For any disagreement NOT covered by an explicit override, SPEC.md wins — and tell the user, since it
probably means a doc needs fixing.

---

## What this game is (30-second version)

An idle RPG that auto-battles in a thin horizontal **strip** at the bottom of the page. A party of up to
3 heroes advances left-to-right through infinitely-scaling stages (`1-1 → 1-9 → 1-10 zone boss → 2-1 …`).
Killing things fills a **stage progress bar** → boss spawns → defeating it advances the stage. Loot does
**not** drop from enemies — kills yield **chests** (3 types, capped storage), and opening chests rolls
**T0–T8** items. Gear, **gems**, per-hero **talents**, a global **tech tree**, and ultra-rare **pets**
drive progression. Management lives in draggable **pixel-art panels** (React) floating over the strip
(Pixi). The whole thing runs on a deterministic, fixed-timestep simulation.

---

## The 8 golden rules (violating these = wrong, full-stop)

1. **`sim/` and `data/` are a pure library.** They MUST NOT import from `game/`, `ui/`, `state/`, `app/`,
   Pixi, React, or Zustand. ESLint enforces this — if the lint rule fights you, your design is wrong, not
   the rule. The sim must run headless in Node (that's how it's tested).
2. **Determinism is sacred.** Combat, loot, chests, and effects are pure functions of state + a **seeded**
   RNG (mulberry32 in `sim/rng.ts`). Same seed + same inputs ⇒ byte-for-byte identical result. **Never**
   use `Math.random()`, `Date.now()`, or unseeded randomness inside `sim/`.
3. **Everything is data-driven.** Classes, stats, tiers, gems, effects, abilities, talents, tech nodes,
   pets, stage scaling, loot tables — all typed config under `src/data/`. **No game numbers hardcoded in
   logic.** Adding an ability/effect/item type = writing data, never editing the combat loop.
   - **Scaling is exponential & gear-checked** (`docs/PROGRESSION.md`), NOT SPEC §4.6's linear example.
     Player power = Gear × Level × Talent × Tech (multiplicative). Difficulty *accelerates* (50→51 harder
     than 1→2). You can advance on previous-stage gear, but freezing any axis stalls you in 2–4 stages.
     The four invariants in PROGRESSION §11 are tested by the smoke harness — they define "balanced."
4. **Render/logic split.** The sim owns world state; Pixi and React only *read* it and send intents. Panel
   logic is separate from panel chrome/placement (`PixelWindow`). This is what makes v1.5 a re-skin.
5. **v1 is an opaque web page.** Do NOT build `backgroundAlpha: 0`, click-through, or `setIgnoreCursorEvents`.
   Only *tag* interactive surfaces (cheap) so v1.5 can add a hit-test later. Build nothing else for v1.5/v2.
6. **Save-compatible from day one.** Every `ItemInstance` populates `origin` + `bound: false`. The save
   schema carries future fields (`cube`, `online`, premium) even though nothing uses them. Don't strip them.
7. **Tests are part of "done."** `sim/` has the mandatory unit tests from SPEC §4.6/§4.8/§4.10/§11. No test
   imports Pixi or React. A phase isn't done until `npm test`, `npm run typecheck`, and `npm run lint` are
   all green.
8. **Every phase ends with a visual check.** The game must be verifiable from a screenshot / running app.
   See `docs/TESTING.md` for how to capture one.

---

## Project map

```
SPEC.md                  ← authoritative design (1000+ lines; the source of truth)
CLAUDE.md                ← you are here: operating manual + golden rules
docs/
  PLAN.md                ← THE PHASED EXECUTION PLAN. Work through it in order.
  PROGRESS.md            ← living checklist. Update it as you complete each step.
  ARCHITECTURE.md        ← layering, data flow, folder responsibilities, the sim↔render boundary
  CODING_STANDARDS.md    ← clean-code rules, naming, file size, immutability, error handling
  DATA_MODEL.md          ← all TypeScript type contracts consolidated (copy these verbatim)
  PROGRESSION.md         ← THE SCALING BIBLE: infinite/accelerating difficulty, exponential gear power,
                           the gear-check treadmill, steep XP, + four testable invariants (canonical)
  AFFIXES.md             ← which stats each item type (armor/weapon/jewelry) can roll; base affixes
  TESTING.md             ← test strategy, the mandatory test list, how to screenshot
  ART.md                 ← the procedural pixel-art approach (no external assets) + palette
  BALANCE.md             ← every `tune` value resolved into concrete starting numbers
src/                     ← the game (structure mirrors SPEC §2; see ARCHITECTURE.md)
test/                    ← vitest specs (sim/ first; never import Pixi/React)
```

---

## How to work (the loop for every phase)

1. Open `docs/PLAN.md`, find the current phase. Open `docs/PROGRESS.md`, find the first unchecked item.
2. Read the relevant SPEC.md sections it cites. Read the relevant `docs/` files.
3. Implement the smallest meaningful slice. Prefer many small, single-responsibility files over big ones.
4. Run `npm run typecheck && npm run lint && npm test`. Fix everything before moving on.
5. Do the phase's **visual check** (run the app / screenshot) when the phase calls for it.
6. **Tick the item in `docs/PROGRESS.md`** and add a one-line note if you made a non-obvious decision.
7. Repeat. Do not skip ahead to a later phase before the current one's ✅ acceptance criteria are met.

**Decision-making:** the spec marks open values with `tune`. They are already resolved in `docs/BALANCE.md`
— use those. If something is genuinely unspecified and not in BALANCE.md, pick the simplest sensible
default, put it in the right `data/` file, and note it in PROGRESS.md. Don't block; don't ask the user
mid-build unless a decision is irreversible or contradicts the spec.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install deps (first thing, once). |
| `npm run dev` | Vite dev server — the running game. Use for visual checks. |
| `npm test` | Run the vitest suite (must be green to finish a phase). |
| `npm run typecheck` | `tsc --noEmit` strict check. |
| `npm run lint` | ESLint incl. the import-boundary rule. |
| `npm run build` | Production build (typecheck + vite build). |

## Conventions cheat-sheet (full detail in CODING_STANDARDS.md)

- TypeScript strict, `noUncheckedIndexedAccess` on. No `any` (use `unknown` + narrowing). No non-null `!`
  unless provably safe with a comment.
- Path alias `@/` → `src/`. Use it for cross-folder imports.
- `import type { … }` for type-only imports (enforced).
- Pure functions in `sim/`. Immutable updates in `state/` (Zustand slices). Side effects live at the edges.
- One concept per file. Soft cap ~200 lines; if a file sprawls, split it.
- Name by domain (`generateItem`, `aggregateStats`, `tierBias`), not by pattern (`Helper`, `Manager`).
- All UI strings in English. Pixel-art aesthetic; `image-rendering: pixelated` everywhere.

---

**Start here:** `docs/PLAN.md` → Phase 0. Then update `docs/PROGRESS.md` as you go. Build the whole v1.

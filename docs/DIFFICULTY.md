# DIFFICULTY.md — The finite, multi-difficulty model (CANONICAL)

> **⚠️ This document supersedes the INFINITE-SCALING model.** Where `PROGRESSION.md`, `BALANCE.md`, or `SPEC.md`
> describe infinite stages, per-world zone-boss walls (`ZONE_WALL_GROWTH`), world-depth-scaled rarity, or a
> "world 100 ≈ 1 year" tail, **this file wins.** The game is now a **finite 5-difficulty** structure. The
> still-valid machinery in `stageScaling.ts` (the polynomial Φ curve, `gearTrack` hit-count anchor, decoupled
> boss scales, `expectedLevel`, mitigation) is **re-parameterized**, not discarded.
>
> Decided 2026-06-03. Status: **Phase 0 (spec + spine) — pending sign-off.** See `docs/PROGRESS.md` for phases.

---

## 1. What the game is now

Five **difficulties**, each a full **10 worlds × 10 stages = 100 stages**. You play them in order — Normal →
Hell → Inferno → Eternal → Torment — and **everything carries over** (heroes, levels, gear, gems, tech). Each
difficulty replays the same 1-1 → 10-10 layout, harder, and **unlocks one new top gear/gem tier**. Torment is
the designed endgame; after it you chase **T8 perfection** and wait for content (Torment II/III…).

The game is **finite and bounded** — and that is the whole point. With a known maximum player power (top tier ×
`MAX_LEVEL` × maxed talents/tech) and 500 discrete stages, every enemy number and drop weight is **solved
backwards from a per-gate target** (the spine, §9) instead of chasing an asymptote toward infinity. This also
retires the e42-number problem the polynomial rework was fighting — 500 bounded stages stay readable.

**Clean slate.** This restructures stage/difficulty state; in-development infinite-progression saves are **not
migrated** — the migrate path resets to Normal 1-1.

## 2. Structure & navigation

- **Difficulty** `d ∈ {Normal, Hell, Inferno, Eternal, Torment}` (indices 0–4).
- **World** `w ∈ 1..10`, **stage-in-world** `p ∈ 1..10`. Displayed as `w-p` (e.g. `3-7`).
- **Global index** (engine-internal scaling anchor): `G = d·100 + (w-1)·10 + p`, so `G ∈ [1..500]`, monotonic.
  Enemy power is a continuous finite curve over `G`; the difficulty/world/stage triple is just its display
  decomposition. Drops are gated by **difficulty** (the locked tables, §4), independent of `G`.
- **Unlocks:** stages unlock sequentially (clear `w-p` → `w-(p+1)` available); difficulties unlock by clearing
  the prior difficulty's **10-10**.
- **Free select (the farm UI):** a **difficulty dropdown** (among unlocked) + **any cleared stage** within it.
  Stuck at a wall? Drop back and grind the stage below it.

**Advance / Retry rules** (the run loop, Phase 5):
- Beat a stage **for the first time** → **auto-advance** to the next stage.
- Beat a stage you've **already cleared** (you dropped back to farm) → **stay and loop** it.
- **Retry toggle** (bottom-right of the GameStrip): **ON** → a wipe keeps you in the current stage; **OFF** → a
  wipe **drops you down one stage**.

## 3. Difficulty ↔ tier ladder

Gear **and gems** share the same per-difficulty tier ceiling:

| Difficulty | New tier unlocked | Drop pool |
|---|---|---|
| Normal | T4 | T0–T4 |
| Hell | T5 | T0–T5 |
| Inferno | T6 | T0–T6 |
| Eternal | T7 | T0–T7 |
| Torment | T8 | T0–T8 |

Tier power (from `data/tiers.ts`, unchanged): statMultiplier `T0 1.0 · T1 1.2 · T2 1.45 · T3 1.8 · T4 2.3 ·
T5 3.0 · T6 4.2 · T7 6.0 · T8 9.0`, with substats `0,1,1,2,2,3,3,4,4` and sockets `0,0,1,1,2,2,3,3,4`. A
full-kit one-tier jump (mult step ~1.2–1.5× **plus** an extra substat and often a socket+gem) is a real power
spike — that spike is what breaks each difficulty's walls. **`unlockStage` on tiers is replaced by a
per-difficulty cap** (Phase 1/3): a tier can drop once its difficulty is reached, governed by the tables below.

## 4. Drop tables (LOCKED)

Relative tier weights per difficulty (normalize to 100). **One table per difficulty, no depth-gate** — every
stage of a difficulty rolls from the same table; only enemy power changes with depth.

| Difficulty | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|---|
| **Normal**  | 40 | 32 | 18 | 8  | **2** | –  | –  | –  | –  |
| **Hell**    | 12 | 28 | 30 | 20 | 8  | **2** | –  | –  | –  |
| **Inferno** | 8  | 16 | 26 | 24 | 16 | 8  | **2** | –  | –  |
| **Eternal** | –  | 8  | 16 | 26 | 24 | 16 | 8  | **2** | –  |
| **Torment** | –  | –  | 8  | 16 | 26 | 24 | 16 | 8  | **2** |

Inferno → Torment is a single sliding kernel `[8, 16, 26, 24, 16, 8, 2]` shifted up one tier per difficulty;
Normal/Hell are the front-loaded ramp-in. The **new top tier is always ~2%** — the chase. All rows sum to 100.

**The real treadmill is affix quality, not tier.** A cap-tier drop still has to be the *right slot* with
*better rolls* than what you wear; we model the **upgrade rate**, not the raw drop rate, against the timeline.

**Chests** (`data/chests.ts`): all chest types roll items from the **same** difficulty table — they differ only
in **gem chance**: normal kill chest ×1, stage-boss chest ×2, world-boss chest ×4. Chest cadence stays
**2%/kill** across all difficulties (income is never loosened — memory `economy-pacing-directive`). Gems drop on
the same per-difficulty cap and table shape, as an **extra** roll on top of the item.

## 5. Bosses — two roles

- **Stage bosses** (end of every stage, `w-1 … w-9`) — **soft walls.** They bite an under-geared party but a
  current-difficulty kit passes them; survival-gated, no hard enrage cliff. Pacing texture, not gates.
- **World bosses** (`w-10`, ten per difficulty) — **hard walls by design.** Each is tuned **above** the gear you
  arrive at that world with, forcing you to farm that world's stages for upgrades. They escalate `1-10 < 2-10 <
  … < 10-10`. A world boss is **a wall even for a decently-geared party** — the breakthrough is a higher-tier
  drop in your key slots, not a few more levels.
- **`10-10` = the difficulty gate.** The biggest wall in the difficulty; clearing it unlocks the next
  difficulty. Calibrated to require the difficulty's **new top tier** in core slots (§9).

**World-boss ability escalation:** world bosses are **pure stat walls on Normal/Hell**, then gain **special
abilities at the higher difficulties** — all single-target / self (no party-wide AoE), so the kit stays balanced
around the tank taking the hits. Each special **channels for 1.5s** (a cast bar fills under the boss) before it
resolves, telegraphing the cast.

| Difficulty | Special abilities | Cadence (from engage) |
|---|---|---|
| Normal · Hell | — (stat wall) | — |
| **Inferno · Eternal** | **Frenzy** — self-buff: +50% attack speed for 6s | every **15s**, first at **7.5s** |
| **Torment** | Frenzy **+ Mortal Wound** — a strong hit that cuts the tank's **healing received −25% for 8s** | Mortal Wound every 15s from **0s** → interleaved with Frenzy, **one cast ~every 7.5s** |

Each ability has its own read: Frenzy = a **red aura at the boss's feet**; Mortal Wound = **crossed-out heal
crosses** over the wounded tank. Data-driven (`data/abilities.ts` `WORLD_BOSS_ABILITIES` + per-ability
`openerMs` / `castTimeMs`; the heal cut is the `healReduction` effect kind). This is *why* the replay is a new
fight, not just bigger numbers.

## 6. The scaling model (finite, continuous, gear-anchored)

Global enemy power is a **continuous, monotonic finite curve over `G ∈ [1..500]`** — not a sawtooth. The stage
*counter* resets each difficulty, but enemy *power* keeps rising (Hell 1-1 is a step above Normal 10-10, like
D2 Nightmare act 1 > Normal act 5). Gear carries over, so player power is continuous too; the curve is anchored
to **expected gear power**, which is exactly why it's bounded and solvable.

Three independent scales (preserving the decoupled design — memory `enemy-scaling-decoupled`):

- **Trash / normal enemies** — anchored to **~2–3 player hits at every depth** via `gearTrack(G)`. Absolute HP
  rises with expected gear power; trash is never the wall, it's texture (elites are the on-level threat).
- **World bosses (`w-10`)** — the walls. Scale **steeper than party power** so their kill-time *holds or grows*
  with depth; each is sized just above the gear you arrive with. Per-difficulty wall multiplier can step up.
- **Stage bosses (`w-1..w-9`)** — soft; ~constant kill-time with a current kit, survival-gated.

**Difficulty multiplier `D(d)`** sets each difficulty's floor above the previous ceiling: `D(d+1)·B(1) >
D(d)·B(100)`, with the *step* sized so the difficulty's **new tier (+ accumulated gems/levels)** is what bridges
it. The `10-10` gate + the `D(d+1)` step together are the difficulty transition — tuned tight (§9), and
**steepest for Torment** (the designed endgame jump: bigger wall, bigger loot).

Implementation note: keep a single internal `G`-indexed curve (re-parameterize `phi`/`gearTrack`/boss fns for a
**finite 500-stage span** with 5 tier-unlock difficulties) rather than five separate curves. Minimizes churn.

## 7. Levels & XP

`MAX_LEVEL = 120`, **reached only very deep into Torment farming** (months in) — completing Torment's `10-10`
lands around L114, and L120 is the post-completion grind. Gear has **no level requirement**, so a skilled/lucky
player can punch above their level and clear a gate underleveled. The XP curve (Phase 3) is reshaped to span
500 stages with these completion bands:

| Difficulty cleared (10-10) | ~Level |
|---|---|
| Normal | ~42 |
| Hell | ~66 |
| Inferno | ~86 |
| Eternal | ~103 |
| Torment | ~114 (L120 = deep post-Torment farm) |

Level is a slow multiplicative trickle (base stats + talent points), not a gate. XP past L120 is wasted (or
routed to a token sink — decide in Phase 3).

## 8. Pacing targets

Tuned so the **average** player takes **~6 months to reach Torment** (power users sooner; many never finish
Torment — the intended long tail). Always **decelerating**: each difficulty is longer than the last, Torment
the longest. Rough back-loaded split (calibrated against a realistic active harness, not 24/7 theory — memory
`pacing-targets`):

| Difficulty | Rough optimized time | Role |
|---|---|---|
| Normal | days–1 wk | build your first real kit, learn systems |
| Hell | ~2 wks | first true tier-chase (T5) |
| Inferno | ~4 wks | |
| Eternal | ~6–8 wks | |
| Torment | months (open-ended) | endgame; T8 + affix perfection |

Anchor enemy tuning to **hit-counts** (grunts 2–3 hits, elites 10–12, stage boss 10–20s, world boss = an
un-bruteforceable wall), never calendar time. The bottleneck is the **gear treadmill** (the rare cap-tier in the
right slot with good rolls), not boss HP padding.

## 9. The balance spine — expected gear-state per gate

Everything downstream (enemy HP/damage, drop weights, XP) solves backwards from this. For each difficulty, the
gear you **arrive** with and the kit the **10-10 gate** demands:

| Difficulty | Arrive with | `10-10` gate requires | Gems | Lvl @gate |
|---|---|---|---|---|
| **Normal**  | starter / T0–T1 | full **T3** kit + **T4** in weapon & **every core slot, all 3 heroes** | T1–T2, sockets ~½ filled | ~42 |
| **Hell**    | T3 + some T4    | full **T4** kit + **T5** across all core role-slots (all 3 heroes) | T2–T3, most sockets filled | ~66 |
| **Inferno** | T4 + some T5    | full **T5** kit + **T6** across all core role-slots | T3–T4 | ~86 |
| **Eternal** | T5 + some T6    | full **T6** kit + **T7** across all core role-slots | T4–T5 | ~103 |
| **Torment** | T6 + some T7    | full **T7** kit + **T8** across all core role-slots | T5–T6 → chase T7–T8 | ~114 |

The pattern is a clean ladder: arrive on last difficulty's top 1–2 tiers; the gate is broken by **this
difficulty's new top tier landing across all your key slots**. Because the new top tier is ~2% drops, "break the
gate" = "farm `10-9` until the rare upgrade drops **for each core slot, on each hero**" — the core idle loop.

**Keys are gone, so the `X-10` boss IS the entire gate — it must be a REAL wall.** With no key time-gate to lean
on, the world boss alone carries all the farming pressure: it is tuned so a party at the *expected kit minus its
cap-tier pieces* is **decisively walled** (not a close call), and only the broad cap-tier breakthrough above —
weapon + every role-critical slot, across all three heroes — clears it. This is deliberately a **higher** gear
bar than a single-slot upgrade: it converts the removed ~30-min/world key farm into farming the rare cap-tier
for the full role-slot set (≈3× the slots), which is what holds the §8 timeline. Wall multipliers (Phase 2) are
sized to this; if a gate proves bruteforceable with partial cap-tier gear, raise the multiplier, not the spine.

**The gear state is PARTY-WIDE (all three heroes), not one hero.** The gate is two simultaneous checks on the
canonical trio: the **DPS/enrage check** needs the damage dealers (ranger + supporting offense) at the cap tier
in **weapon + offensive slots**; the **survival check** needs the knight at the cap tier in **defensive slots**
and the priest geared enough to sustain. So the chase is the cap-tier upgrade in each hero's **role-critical**
slots — ~3× the slot set of a single hero, which is deliberately load-bearing for the §8 timeline.

**Within-difficulty world-boss ramp** (generic; `base` = the tier you arrive with, `cap` = the difficulty's new
top tier):

| World boss | Expected kit to clear |
|---|---|
| `1-10` | arrival kit, lightly upgraded with this difficulty's commons |
| `2-10`–`4-10` | full `base`-tier kit at current ilvl |
| `5-10` | `base+1` becoming common across slots |
| `6-10`–`8-10` | `base+1` kit, occasional `cap` tier |
| `9-10` | `base+1` kit + `cap` tier in several key slots |
| `10-10` (gate) | `cap` tier in weapon + **every** core role-slot, **all 3 heroes** — the full breakthrough |

Normal is the long ramp-in (starter → T4 across the whole difficulty); Hell onward are tighter **+1-tier**
climbs. The gate is a **hard wall**: a party with the expected kit *minus its cap-tier key pieces* should
**not** be able to clear it — the cap-tier breakthrough is the key.

## 10. What this supersedes & the phase map

Supersedes: `PROGRESSION.md §0` infinite model, §1 "infinite scaling" / accelerating-ratio goal, §13
world-depth-scaled rarity + `unlockStage` schedule, §14 zone-key / zone-boss gate, and the W100≈1yr tail.
**Retained** (re-parameterized): the polynomial Φ curve, `gearTrack` hit-count anchor, decoupled boss scales,
mitigation, `expectedLevel`, the FLAT-vs-PERCENT stat rule (§6 of PROGRESSION), and the income shape.
**Zone keys are removed** — `10-10` is entered freely once `10-9` is cleared (the wall is the boss, not a key).

Execution phases (see `docs/PROGRESS.md`):
0. **This spec + spine** (pending sign-off).
1. Data model + difficulty state (`data/difficulties.ts`, save/world `difficulty` + unlock tracking, clean migrate).
2. Finite scaling rework (re-parameterize `stageScaling.ts`; tune walls vs the §9 spine).
3. Loot/gems/XP retune (per-difficulty tables, gem cap, chest gem mults, 500-stage XP curve).
4. World-boss abilities (+1 per difficulty).
5. Run loop (advance/retry, stage/difficulty selection in `sim/world`).
6. UI (difficulty dropdown + stage selector, Retry toggle).
7. Harness + validation (per-gate clear-time, time-to-Torment, L120 timing; finite invariants replace §11).

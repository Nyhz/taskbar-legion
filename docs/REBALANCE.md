# REBALANCE.md — Damage-curve re-anchor plan

> **Purpose:** a self-contained, executable plan for a fresh session to re-anchor the combat power curve so a
> **fresh hero (level 1, no gear, no talents, no tech) is matched to stage 1‑1** — instead of one-shotting
> everything for the first ~12 stages. Read this top-to-bottom, then execute §6–§9. No prior context needed.

---

## 1. The bug (with exact current numbers)

A brand-new hero out-damages the early game by ~5×:

| Stage | Trash HP | Boss HP | Enemy dmg/hit | | Fresh L1 knight hit | Fresh L1 ranger hit |
|------:|---------:|--------:|--------------:|---|---------------------:|--------------------:|
| 1 | **~14** | ~180 | ~6.6 | | **~75** | ~78 (crit ~133) |
| 2 | ~16 | ~200 | ~7.2 | | ~77 | ~81 |
| 5 | ~23 | ~290 | ~9.7 | | ~84 | ~90 |

So trash dies in **one hit** through ~stage 12 (where enemy HP finally climbs past the hero's hit), and the
stage‑1 boss dies in 2–3. A gearless, talent-less hero should *not* be this strong — it's matched to ~stage 15.

## 2. Root cause

Player power = **Gear × Level × Talent × Tech** (multiplicative, PROGRESSION.md). The intent: a *fresh* hero
sits at the bottom (matched to stage 1) and climbs via those four axes. But the **hero base stats are set ~15
stages too high**, so a fresh hero is "pre-leveled" — the early game is solved before you invest in anything.

The enemy HP curve is `enemyHp(S) = HP0 · Φ(S)` with `HP0 = 40` (canonical §12). Trash = `enemyHp·0.32`,
boss = `enemyHp·4`. Gear flat-stats scale `Φ^EG_FLAT` (EG_FLAT = 1.0) so geared TTK is ~constant in Φ — that
part is healthy and should be preserved.

## 3. Why naive fixes FAIL (learned the hard way — do not repeat)

These were tried and **broke the tuned curve**; the smoke run fell from 240 stages to ~50 and hard-walled:

- **Cutting hero base AD alone.** Gear rolls were tuned to *add to* the high base. Removing ~70 base damage
  leaves the hero ~70 AD short at *every* stage; at low/mid stages (where 70 is a big fraction of total) it
  can't out-DPS enemy HP → hard wall around stage 30–60. (Late stages are fine — gear dominates there.)
- **Cutting base + steepening per-level growth.** Doesn't snowball: weak early → slow kills → low level →
  low AD-from-growth → stalls. Chicken-and-egg.
- **Raising `TRASH_HP_FRACTION` to make trash tankier.** It's a *global* multiplier (all stages), so it slows
  the whole game and shifts the tuned per-stage clear time, not just the early feel.
- **Raising the enemy HP floor for early stages.** Flattens the difficulty ramp (many stages at constant HP).

**Takeaway:** base damage and gear damage are coupled. You can't move one without compensating the other.

## 4. The strategy — re-anchor: *lower the baseline, move that power into gear*

Keep the canonical §12 enemy curve. Shift the hero's power so the part that's currently **free (base stats)**
must instead be **earned (gear)**:

```
total_hero_AD(S) = base_AD + level_growth·L + gear_AD(S) + talents + tech
                   └── constant ──┘             └ ~k·Φ(S) ┘
```

- **Cut `base_AD`** so a fresh L1 hero ≈ stage‑1 enemy (a few hits to kill trash) → fixes the faceroll.
- **Boost `gear_AD`** (the `Φ`-scaled term) by a matching factor so a *geared* hero reaches the same total
  power it has today → preserves the mid/late progression and the six invariants.

Because base is **constant** and gear is **`∝Φ(S)`**, this naturally does the right thing:
- **Stage 1 (Φ≈1, ~no gear):** total ≈ base_new (low) → weak fresh hero. ✅
- **Stage 30+ (gear dominates):** total ≈ gear_new ≈ original total → curve preserved. ✅
- **Stages 2–15 (the transition):** the boosted gear fills the gap *as you acquire it* — so progression comes
  from looting, exactly as designed. This is the piece the naive attempts missed.

The same logic applies to **ability damage** (scales off `attackDamage`) and **survival** (see §10).

## 5. The target feel (SET THIS FIRST — it drives every number)

Pick the intended stage‑1‑1 experience for a fresh, gearless, talent-less hero. Default proposal: **(b)**.

| Option | Trash TTK (auto-hits) | Boss feel | Fresh L1 hit needed (trash 14 HP) |
|---|---|---|---|
| (a) genuine fight | ~3–4 hits | real threat, can lose | ~4–5 |
| **(b) easy, not trivial (default)** | **~2 hits** | slow but safe | **~7–8** |
| (c) brisk | ~1–2 hits | trivial | ~10–12 |

> If you also want stage 1 to be *dangerous* (not just slow), that's the **survival** axis in §10 (lower base
> HP / raise early enemy damage) — a separate, optional pass. The user's complaint was specifically about
> **one-shotting (damage)**, so this plan's core is the damage curve; do §10 only if asked.

For the rest of this doc, numbers assume **target (b): fresh L1 hit ≈ 7–8** (trash ~2 hits). Adjust if a
different target is chosen — every starting number in §11 scales with the chosen fresh-hit value.

## 6. The levers (files + current values)

| Lever | File | Current | Role |
|---|---|---|---|
| Class **base `attackDamage`** + per-level growth | `src/data/classes.ts` | W 75/2.4, Rgr 78/2.8, Mage 95/3.6, Rog 70/2.6, Pri 48/1.6 | the baseline to **cut** |
| **Gear flat-stat power** | `src/sim/loot.ts` → `rollStatValue()` (`r * tierMult * phi(S)**EG_FLAT`) | no multiplier | the term to **boost** |
| Enemy `HP0`, `DMG0`, `TRASH_HP_FRACTION` | `src/data/stageScaling.ts` | 40, 6, 0.32 | **leave** (§12 canonical) unless target (a) needs it |
| Ability `power.coeff` (scale off AD) | `src/data/abilities.ts` | per ability | auto-tracks AD; only retune if abilities feel off |

**Recommended mechanism for the gear boost:** add a single tunable `GEAR_POWER` (default e.g. `1.0`, raise to
compensate the base cut) and multiply it into `rollStatValue`'s flat branch:

```ts
// src/data/stageScaling.ts
export const GEAR_POWER = 1.0; // global multiplier on FLAT gear-stat rolls (re-anchor knob)

// src/sim/loot.ts  → rollStatValue(), flat branch:
return round2(r * tierMult * GEAR_POWER * phi(S) ** EG_FLAT);
```

One number to tune the whole gear curve. (Raising the per-stat `rollPerIlvl` bands in `data/stats.ts` is an
alternative, but `GEAR_POWER` is one clean knob and keeps the bands as documented ranges.)

## 7. Execution recipe

1. **Decide the target** (§5) → fixes the fresh-hit value `F` (default `F ≈ 7.5`).
2. **Cut class base `attackDamage`** so each class's *level-1* auto-hit ≈ `F` (scaled by class role — DPS a bit
   higher than the tank). Keep per-level growth **roughly original** (levels still matter); do **not** also
   slash growth (that's pitfall #2). See §11 for a starting set.
3. **Boost `GEAR_POWER`** so a *geared* hero recovers the original total power by ~stage 10–15. Start from the
   estimate in §11, then tune via the smoke loop (§8). This is the make-or-break step — under-boosting walls
   the mid-game.
4. **Leave** `HP0` / `DMG0` / `TRASH_HP_FRACTION` (target b/c). For target (a) only, optionally nudge
   `TRASH_HP_FRACTION` up a touch — but prefer fixing damage on the hero side first.
5. **Sanity-check abilities** (§9): ability damage scales off AD automatically, but eyeball a few (Fireball,
   Cleave) at L1 and at a geared mid-stage to confirm they're not trivial/oppressive.
6. **Run the tuning loop** (§8) until the acceptance criteria (§9) pass.

## 8. Tuning loop (the smoke harness is your oracle)

```
npx vite-node scripts/sim-smoke.ts      # greedy agent runs ~hundreds of stages, prints curves
npm test                                # the 6 PROGRESSION invariants + frontline/combat/etc. (must stay green)
npm run typecheck && npm run lint
```

Read these smoke lines each pass and steer:

- `Reached stage N` — target **≥ 200** (healthy long game; was 240). If it drops to ~50–120 → **gear under-boosted**
  → raise `GEAR_POWER`.
- `per-WAVE clear p50/p90/p95` — should stay roughly **p50 ~6–8s, p95 < 14s** (invariant #2).
- `early p90` — first-stage snappiness (invariant #1, threshold `< 18`).
- `Frozen-gear B` — must stay **bounded (≤ 24)** at S0=80/200 (invariant #3: the gear check). If B blows up,
  gear is over-boosted (you coast without gearing); if the run can't even reach S0, gear is under-boosted.
- `avg/day T6/T7/T8` and `keys/30min` — drop rates; should be ~unchanged (you're not touching loot tiers).

**Convergence heuristic:** fix the base cut from the target, then **binary-search `GEAR_POWER`** (one knob)
until `Reached stage` and `Frozen-gear B` are both healthy. Expect 3–6 iterations.

## 9. Acceptance criteria (definition of done)

1. **No early faceroll:** a fresh **L1, gearless, talent-less** knight takes **≥ 2 auto-hits** to kill a
   stage‑1 trash mob (per target; ≥3 for target a). Add a tiny test/probe (below).
2. **All 6 PROGRESSION invariants green** (`npm test`) — do NOT relax their thresholds to force a pass; if they
   fail, the tuning isn't done.
3. **Smoke reaches ≥ ~200 stages** with bounded per-wave clears and **bounded frozen-gear B**.
4. **Drop rates unchanged** (T6≈2/day, T7≈1/day, T8≈0.5/day, ~1 key/30min).
5. `typecheck` + `lint` clean.

Suggested new probe (drop into a test or the smoke script) — asserts the fresh-hero matchup directly:

```ts
import { aggregate } from '@/sim/stats';
import { heroBaseStats } from '@/sim/loadout';
import { enemyHp, TRASH_HP_FRACTION } from '@/data/stageScaling';

const hit = aggregate(heroBaseStats('knight', 1), {} as any).attackDamage; // L1, no mods
const trashHp = enemyHp(1) * TRASH_HP_FRACTION;
// target (b): ~2 hits → hit should be ≤ trashHp (and > trashHp/4 so it's not a slog)
expect(hit).toBeLessThanOrEqual(trashHp);
expect(hit).toBeGreaterThan(trashHp / 4);
```

## 10. Out of scope (note, don't do unless asked)

- **Survival / HP curve.** A fresh hero (HP ~170, enemy dmg ~6.6) survives ~25 hits at stage 1 — trivial.
  If stage 1 should be *dangerous*, that's a parallel re-anchor of base `health`/`armor` (cut) and/or early
  `DMG0` (raise), tuned the same way. The current plan only fixes **damage / one-shotting**.
- **Enemy abilities.** Stun was removed; current enemies carry no abilities (a near-future rework). Leave the
  `EnemyKind.abilities` infra as-is.
- **Tier drop rates / §13 rarity.** Untouched — keep the drop-rate invariants passing as a guardrail.

## 11. Proposed first-pass numbers (target b; starting point, then tune `GEAR_POWER` via §8)

Cut base `attackDamage` so L1 hits ≈ 7–8 (DPS classes slightly higher); **keep growth near original**:

| Class | base AD (old → new) | growth (old → new) | L1 hit (new) |
|---|---|---|---|
| Knight | 75 → **8** | 2.4 → **2.2** | ~8 |
| Ranger | 78 → **9** | 2.8 → **2.6** | ~9 |
| Mage | 95 → **11** | 3.6 → **3.4** | ~11 |
| Rogue | 70 → **8** | 2.6 → **2.4** | ~8 |
| Priest | 48 → **5** | 1.6 → **1.5** | ~5 |

Then **`GEAR_POWER` start ≈ 1.4** (compensates the ~70 AD removed from base, which was ~30–35% of a geared
mid-stage total). **Binary-search it** in [1.2, 2.0] against `Reached stage` (≥200) and `Frozen-gear B` (≤24).

> These are a *starting point*, not final. The smoke harness decides. Do not ship until §9 all pass with the
> invariants green (un-relaxed).

## 12. Quick reference — key constants & locations

- Enemy curve: `src/data/stageScaling.ts` — `HP0=40`, `DMG0=6`, `DMG_EXP=0.82`, `TRASH_HP_FRACTION=0.32`,
  `BOSS_HP_MULT=4`, `EG_FLAT=1.0`, `phi(S)`, `enemyHp(S)`, `enemyDamage(S)`.
- Hero base/growth: `src/data/classes.ts` (`baseStats` / `statGrowthPerLevel`).
- Gear stat scaling: `src/sim/loot.ts` → `rollStatValue()`; bands in `src/data/stats.ts` (`rollPerIlvl`);
  tier multipliers in `src/data/tiers.ts` (`statMultiplier`).
- Ability damage coeffs: `src/data/abilities.ts` (`power.coeff` / `coeffPerRank`).
- Invariants + harness: `test/sim/progression.test.ts`, `test/sim/harness.ts`, `scripts/sim-smoke.ts`.

---

## 13. RESULT — damage re-anchor + unified ability/enemy pattern (implemented)

Plus the user-requested unification of all abilities/talents/enemies onto a single "% of a normal attack"
pattern. (Final tuned survival numbers are in §14 — they supersede any earlier figures here.)

**Knobs** — `GEAR_POWER = 2.1` on the flat gear branch (`stageScaling.ts` + `loot.ts`); base AD cut
W75→8/Rgr78→9/Mage95→11/Rog70→8/Pri48→5 with trimmed growth (`classes.ts`).

**Unified pattern (heroes + enemies)** — `sim/abilities.ts`:
- `normalAttackDamage(caster)` = hero `attackDamage×(1+DI/100)` / enemy `enemyDamage`.
- Damage & DoT = `coeff × normalAttack` (DoT coeff = TOTAL over duration, stored per-second).
- Heal/HoT/Shield = `coeff × target.maxHP` (HoT = total over duration).
- Enemy ability damage routed through armor/MR mitigation (stage `S` threaded into `castReadyAbilities`).

**Talents → percent** — `talents.ts` `FLAT_TO_PERCENT` (AD ×1.5, health ×0.1, armor/MR ×1.0).
**Enemy abilities** — `enemies.ts`: brute `enemy_smash`, archer `enemy_aimed`, caster `enemy_bolt` (trash
only; bosses stay enrage-gated). **Open:** boss signature abilities; the two mixed-effect abilities
(`ranger_explosiveshot`, `priest_sanctuary`) share one coeff across instant+over-time parts (noted).

## 14. SURVIVAL PASS — applied, tuned around the tank · dps · healer party

**Design call (user):** *balance around an optimal party of tank, dps, healer; good gear of their level
makes it easy-not-trivial, mediocre gear is extremely challenging or forces a farm-retreat. Not all
compositions need to be viable.* The smoke/probe agent now builds **knight (frontline) → ranger (dps) →
priest (healer)** as its core 3 (`PARTY_PRIORITY` in `test/sim/harness.ts`; probe `PARTY` matches) — it
saves for the healer as its 3rd hero rather than a 2nd dps. The healer sustains the squishier frontline; a
healerless party is intentionally NOT balanced for.

**Tool:** `scripts/sim-survival.ts` — per stage 1→200 × {UNDER = gear@S-10, ON = gear@S, OVER = gear@S+15}
reports per-wave clear time, min party-HP%, CLEAR/WIPE.

**Applied numbers:** base HP/armor cut ~25% (W170/18→125/14, Rgr110/9→80/7, Mage90/6→65/5, Rog100/8→72/6,
Pri135/12→100/9; MR trimmed) + `DMG0` 6→10 (`stageScaling.ts`). Enemy HP / `TRASH_HP_FRACTION` / `DMG_EXP`
untouched → clear-times unchanged.

**Measured (probe, healer comp):**
- **ON (good gear) = easy-not-trivial:** clears everywhere; min-HP ~50–80% early/mid, ~100% late.
- **UNDER (mediocre gear) = brutal / farm-retreat:** WIPEs at ~stages 10/20, scrapes 12–30% at 5/30/50.
- **OVER (great gear) = comfortable:** 88–100%.
- **Late (S80+):** ~100% on-level — a DPS/enrage race, not a survival axis (structural: enemy dmg `Φ^0.82`
  vs HP `Φ^1.0`, not safely tunable at `Φ≈4e14`).

Smoke (realistic agent): reached **188**, per-wave p50/p90/p95 **8.0/9.9/10.4s**, early p90 **16.3s** (<18,
un-relaxed), frozen-gear B **19/10** (≤24), drops unchanged. **72/72 tests + typecheck + lint green.**

**Tankier-enemy verdict (investigated, NOT used):** `TRASH_HP_FRACTION` 0.32→0.6 did NOT block progress
(on-level still reached the cap) but only slowed the game (per-wave p95 17.6s / early p90 24.9s — breaks the
snappy-wave invariant) and added ~no late danger. Enemy HP is a pacing knob, not a survival knob.

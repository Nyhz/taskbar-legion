# TALENTS.md — Per-class talent trees + ultimates (10-row framework)

> **This supersedes SPEC §4.9's line-based talent design.** The talent tree is a fixed **10-row**
> framework shared by every class; each class fills the rows with role-appropriate stats + abilities.
> **REWORK (current):** 5 abilities per class (all in rows 1–4), every passive node is a **percent**
> bonus, and each class has one **ultimate** that lives OFF the tree (see below).

## Framework

10 rows. A row unlocks purely on **total talent points spent**, regardless of which nodes — `row N` (1-based)
unlocks at `(N-1) × 10` points spent. Composition is identical for every class:

| Row | Unlocks at | Composition | stat nodes | ability nodes |
|----|-----------|-------------|----|----|
| 1 | 0 pts | **2 stats + 2 abilities** | 2 | 2 |
| 2 | 10 pts | 2 stats + 1 ability | 2 | 1 |
| 3 | 20 pts | 2 stats + 1 ability | 2 | 1 |
| 4 | 30 pts | 2 stats + 1 ability | 2 | 1 |
| 5 | 40 pts | 3 stats | 3 | – |
| 6 | 50 pts | 3 stats | 3 | – |
| 7 | 60 pts | 3 stats | 3 | – |
| 8 | 70 pts | 3 stats | 3 | – |
| 9 | 80 pts | 3 stats | 3 | – |
| 10 | 90 pts | 3 stats | 3 | – |

Per class: **26 stat nodes + 5 abilities = 31 nodes**, every node **max 5 ranks** → 155 points to fully max.
The 5 abilities all live in **rows 1–4** (so the kit is fully unlockable early); rows 5–10 are pure
passive %-stat investment. The player fields **2 of the 5** abilities at a time (`MAX_ACTIVE_ABILITIES`).

## Progression principles (keep talents relevant at high stages)

- **Every passive node is a PERCENT bonus.** Flat-origin stats (health/armor/magicResist/attackDamage)
  convert via `FLAT_TO_PERCENT` and add to a "% of base" pool that rides the `Φ^1.0` scaling; already-percent
  stats (crit, attack-speed, dodge, block, lifesteal, CDR, heal-power, damage-increase) add percentage points.
  Additive stacking, no double-dipping (PROGRESSION §6). The flat oddballs (`hpRegen`/`hpPerHit`) are no
  longer talent nodes.
- **Abilities scale off the caster's stats**, never flat:
  - damage / DoT magnitude = `coeff × attackDamage × (1 + damageIncrease%)`, may crit.
  - heal / HoT / shield magnitude = `coeff × target.maxHP × (1 + healPower%)`.
  - cooldowns are category-driven (`BASELINE_COOLDOWN_MS`) and reduced by the caster's `cooldownReduction%`.
  Rank adds to `coeff` (power abilities) or to the buff/debuff base value (stat abilities).

## Ultimates (off-tree, auto-unlocked at level 60)

An ultimate is **not** a talent node: it auto-unlocks at hero **level 60**, is always active, costs no points,
and occupies **neither** of the 2 active-ability loadout slots. Each is **auto-fired by the sim** on its
trigger (never manually cast, no normal cooldown). Defined in `data/ultimates.ts`; wired in `sim/combat.ts`
(triggers) + `sim/loadout.ts` (resolution at L60) + `sim/Simulation.ts` (per-stage charge refill).

| Class | Ultimate | Trigger | Effect |
|---|---|---|---|
| ⚔️ Warrior | **Last Stand** | a would-be-lethal blow (`onLethalDamage`) | Cancel the death: heal to 40% maxHP + **total invulnerability 6s**. **1 charge per stage** (refills on stage advance). |
| ✨ Priest | **Battle Enrage** | engaging a stage/world boss (`onBossEngage`) | Whole party **+25% cooldown reduction & +25% attack speed for 10s**. |
| 🏹 Ranger | **Mark of the Hunter** | engaging a stage/world boss (`onBossEngage`) | Mark the boss — it takes **+25% damage from all sources** for the fight. |

New engine effect kinds backing these: `invulnerable` (Last Stand), `vulnerable` (Mark). Battle Enrage reuses
generic statMod buffs (`buff_enrage_cdr` / `buff_enrage_as`).

## Engine mechanics (effects)

| Addition | Purpose |
|---|---|
| `damage` effect (instant) | nukes / AoE bursts — drains shields then HP, may crit |
| `heal` effect (instant) | direct heals (scales healPower) |
| `shield` effect (absorb pool + timed) | shields / aoe shields — absorbs incoming damage first |
| `dot` / `hot` effects | damage / heal over time (coeff = total over the duration) |
| `invulnerable` effect | Warrior ult: all incoming damage → 0 while active |
| `vulnerable` effect | Ranger ult: holder takes `value%` MORE damage from all sources |
| `cooldownReduction` / `healPower` stats (%) | ability uptime / heal scaling (bounded; CDR clamped ≤75%) |

---

## ⚔️ Warrior — Tank (mitigate · protect · party buffs)

| Row | Stat nodes (per-rank %) | Ability node(s) |
|----|-----------|------|
| 1 | Health +2%, Armor +2.5% | **Iron Guard**, **Cleave** |
| 2 | Health +2%, Block +2% | **Shield Wall** |
| 3 | Armor +2.5%, Magic Resist +2.5% | **Battle Cry** |
| 4 | Health +2%, Dodge +1.5% | **Rallying Banner** |
| 5 | Health +2%, Armor +2.5%, Magic Resist +2.5% | – |
| 6 | Block +2%, Health +2%, Attack Damage +3% | – |
| 7 | Armor +2.5%, Magic Resist +2.5%, Dodge +1.5% | – |
| 8 | Health +2%, Block +2%, Lifesteal +0.6% | – |
| 9 | Armor +2.5%, Magic Resist +2.5%, Health +2% | – |
| 10 | Health +2%, Armor +2.5%, Attack Damage +3% | – |

| Ability | Target | CD | Effect (r1→r5) |
|---|---|---|---|
| **Iron Guard** | Self | 12s | Damage-reduction +20→30% & block +15→25%, 6s |
| **Cleave** | All enemies | 20s | 0.8→1.4× AD, can crit |
| **Shield Wall** | All allies | 20s | Party absorb shield 0.15→0.27× maxHP, 8s |
| **Battle Cry** | All allies | 20s | Party +AD 15→27% & +crit 8→20%, 10s |
| **Rallying Banner** | All allies | 20s | Party +armor 20→36% & +MR 20→36%, 12s |

*ULT — Last Stand (L60):* see Ultimates table.

## ✨ Priest — Healer (heal coverage + an offensive party buff)

| Row | Stat nodes (per-rank %) | Ability node(s) |
|----|-----------|------|
| 1 | Heal Power +3%, Health +2% | **Mend**, **Holy Smite** |
| 2 | Cooldown Reduction +1.5%, Magic Resist +2.5% | **Heal** |
| 3 | Heal Power +3%, Health +2% | **Holy Nova** |
| 4 | Cooldown Reduction +1.5%, Magic Resist +2.5% | **Sanctuary** |
| 5 | Heal Power +3%, Health +2%, Magic Resist +2.5% | – |
| 6 | Cooldown Reduction +1.5%, Heal Power +3%, Damage Increase +2% | – |
| 7 | Heal Power +4%, Health +2%, Magic Resist +2.5% | – |
| 8 | Cooldown Reduction +1.5%, Heal Power +4%, Health +2% | – |
| 9 | Heal Power +4%, Health +2%, Damage Increase +2% | – |
| 10 | Heal Power +4%, Cooldown Reduction +1.5%, Magic Resist +2.5% | – |

| Ability | Target | CD | Effect (r1→r5) |
|---|---|---|---|
| **Mend** | Lowest-HP ally | 12s | HoT 0.24→0.43× maxHP over 4s |
| **Holy Smite** | Front enemy | 10s | 1.2→2.2× AD, can crit |
| **Heal** | Lowest-HP ally | 12s | Direct 0.25→0.45× maxHP |
| **Holy Nova** | All enemies | 20s | 0.8→1.52× AD, can crit |
| **Sanctuary** | All allies | 20s | Party shield 0.25→0.45× maxHP + party HoT, 10s |

*ULT — Battle Enrage (L60):* see Ultimates table.

## 🏹 Ranger — DPS (burst · AoE · DoT)

| Row | Stat nodes (per-rank %) | Ability node(s) |
|----|-----------|------|
| 1 | Attack Damage +3%, Attack Speed +1.5% | **Rapid Fire**, **Aimed Shot** |
| 2 | Crit Chance +2%, Health +2% | **Multishot** |
| 3 | Attack Damage +3%, Crit Damage +4% | **Poison Arrow** |
| 4 | Attack Speed +1.5%, Dodge +1.5% | **Explosive Shot** |
| 5 | Attack Damage +3%, Crit Chance +2%, Health +2% | – |
| 6 | Attack Speed +1.5%, Crit Chance +2%, Attack Damage +3% | – |
| 7 | Attack Damage +3%, Crit Damage +4%, Lifesteal +0.6% | – |
| 8 | Crit Chance +2%, Attack Speed +1.5%, Dodge +1.5% | – |
| 9 | Attack Damage +3%, Attack Speed +1.5%, Crit Chance +2% | – |
| 10 | Crit Damage +4%, Attack Damage +3%, Crit Chance +2% | – |

| Ability | Target | CD | Effect (r1→r5) |
|---|---|---|---|
| **Rapid Fire** | Self | 12s | +Attack-speed 50→82%, 8s |
| **Aimed Shot** | Front enemy | 10s | 1.8→3.4× AD, can crit |
| **Multishot** | All enemies | 20s | 0.8→1.52× AD, can crit |
| **Poison Arrow** | Front enemy | 10s | DoT 4.2→7.8× AD over 6s |
| **Explosive Shot** | All enemies | 20s | 0.7→1.3× AD + burn DoT, can crit |

*ULT — Mark of the Hunter (L60):* see Ultimates table.

---

## Defaults / knobs

- Max rank = 5 on every node. Row unlock = `(row−1)×10` points spent. Abilities live in rows 1–4.
- Per-rank stat values live in `data/talents.ts` (`CLASS_TALENTS`, applied as percent via `FLAT_TO_PERCENT`
  or native percent). Ability `coeff` values live in `data/abilities.ts`; ult numbers in `data/ultimates.ts`.
- Tuned against the Φ curve so the PROGRESSION invariants still hold (the smoke harness spends every point;
  note ults only matter at L60+, deep past the smoke run's reach — they're covered by `test/sim/ultimates.test.ts`).
- **Migration note:** the rework changes node keys/abilities, so talent points spent on the OLD tree don't map
  cleanly — a fresh build (or a one-time talent reset) is expected when adopting this.

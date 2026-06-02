---
name: rebalance-task-state
description: Live state of the combat rebalance + survival pass work (damage curve, abilities, talents, enemies, optimal-play greedy agent)
metadata:
  type: project
---

Ongoing task (as of 2026-06-01): rebalancing the combat/difficulty curve in this idle RPG. Multi-phase.

## DONE & was green (72/72 tests, typecheck, lint)
- **Damage re-anchor:** base AD cut (classes.ts) W75→8, Rgr78→9, Mage95→11, Rog70→8, Pri48→5 (growth trimmed);
  `GEAR_POWER=2.1` knob in `src/data/stageScaling.ts` multiplied into `rollStatValue` flat branch (`src/sim/loot.ts`).
- **Unified ability pattern (heroes + enemies)** in `src/sim/abilities.ts`: `normalAttackDamage(caster)` = hero
  `attackDamage×(1+damageIncrease/100)` / enemy `enemyDamage`. Damage+DoT = `coeff×normalAttack` (DoT coeff is TOTAL
  over duration, divided to per-second in applyToTarget). Heal/HoT/Shield = `coeff×target.maxHP` (HoT total over dur).
  Enemy ability damage routed through armor/MR mitigation — stage `S` threaded into `castReadyAbilities` (also updated
  combat.ts call sites + abilities.test.ts calls to pass S).
- **Talents flat→percent** in `src/data/talents.ts` via `FLAT_TO_PERCENT` {attackDamage:1.5, health:0.1, armor:1.0, magicResist:1.0} (hpRegen/hpPerHit stay flat).
- **Enemy abilities** in `src/data/abilities.ts` (enemy_smash/enemy_aimed/enemy_bolt) assigned to brute/archer/caster in `src/data/enemies.ts`. Bosses still ability-less (enrage-gated).
- **DoT/HoT data coeffs** rescaled ×duration to preserve behaviour (mage_blizzard 2.0, poison 4.2, rain 6.4, envenom 4.8, cripplingpoison 2.0, mend 0.24).
- **Probe added:** `progression.test.ts` test `#0` (fresh L1 hit ≤ trashHp, > trashHp/5).

## Survival pass — IN PROGRESS, key tension found
- New tool `scripts/sim-survival.ts`: per stage 1→200 × {UNDER gear@S-10 / ON gear@S / OVER gear@S+15} → wave clear time, min party-HP%, CLEAR/WIPE.
- Test agent now fields **tank/dps/healer** (warrior/ranger/priest): `PARTY_PRIORITY` in `test/sim/harness.ts`; probe `PARTY` matches.
- Measured: **25% HP cut → mediocre gear genuinely wipes (good!) but greedy agent reaches only ~97** (fails pre-existing `reach≥120` invariant). **15% cut → reach 224 but mediocre gear too soft (80-100%).**
- Root cause: early game is HEALERLESS (priest = 3rd party slot; stages ~1-15 are solo/duo), so deep cuts wipe-loop the opening; the `reach≥120`-in-fixed-time invariant counts that as failure.
- Late-game survival is STRUCTURAL: enemy dmg Φ^0.82 vs HP Φ^1.0 → damage falls behind; not safely tunable at Φ≈4e14. Late = DPS/enrage race by design.
- Tankier enemies (TRASH_HP_FRACTION) = pacing knob only (breaks snappy-wave invariant, no late danger).

## USER'S DECISIVE DIRECTIVE (latest, must follow) — see [[greedy-agent-must-play-optimally]]
"The greedy agent should farm. If they can't win they should go back, get stronger and come back. The greedy
algorithm is not playing optimally then. Make a tab/whatever to track what the optimal playing strategy would be and
make the greedy follow that and balance around that. The reach is not important, the experience is. Make it make sense."

→ NEXT STEPS:
1. Rework `GreedyRunner` (test/sim/harness.ts) to play OPTIMALLY: when it can't clear (wipe / boss can't be beaten /
   clear-time blows up), RETREAT and farm earlier stages for gear+levels, then return. Don't wipe-loop.
2. Drop/replace the `reach≥120`-in-fixed-time invariant (#1/#2 in progression.test.ts + smoke.test.ts). Balance around
   EXPERIENCE: good on-level gear = easy-not-trivial; mediocre gear = brutal → forces farm-retreat → return stronger.
3. THEN apply the brutal survival curve (~25% HP cut, DMG0 maybe up) and balance around the farming agent.
4. Sync docs (REBALANCE.md §13/§14, BALANCE.md, PROGRESS.md) — currently STALE (say "DMG0 6→10", "25% cut", "188" which don't match the live 15% state).

## Current uncommitted code state
- classes.ts: 15% cut (W145/15/11, Rgr94/8/6, Mage77/5/8, Rog85/7/5, Pri115/10/13). Likely revert toward 25% per directive.
- stageScaling.ts: DMG0=6, GEAR_POWER=2.1, TRASH_HP_FRACTION=0.32, DMG_EXP=0.82, HP0=40, BOSS_HP_MULT=4.
- ORIGINAL HP (pre-survival) was W170/18/13, Rgr110/9/7, Mage90/6/9, Rog100/8/6, Pri135/12/15.

## Authority/process
- `docs/REBALANCE.md` is the plan; §9 says DON'T silently relax invariant thresholds (but user now says reach isn't important → relaxing reach is sanctioned by the user).
- Tuning oracle: `npx vite-node scripts/sim-smoke.ts`, `scripts/sim-survival.ts`, `npx vitest run`. Run, redirect to /tmp, read.

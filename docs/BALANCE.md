# BALANCE.md — Resolved `tune` values (starting numbers)

The SPEC marks open values `tune`. They are resolved here into concrete starting numbers so the build never
blocks. **These are reasonable first-pass defaults, not sacred** — they live in `data/*.ts` and exist to be
tuned. Put each number in its matching `data/` file; reference it, never re-type a literal in logic.

> Guiding feel: a brisk early game (first stages clear in seconds), exponential pressure that demands gear,
> chest storage that fills in a few minutes of away-time, pets as a marquee monthly rare.

> ⚠ **POST-OVERHAUL — many numbers below are superseded.** See `docs/PROGRESSION.md §0` for the current model.
> Key changes: tech is **non-combat only** (combat power = items); **no equip-gate**; **level cap 120** with a
> cheap-early/steep-tail XP curve (`0.5·L^3.5 + 4.4^(L-39)`); **tier multipliers widened** (T8 = 9×);
> `GEAR_POWER = 9.0`; zone bosses 220/5.5 + a **per-world wall** (`ZONE_WALL_GROWTH ≈ 1.11`) tuned for
> **W100 ≈ ~1 year**; `WAVES_PER_STAGE = 20`; normal chests **2%**/kill; gold `Φ^0.85`; world-depth rarity
> curve with tier unlocks at worlds 12–20. The tables below are kept for the *shape*; trust the `data/*.ts`
> values + PROGRESSION §0 for live numbers.

---

## Simulation

- **Tick:** 100 ms logical timestep. Render interpolates.
- **Offline cap:** 12 hours of catch-up. Sampled deterministically from the seed.
- **Autosave:** every 30 s + on meaningful events (chest open, equip, tech/talent purchase, stage advance).
- **Party wipe penalty:** retreat 1 stage; resume. No permadeath.

## Tiers — `data/tiers.ts`  (rarity & unlock scale with stage — see PROGRESSION §13)

| Tier | Name | extraStats | sockets | statMult | baseWeight | unlockStage |
|---|---|---|---|---|---|---|
| T0 | Normal | 0 | 0 | 1.00 | 1000 | 1 |
| T1 | Uncommon | 1 | 0 | 1.15 | 620 | 1 |
| T2 | Rare | 1 | 1 | 1.35 | 340 | 1 |
| T3 | Epic | 2 | 1 | 1.60 | 170 | 3 |
| T4 | Legendary | 2 | 2 | 1.90 | 48 | **10** |
| T5 | Mythic | 3 | 2 | 2.30 | 11 | **20** |
| T6 | Ancestral | 3 | 3 | 2.80 | 2.0 | **30** |
| T7 | Divine | 4 | 3 | 3.40 | 0.30 | **40** |
| T8 | Primordial | 4 | 4 | 4.20 | 0.05 | **50** |

Colors: see ART.md. `baseWeight` is tiny at the top on purpose. `rollTier(S, chestFactor, rng)` zeroes any
tier below its `unlockStage`, then applies the stage/chest bias and the global `RARITY` knob (PROGRESSION
§13). **Drop-rate target** (stage-50 nonstop farming): ~2 T6/day, ~1 T7/day, ~1 T8/2days — harness-calibrated.
Same tier roll governs **gems** (T1–T8). The old `tierBias` formula stays as the bias term inside `rollTier`.

## Stats — `data/stats.ts` (`rollPerIlvl {min,max}`, kind)

| Stat | group | kind | min | max |
|---|---|---|---|---|
| attackDamage | offensive | flat | 0.8 | 1.4 |
| attackSpeed | offensive | percent | 0.4 | 1.0 |
| critChance | offensive | percent | 0.3 | 0.7 |
| critDamage | offensive | percent | 1.0 | 2.0 |
| damageIncrease | offensive | percent | 0.5 | 1.1 |
| penetration | offensive | percent | 0.4 | 0.9 |
| lifesteal | offensive | percent | 0.2 | 0.5 |
| armor | defensive | flat | 0.7 | 1.3 |
| magicResist | defensive | flat | 0.7 | 1.3 |
| health | defensive | flat | 6.0 | 11.0 |
| dodgeChance | defensive | percent | 0.2 | 0.5 |
| hpRegen | defensive | flat | 0.4 | 0.9 |
| hpPerHit | defensive | flat | 0.3 | 0.7 |
| block | defensive | percent | 0.3 | 0.7 |

Roll value depends on the stat's `kind` (**`docs/PROGRESSION.md` §6** — the critical flat/percent split):
- **flat** stats: `round2( rand(min,max) × tier.statMultiplier × Φ(origin.stageIndex) )` (scales with stage).
- **percent** stats: `round2( rand(min,max) × tier.statMultiplier )` (**bounded — no stage scaling**; their
  growth comes from higher tiers + sockets).

The old linear `× ilvl` form is **superseded** — do not use it. Percent stats are stored as percent points
(e.g. `50` = +50%); `aggregate` divides by 100 where needed.

## Item slots & affixes — `data/itemSlots.ts` (full routing in `docs/AFFIXES.md`)

Base affixes: armor (helmet/chest/gloves/legs/boots) → `armor`; weapon → `attackDamage`; jewelry (T1+):
offhand → `attackDamage`, ring1 → `critChance`, ring2 → `critChance`, amulet → `damageIncrease`.
**Substat pools:** armor → defensive(7) only; weapon → offensive(7) only; **jewelry → all 14, mixed**
(offensive + defensive may coexist — the flex slot; overrides SPEC §4.2). Substats distinct, never duplicate
the base affix, ≤4 total.

## Gems — `data/gems.ts` (TIERED T1–T8; see DATA_MODEL `GemDef`/`GemInstance` + PROGRESSION §13/§14b)

Each gem grants an **ordered list of stats per category**; a tier-T gem grants the first `gemAffixCount(T)`
of them. `base` is the pre-scale magnitude (flat → ×`gemTierMult` ×`Φ(gem.origin.stageIndex)`; percent →
×`gemTierMult` only). Entry 0 is the gem's signature stat (from SPEC §4.5); entries 1–3 are the extra
affixes higher tiers unlock. Keep group rules: armor→defensive, weapon→offensive, jewelry→either.

```
gemAffixCount(tier) = [T1:1, T2:1, T3:2, T4:2, T5:3, T6:3, T7:4, T8:4]
gemTierMult(tier)   = [T1:1.0, T2:1.3, T3:1.7, T4:2.2, T5:2.9, T6:3.8, T7:5.0, T8:6.6]
```

Ordered grant lists (`base` shown; extend sensibly — signature first, then on-theme extras):

| Gem | armor (defensive) | weapon (offensive) | jewelry (either) |
|---|---|---|---|
| Ruby | health 9, armor 3, hpPerHit 2, block 3% | attackDamage 1.0, damageIncrease 5%, critDamage 8%, attackSpeed 4% | critDamage 8%, health 9, attackDamage 1.0, critChance 3% |
| Sapphire | armor 3, magicResist 3, health 7, hpRegen 2 | penetration 5%, attackDamage 0.8, attackSpeed 4%, critChance 3% | attackSpeed 4%, armor 3, penetration 5%, health 7 |
| Emerald | dodgeChance 3%, health 7, armor 2, hpRegen 2 | lifesteal 3%, attackDamage 0.8, critChance 3%, damageIncrease 5% | critChance 3%, dodgeChance 3%, lifesteal 3%, attackDamage 0.8 |
| Topaz | magicResist 3, health 7, block 3%, armor 2 | damageIncrease 5%, attackDamage 0.8, penetration 5%, critDamage 8% | damageIncrease 5%, magicResist 3, attackDamage 0.8, health 7 |
| Amethyst | hpRegen 2, health 8, dodgeChance 3%, armor 2 | critChance 3%, attackDamage 0.8, critDamage 8%, attackSpeed 4% | penetration 5%, hpRegen 2, critChance 3%, health 7 |
| Diamond | block 4%, armor 3, health 7, magicResist 3 | critDamage 8%, attackDamage 1.0, attackSpeed 4%, damageIncrease 5% | attackSpeed 4%, block 4%, critDamage 8%, attackDamage 1.0 |

Gems drop from chests (gated by `gemDropMult` tech); gem **tier** uses the shared `rollTier` (stage-scaled,
T1–T8, T4+ unlock-gated, rare). Socketing sets `item.bound=true` and grants stack **on top** of item affixes
(may exceed the item's 4-affix cap — fine).

## Chests — `data/chests.ts` (`ChestDropConfig`)

```
baseDropChance: { normal: 0.02, stageBoss: 0.25, zoneBoss: 1.00 }   // per relevant kill (current)
capacity:       { normal: 6,    stageBoss: 4,    zoneBoss: 4 }
itemsPerChest:  { normal: 1,    stageBoss: 2,    zoneBoss: 3 }
zoneKeyChance:  { normal: 0.02, stageBoss: 0.06, zoneBoss: 0.25 }   // per chest opened
gemChance:      { normal: 0.05, stageBoss: 0.12, zoneBoss: 0.25 }   // per chest opened → a tiered gem (rollTier)
```

Full type → stops accruing. Auto-open base interval 600000 ms (10 min), reducible by tech (floor 60 s).
**Zone-key target: ~1 key per ~30 min of W-9 farming** (PROGRESSION §14) — harness-tune `zoneKeyChance`
against simulated W-9 throughput. Keys stockpile; entering W-10 (boss-only stage) consumes one.

## Stage scaling, gear power & XP — see `docs/PROGRESSION.md` (canonical)

> ⚠️ The infinite-scaling model lives in **`docs/PROGRESSION.md`** (accelerating difficulty, exponential
> gear power matched to enemies, the gear-check treadmill, the steep XP curve, and the four testable
> invariants). It **supersedes** any linear/constant-exponential placeholders. The constants below are the
> *starting values* PROGRESSION specifies — implement them in `data/stageScaling.ts`, then let the smoke
> harness co-tune them until PROGRESSION §11's four invariants hold.

Starting constants (full formulas + rationale in PROGRESSION.md):

```
g(S)  = G0 + (G1-G0) * S/(S+KMID);  Φ(S) = Π g(i)     // accelerating master growth
G0 = 1.12   G1 = 1.30   KMID = 160                    // 1→2 ≈ +12%, 50→51 ≈ +16%, late → +30%
enemyHp(S)     = 40 * Φ(S)
enemyDamage(S) = 6  * Φ(S)^0.82                        // damage lags HP → DPS-race wall
mitigation(S)  = armorEff / (armorEff + 50*Φ(S)^1.0)   // MIT_EXP=1.0 tracks EG_FLAT (armor is flat)
bossHpMult = 8  bossDamageMult = 1.7                   // zoneBoss: 35 / 3.0 (hard farming gate, PROGRESSION §14)
killsPerStage = 10

EG_FLAT = 1.0     // flat-stat gear exponent — MUST be ~1.0 (in [0.98,1.0]); lower breaks the late game
statValue(flat)    = round2( rand(min,max) * tierMult * Φ(origin.stageIndex)^EG_FLAT )  // attackDamage,health,armor,…
statValue(percent) = round2( rand(min,max) * tierMult )                                 // crit,attackSpeed,… BOUNDED
ilvl(S)   = max(1, 5*round(0.5*S))                     // display/plausibility band, NOT the power source

goldPerKill(S)     = round(3 * Φ(S)^0.85)              // TIGHT: gold gates the tech-UNLOCK pace → forces farming
xpPerKill(S)       = round(4 * Φ(S)^0.50)              // SLOW: leveling is the progression gate (~1.5× slower)
totalExpToReach(L) = floor(50*L^3 + 8*1.55^L)          // Lv36≈59M, Lv100≈8e19 — extreme late (curve UNCHANGED)
// researchPerKill: NOT earned in v1 (research reserved; tech costs gold). Field kept = 0 for forward-compat.
```

> **Income re-tune (design directive, supersedes the old "gold floods in" framing).** The per-kill bases
> were cut (gold 5→**3**, xp 6→**4**; a temporary ×3 gold test-mult was also removed) to make the player
> **FARM, not advance non-stop**: leveling is ~1.5× slower (the progression gate) and gold gates the
> **tech-unlock pace** (you must save a few minutes for each meaningful node). The XP *curve* is unchanged —
> only income — so the §8 level milestones still hold. The tech **gold× (≤~23×) / xp× (≤~13×)** bonuses are
> the intended late-game relief that rewards investing in the Economy branch. Measure with
> `scripts/sim-pacing.ts` (mid/late) and `scripts/sim-newgame.ts` (the fresh-start bootstrap). Party-slot
> tech is hand-priced CHEAP (slot 2 = 1000g, slot 3 = 10000g via `costOverride`) so the tank·dps·healer
> trio forms in early world 1 (2nd member by ~stage 1-3, trio by ~stage 4-6) despite the tight gold.

**Tier drop weights are stage-gated + rare** — `rollTier` (PROGRESSION §13) uses per-tier `baseWeight` +
`unlockStage` + bias `(1 + tier × (S/40) × chestFactor)`, `chestFactor = { normal: 1.0, stageBoss: 1.6,
zoneBoss: 2.6 }`, × global `RARITY`. Boss/zone kills pay ×8 / ×40 the per-kill income (`tune`).

## Classes — `data/classes.ts`

**3 classes — the canonical Warrior·Ranger·Priest trio** (Mage/Rogue removed so all tuning targets one comp;
CLAUDE.md override). **Warrior is free; others cost small gold** (never a progression blocker — SPEC §4.7).

| key | name | role | unlock | flavor base stats (fill the rest sensibly) |
|---|---|---|---|---|
| warrior | Warrior | tank | free | high health/armor, low attackSpeed; hpRegen 5 (early cushion) |
| ranger | Ranger | dps | gold 500 | high attackSpeed/critChance (owns Rapid Fire) |
| priest | Priest | healer | gold 500 | moderate stats; heals lowest-HP ally each cadence |

> Class unlocks are all a flat **500 gold** (warrior free) — deliberately cheap so they're never a
> progression blocker. Owning a class ≠ fielding it: party SLOTS gate the active 3, and the slot-2/3 tech is
> the (cheap) real gate on party size.

Suggested warrior base: `{ health: 120, armor: 14, attackDamage: 9, attackSpeed: 0.8, critChance: 5 }`,
growth/level `{ health: 14, armor: 1.2, attackDamage: 1.1 }`. Give each class a distinct profile; keep the
free warrior survivable solo through the first world. Party: max 3; slot 1 free, slots 2 & 3 via tech.

## Effects & abilities — `data/effects.ts`, `data/abilities.ts`

Worked example (mandatory, SPEC §4.11):
```
EffectDef  buff_fast_fire : { kind: {type:'statMod', stat:'attackSpeed', mode:'percent', value:50},
                              durationMs:8000, maxStacks:1, stackRule:'refresh', beneficial:true }
AbilityDef ranger_fast_fire: { cooldownMs:15000, target:'self', applies:[{effectKey:'buff_fast_fire'}],
                              castCondition:'enemyPresent', rankScaling:{ perRank:{ value:8 } } }
```
Author at least one ability per class + the effects they apply, e.g.:
- `warrior_taunt_guard` → self `+block`/`+armor` buff (also a `tag:'taunt'`).
- `mage_fireball` → `frontEnemy` applies a `dot` (burning) + `tag:'burning'`.
- `rogue_expose` → `frontEnemy` debuff `-armor` (percent) — demonstrates a debuff with `stackRule`.
- `priest_mend` → `lowestAllyHp` applies a `hot`.
- A generic `debuff_stun` (`{type:'stun'}`, ~1500 ms) for the stun test (give it to one class or an enemy).

Ability ranks (from talent tree) scale via `rankScaling.perRank`. Basic ability node is `0/5`.

## Talents — `data/talents.ts`

Per class: lines of **[passive, passive, ability]**. Line N unlocks at `N*10` points spent. Passives `0/5`,
ability `0/5`. Line 1 example: `Health 0/5` (passive `health` +health/rank), `Damage 0/5` (passive
`attackDamage`), `Basic Ability 0/5` (the class active, ranks scale it). Provide ~3–4 lines per class.
Passive `valuePerRank`: pick so 5/5 ≈ a meaningful but not dominant boost (e.g. health +8/rank,
attackDamage +0.8/rank, percent stats +2%/rank). Respec: free in v1 (simplest; can add a gold cost later).

## Tech tree — `data/techTree.ts` (THE main v1 gold sink; overrides SPEC §6's research currency)

**REWORKED** (post-SPEC) from a connected DAG into a **flat catalogue of ONE endlessly-rankable node per
type** — no rings, no prerequisites, no chains. Per-rank power is small & fixed; **cost grows exponentially
per rank**, so every node is an open-ended target for the gold that floods in from kills (`goldPerKill ~
Φ^0.85`) and no node ever "completes":

```
nodeCost(node, rank) = round( node.baseCost * node.costGrowth^rank )
// e.g. Combat: baseCost ~55-80, costGrowth 1.3 → rank0 ~60g · rank10 ~825g · rank30 ~360K · rank60 ~1.3B …
```

Nodes are grouped into four presentation **categories** (Combat / Economy / Chests / Utility). The full list
(22 nodes), per-rank effect and pricing:

| key | category | per-rank effect | baseCost | costGrowth | maxRanks |
|---|---|---|---|---|---|
| _(Combat category REMOVED — tech is non-combat now; combat power lives in items)_ | — | — | — | — | — |
| eco_gold / eco_xp | Economy | +8% gold / XP per kill | 60 | 1.3 | ∞ |
| eco_offline | Economy | +10% offline yield | 250 | 1.45 | ∞ |
| chest_drop_normal/stage/zone | Chests | +10/5/5% per-type drop | 90/110/140 | 1.35–1.4 | ∞ |
| chest_gem / chest_key | Chests | +5% gem / +5% key | 150 | 1.5 | ∞ |
| store_normal/stage/zone | Chests | +1 storage (per type) | 250/300/350 | 1.7 | ∞ |
| auto_open | Utility | unlock + −45s interval / rank | 500 | 1.6 | 12 (floor) |
| party_size | Utility | +1 active party slot | 1000 | 2.5 | 2 |

> Removed in this pass: the Combat *Damage Increase*, *Dodge Chance* and *Block* nodes, and the Chests
> *Treasure Sense* (global drop %) node. Those stats still come from gear/talents (and the global
> `chestDropMult` is still fed by the Lucky Cat pet). Legacy save ranks under the removed keys are dropped on load.

**Combat tech is intentionally small per rank.** Every Combat node is `mode: 'percent'` (multiplicative on
the gear/level total for flat-kind stats; +N percentage points for percent-kind stats like crit/dodge/block).
The *exponential per-rank cost* is the real sink, not per-rank power: ranks stay cheap early then balloon, so
the player is always bounded by gold income rather than by a maxRanks cap. `hpRegen` / `hpPerHit` / `lifesteal`
have no tech nodes (gear-only).

**Gold is the tech currency** (and class unlocks + inventory); `researchPoints` is reserved/unused in v1.
**Recruitment** (`party_size`, hand-priced 1000g/2500g for slots 2/3) is the real gate on party size — cheap so the
tank·dps·healer trio forms in early world 1, NOT behind the deep sink. (Inventory slots are NOT a tech node —
they're their own gold system below; the `inventorySlots` TechEffect kind was removed in the rework.)

## Inventory expansion — gold sink (its own system, NOT tech)

Players start with **20 slots, 1 page**. Two gold purchases, both escalating, expandable up to **200 slots**:
- **Slot upgrades:** up to **20**, each `+1 slot on EVERY page` (global). `inventorySlotUpgrades` 0→20.
- **Page unlocks:** up to **4** more pages (5 total). `inventoryPages` 1→5.
- **Capacity = `inventoryPages × (20 + inventorySlotUpgrades)`**, max `5 × 40 = 200`.

```
slotCost(k)  = round( 100  * 1.5^k  )   // k = the (k+1)-th slot upgrade, 0..19;  k19 ≈ 332K, Σ ≈ 1.0M gold
pageCost(p)  = round( 5000 * 8^(p-2) )  // p = page being unlocked, 2..5; p2=5K, p3=40K, p4=320K, p5=2.56M
```

Total to fully max ≈ **~4M gold**. Tuned so a steady stage-~50 farmer can unlock everything around then
(gold/kill ≈ 1.5K and accumulating). These compete with the tech tree for gold but are finite; tech is the
endless sink. (`tune` the bases/growths against simulated stage-50 gold income.)

## Pets — `data/pets.ts`

Drop on kill (not chests). Tuned so a first-month player gets ~1–2 total.
```
baseDropChance: enemy 0.00002 (1 in 50k), boss 0.0001 (1 in 10k); zone boss uses 'boss'
```
~6–8 pets, each an **economy/utility bonus only** (never combat). Examples:
`coin_sprite` goldMult +15%; `scholar_owl` xpMult +15%; `pack_mule` chestStorage normal +2;
`lucky_cat` chestDropMult +12%; `keymaster` zoneKeyMult +25%; `time_imp` autoOpenReduce -90s;
`hoarder` chestStorage stageBoss +1. Selected pet is cosmetic; all owned stack.

## UI / settings defaults

`uiScale: 1`, `dockOrientation: 'bottom'`. Starting save: `seed` random at first run; gold 0; research 0;
warrior unlocked & in slot 1; empty inventory; base chest capacities; auto-open locked.

---

## REBALANCE — unified ability/enemy pattern + the gear knob (applied)

**The damage curve was re-anchored** (see `docs/REBALANCE.md`). Resolved numbers:

- **`GEAR_POWER = 2.1`** (`src/data/stageScaling.ts`) — global multiplier on FLAT gear-stat
  rolls (`loot.ts → rollStatValue`). Compensates the base-AD cut so a *geared* hero recovers
  full power by ~stage 10–15. Tuned via the smoke harness: reaches the 240 run-cap, per-wave
  p95 ~10.4s, frozen-gear B 10/20 (≤24), drop rates unchanged.

- **One damage unit — the "normal attack."** Every damaging ability (hero *and* enemy) deals
  `coeff × normalAttack`, where `normalAttack` = hero `attackDamage × (1 + damageIncrease/100)`
  or enemy `enemyDamage`. So a `coeff` of 1.0 == "one auto-attack"; Fireball 1.6 = 160%, etc.
  Enemy ability damage is mitigated by the target's armor/MR (like enemy autos).
  - **DoT/HoT `coeff` is the TOTAL over the effect's duration** (spread per-tick), not per-second.
  - **Heal/HoT/Shield stay `coeff × target.maxHP`** (scale with the HP pool, not AD).

- **Talent stat nodes are PERCENT.** Flat stats (AD/health/armor/MR) on talents are applied as
  `%` bonuses (`talents.ts → FLAT_TO_PERCENT`: AD ×1.5, health ×0.1, armor/MR ×1.0 of the row
  value) so "points spent" scale with total power instead of being swingy-early / useless-late.
  hpRegen/hpPerHit stay flat (don't convert cleanly).

- **Enemies have signature abilities** (`enemy_smash` brute, `enemy_aimed` archer, `enemy_bolt`
  caster) scaling off `enemyDamage` through the same path. Bosses stay enrage-gated (no abilities
  yet — a deliberate follow-up).

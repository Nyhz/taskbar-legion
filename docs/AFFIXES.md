# AFFIXES.md — Which stats each item type can roll (STAT-SYSTEM REWORK)

This defines the **affix routing**: which stats appear on which item category (**armor / weapon / jewelry**)
and which gear **slots** each soft-capped enabler is restricted to. Authoritative for `sim/loot.ts`,
`data/itemSlots.ts` and `data/stats.ts`.

> **⚠️ Overrides SPEC §4.2 and all earlier AFFIXES drafts.** Reflects the stat-system rework (dodge/hpPerHit
> removed; damageIncrease/lifesteal made buff-only; hpRegen made base-only; multistrike added; soft-capped
> enablers + per-slot restrictions). The numeric *scaling* (flat magnitudes) is being reworked separately in
> the Phase 2 polynomial pass — see DIFFICULTY.md.

---

## Two stat classes (the core of the model)

**SCALERS — unbounded, where endless upgrade-power lives.** Roll freely on their category pools.
- Offensive: `attackDamage`, `attackSpeed`, `critDamage`
- Defensive: `armor`, `magicResist`, `health`
- Utility: `healPower`

**ENABLERS — bounded "chance/reduction" stats, DIMINISHING-RETURNS soft-capped** (`ENABLER_SOFT_CAPS`):
`effective = cap · raw/(raw+k)` — applied once on the summed raw in `aggregate`, so it covers gear + gems +
talents + buffs together. They are RESTRICTED to specific slots so their raw can't pile up and slam the cap early.

| Enabler | cap | k | Gear slots it can roll on |
|---|---|---|---|
| `critChance` | 100% | 60 | knight sword/shield, ranger bow/quiver, priest wand/tome, **+ jewelry** |
| `block` | 75% | 50 | knight sword + shield |
| `multistrike` | 25% | 20 | knight sword/shield + ranger bow/quiver |
| `cooldownReduction` | 50% | 40 | **jewelry only** |

**NOT rollable on gear:** `damageIncrease` + `lifesteal` (buff-only — Battle Cry / Bloodlust),
`damageReduction` (buff-only), `hpRegen` (class-base-only early cushion). **Removed entirely:** `dodge`,
`hpPerHit`, `penetration`.

## The three category identities

| Category | Slots | Base affix | Substat pool |
|---|---|---|---|
| **armor** | helmet, chest, gloves, legs, boots | MITIGATION: pure `armor`, pure `magicResist`, or a 50-50 split | **`FLEX_STATS`** (scalers only — NO enablers) |
| **weapon** | weapon, offhand | per class TYPE (below) | per class TYPE (CLASS-LOCKED) |
| **jewelry** | ring, trinket, amulet | freestyle from `JEWELRY_STATS` | **`JEWELRY_STATS`** = FLEX + `critChance` + `cooldownReduction` |

- **`FLEX_STATS` (7 scalers):** attackDamage, attackSpeed, critDamage, armor, magicResist, health, healPower.
- **`JEWELRY_STATS` (9):** FLEX + critChance + cooldownReduction (jewelry is the home of crit + CDR).
- Armor is scalers-only → it's your **raw-power/mitigation** gear; enablers live on weapons + jewelry.

### The six weapon types (`data/itemSlots.ts → WEAPON_TYPES`)

| Class | Type | Slot | Base | Substat pool |
|---|---|---|---|---|
| Knight | **Sword** | weapon | `attackDamage` | attackDamage, critDamage, attackSpeed, block, critChance, multistrike, health, armor |
| Knight | **Shield** | offhand | `block` | block, armor, magicResist, health, critChance, multistrike |
| Ranger | **Bow** | weapon | `attackDamage` | attackDamage, attackSpeed, critDamage, critChance, multistrike |
| Ranger | **Quiver** | offhand | `attackSpeed` | attackSpeed, critDamage, attackDamage, critChance, multistrike |
| Priest | **Wand** | weapon | `healPower` | healPower, attackDamage, critDamage, critChance, magicResist |
| Priest | **Tome** | offhand | `healPower` | healPower, critChance, critDamage, health, magicResist |

Knight weapons are the **flex bruiser** slots (block identity + crit/multistrike + hp/armor). Priest crit
(wand/tome/jewelry) matters because **crit now applies to heals**. CDR left the weapons → jewelry-only.

## Substat rules (`sim/loot.ts`)

For tier `T`, roll exactly `tierDef.extraStats` substats (0,1,1,2,2,3,3,4,4 for T0–T8; max 4):
1. **Pool by category:** weapon/off-hand → that TYPE's `pool`; armor → `FLEX_STATS`; jewelry → `JEWELRY_STATS`.
2. **Distinct keys:** no substat repeats, and none duplicates any base-affix key.
3. **Value** by `kind`: **flat** scales with item level; **percent** is bounded by tier. *(The exact flat
   curve is the Φ-vs-polynomial Phase 2 rework — see DIFFICULTY.md.)* Enabler percents are summed raw and
   soft-capped in `aggregate`, never per-roll.
4. **Class lock:** weapon/off-hand roll a launch class → their TYPE, set `classKey`; only that class equips.

## Gems (`data/gems.ts`) — SCALER-ONLY

Gems never grant enablers (that would sneak an enabler into a restricted slot). Each grants **one scaler
stat, the same in ANY socket** (Diamond grants two); tier scales magnitude, not count. Socketing sets `bound=true`.

| Gem | Grants | | Gem | Grants |
|---|---|---|---|---|
| Ruby | attackDamage | | Topaz | healPower |
| Sapphire | critDamage | | Amethyst | attackSpeed |
| Emerald | health | | Diamond | armor + magicResist |

Sapphire's crit **damage** pairs with the crit **chance** you collect from gear/talents.

# AFFIXES.md — Which stats each item type can roll (GEAR OVERHAUL)

This defines the **affix routing**: which stats appear on which item category (**armor / weapon / jewelry**),
as base affix(es) and as substats. It is the authoritative routing for `sim/loot.ts`, `data/itemSlots.ts`
and `data/stats.ts`.

> **⚠️ Overrides SPEC §4.2 and all earlier AFFIXES drafts.** The gear overhaul (per design directive)
> reshaped gearing into three clear identities. Where SPEC and this file disagree, **this file wins**.

---

## The three identities (the whole model)

| Category | Slots | Base affix (intrinsic) | Substat pool | Equip |
|---|---|---|---|---|
| **armor** | helmet, chest, gloves, legs, boots | **MITIGATION**: pure `armor`, pure `magicResist`, or a 50-50 **split** (½ each — a real DUAL base) | **fully flexible** — Offensive ∪ Defensive ∪ rollable-utility (`FLEX_STATS`, 15) | any hero |
| **weapon** | weapon, **offhand** | **per class TYPE** (below) | **per class TYPE** | **CLASS-LOCKED** |
| **jewelry** | **ring**, **trinket**, amulet | **freestyle** — ANY stat from `FLEX_STATS` (off/def/util) | **fully flexible** (`FLEX_STATS`) | any hero |

- **Armor** gives everyone a guaranteed **defensive baseline** (armor/MR) and is the *hunting ground*: its
  substats are fully flexible, so a priest hunts heal-power/CDR, a tank hunts defense, a ranger hunts offense.
- **Weapon + off-hand** are **class-locked TYPES** — only the matching class can equip them. Each carries a
  tailored intrinsic base + substat pool (the class's identity). An item born to a type stamps `classKey`.
- **Jewelry** is the **wildcard**: base rolls from the full flex pool (any offensive/defensive/utility stat),
  substats flexible, class-agnostic.

### The six weapon types (`data/itemSlots.ts → WEAPON_TYPES`)

| Class | Type | Slot | Intrinsic base | Substat pool |
|---|---|---|---|---|
| Warrior | **Sword** | weapon | `attackDamage` | attackDamage, critChance, critDamage, damageIncrease, lifesteal, hpPerHit |
| Warrior | **Shield** | offhand | `block` | armor, magicResist, health, block, dodgeChance, hpRegen |
| Ranger | **Bow** | weapon | `attackDamage` | attackDamage, attackSpeed, critChance, critDamage, damageIncrease, lifesteal |
| Ranger | **Quiver** | offhand | `attackSpeed` | attackSpeed, critChance, critDamage, damageIncrease, lifesteal, cooldownReduction |
| Priest | **Wand** | weapon | `healPower` | healPower, attackDamage, critChance, cooldownReduction, magicResist, damageIncrease |
| Priest | **Tome** | offhand | `cooldownReduction` | healPower, cooldownReduction, health, magicResist, hpRegen, armor |

The warrior's **offense lives in the Sword**, its **defense in the Shield** — so the warrior's damage is
tuned by the Sword (+ its innate `attackDamage`), not by hoping for offensive armor.

## The stat pools (`data/stats.ts`)

- **Offensive (6):** attackDamage, attackSpeed, critChance, critDamage, damageIncrease, lifesteal.
- **Defensive (7):** armor, magicResist, health, dodgeChance, hpRegen, hpPerHit, block.
- **Rollable utility (2):** `cooldownReduction`, `healPower` — these NOW ROLL on gear (overhaul). CDR is the
  universal ability-uptime stat (clamped ≤75% in combat); healPower amplifies priest heals.
- **`damageReduction` is buff-ONLY** (`{0,0}` band) — flat %DR on gear would stack toward immunity.
- **`FLEX_STATS` (15)** = Offensive ∪ Defensive ∪ rollable-utility — the pool for armor substats and all of
  jewelry (base + substats).

## Substat rules (`sim/loot.ts`)

For tier `T`, roll exactly `tierDef.extraStats` substats (0,1,1,2,2,3,3,4,4 for T0–T8; **hard cap 4**):

1. **Pool by category:** weapon/off-hand → that class TYPE's `pool`; armor + jewelry → `FLEX_STATS`.
2. **Distinct keys:** no substat repeats, and **no substat may duplicate ANY base-affix key** (armor's split
   has two base keys — both are excluded).
3. **Value** by `kind` (PROGRESSION §6): **flat** = `round2(rand(min,max) × tierMult × GEAR_POWER × Φ(ilvl))`
   (scales with item level); **percent** = `round2(rand(min,max) × tierMult)` (bounded, level-flat).
4. **Class lock:** weapon/off-hand items roll a random launch class (`CLASS_KEYS`) → their TYPE, and set
   `classKey`. Only that class can equip (enforced in `partySlice.equip` + the harness).

## Base affix rules

- **armor:** `rollArmorBase` — ~40% pure armor, ~40% pure MR, ~20% a 50-50 split (`baseAffix` has TWO entries,
  half value each). Mitigation only — never offensive.
- **weapon/off-hand:** the TYPE's `base` (single entry), value via `rollStatValue`.
- **jewelry:** a single base picked from `FLEX_STATS` (freestyle). Jewelry still doesn't exist at T0
  (reject-and-reroll on drop via `minTier=1`).

## Item model note (`sim/items.ts`)

`baseAffix` is an **array** of `{key, value}` (1 entry normally; 2 for an armor armor/MR split). `classKey?`
is set only on weapon/off-hand items. The Cube's transfigure (`sim/cube.ts`) draws from `itemSubstatPool(item)`
(the item's real pool) minus already-taken keys.

## Gems vs affixes (unchanged routing)

Gems are tiered instances socketed later; their grants are **category-routed** (`gem.grants[item.category]`):
armor→defensive, weapon→offensive, jewelry→either. Off-hand is now **weapon-category**, so off-hand gems
grant offensive stats. Socketing sets `bound=true`. Gem grants stack on top of the item's affixes.

## Test implications (`test/sim/loot.test.ts`, `itemSlots.test.ts`)

- Weapon/off-hand: class-locked; base = its TYPE's intrinsic; substats ⊆ TYPE pool.
- Armor: base is mitigation only (armor/MR/split, all three appear); substats fully flexible (offensive,
  defensive AND utility all appear over many rolls).
- Jewelry: base is freestyle (offensive, defensive AND utility all appear); never at T0.
- No item exceeds 4 substats; substats distinct; no substat duplicates a base-affix key.

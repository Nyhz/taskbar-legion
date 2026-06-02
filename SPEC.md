# SPEC — Ambient Idle RPG (working title: TASKBAR LEGION)

> **What this is:** A browser-first, ambient idle RPG that auto-battles in a thin horizontal strip. Heroes advance left-to-right through infinitely-scaling stages. Management UI (status, party, inventory, equipment, chests, pets, tech) lives in **floating pixel-art panels** that you summon, use, and dismiss — the game strip is *always visible*, the panels are *transient overlays*.
>
> **Roadmap (three shippable versions — full detail in §9):**
> - **v1** — the complete single-player game, running in the **browser**, 100% offline.
> - **v1.5** — the same game **wrapped in Tauri** and shipped on **Steam** (native, always-on-top, docked, Steam Cloud saves). Still 100% offline.
> - **v2** — adds the **online layer**: Auction House + premium currency, backed by Supabase. Only built after v1.5 is validated.
>
> The whole document is written so each version is *the next phases*, never a rewrite of the last: the data model carries every field the later versions need (`origin`, `bound`, premium fields) from day one.
>
> **Execution model:** Built end-to-end by Claude Code. Every visual element must be verifiable from a screenshot. No part of the game requires a visual editor.

---

## 0. Non-negotiable constraints (read first)

1. **Pure code, no engine.** The whole game is TypeScript. Rendering is **PixiJS v8**. UI panels are **React 18 + Vite**. No game-editor binary formats anywhere.
2. **The strip is the permanent game view.** The game canvas is a horizontal strip (default ~480×180 logical px at 1×, **user-scalable 1× / 1.5× / 2×**) that renders permanently. **v1 (web):** the strip sits in a normal web page; windows can be large and freely arranged. **v1.5 (Tauri):** the strip docks to a screen edge and is the always-visible base, with management windows redesigned to be minimal and unobtrusive. The strip is never permanently obscured in either.
3. **Panels are overlays, openable and closable.** Every management window (Status / Hero / Talents / Inventory / Chest / Pets / Tech / Cube) floats *above* the strip; opening one pauses nothing (the sim runs underneath); they can be dragged and repositioned. **v1 (web):** several can be open at once, sized generously, spread across the screen — a comfortable desktop-web layout. **v1.5 (Tauri):** redesigned toward "summon → use → dismiss," minimal footprint, nothing open by default. **The render/logic split (below) is what makes this a re-skin, not a rewrite.**
4. **Render/logic decoupling is the portability guarantee.** Every panel's *logic and content* are separate from its *size, position, and chrome*. v1 uses a web-comfortable layout; v1.5 swaps the layout/skin (minimal, docked, dismissible) without touching panel logic or the simulation. Build panels so their visual shell (`PixelWindow`) and placement are parameterized, not hardcoded.
5. **Transparency & OS click-through are a v1.5 concern, NOT v1.** Do **not** build transparent-background or pointer pass-through in the web version — it adds the riskiest tech for zero benefit while the game is a normal web app. v1 has a normal opaque page. Transparency (`backgroundAlpha: 0`) and click-through (`setIgnoreCursorEvents` driven by a hit-test) are introduced in **v1.5 (Tauri)** — see §3b. The architecture keeps interactive surfaces identifiable (so the v1.5 hit-test is easy to add) but implements none of it in v1.
6. **Deterministic simulation.** Combat (incl. effects/abilities), loot, and chests run on a fixed-timestep simulation decoupled from render. Same seed + same inputs ⇒ same result. Required for offline-progress and (v2) anti-cheat.
7. **Everything is data-driven.** Classes, items, stats, tiers, gems, **effects, abilities, talents**, tech, pets, stage/loot scaling — all in typed config under `src/data/`, never hardcoded in logic.
8. **Save-compatible from day one.** The save schema already contains fields for later-version systems (cube, online/premium), even if unused. Migrations are versioned.

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | `noUncheckedIndexedAccess` on |
| Bundler/dev | Vite | |
| Game render | PixiJS v8 | strip rendering, sprites, animations; `backgroundAlpha: 0` (transparent) |
| UI / panels | React 18 | floating, openable/closable windows; all menus |
| Compositing | Transparent root + `pointer-events` hit-test | click-through in web build; Tauri-ready (see §3b) |
| Scaling | `uiScale` 1×/1.5×/2× | render-only zoom; sim logical units unchanged |
| State | Zustand | single store, slices per domain |
| Simulation | Plain TS, fixed timestep | no React/Pixi coupling |
| Persistence (proto) | IndexedDB via `idb` | save schema is engine-agnostic |
| RNG | `seedrandom` (or hand-rolled mulberry32) | seeded, serializable state |
| Styling | CSS Modules | pixel-art rendering: `image-rendering: pixelated` |
| Sprites | Aseprite-exported PNG sheets + JSON | placeholder art OK in proto |

**Later phases (not built now, but architecture must allow):**
- Native shell: **Tauri** (frameless, always-on-top, screen-edge dock, **transparent window**, **`setIgnoreCursorEvents` click-through**, system tray). The web build's transparency + hit-test (§3b) map directly onto these — port, not rewrite.
- Backend: Hono + Postgres (Neon) + Drizzle on Fly, Auth.js — for leaderboard, then auction.

---

## 2. Repository structure

```
taskbar-legion/
  src/
    main.tsx                 # bootstraps React + Pixi
    app/
      App.tsx                # layout: strip (bottom) + panel layer
      PanelLayer.tsx         # manages open/closed floating windows
    game/                    # PixiJS — the strip
      GameStrip.ts           # Pixi Application, the bottom canvas
      render/
        HeroSprite.ts
        EnemySprite.ts
        StageBackground.ts
        FloatingText.ts      # damage numbers, loot popups
      camera.ts              # horizontal scroll as party advances
    sim/                     # pure simulation, no Pixi/React imports
      Simulation.ts          # fixed-timestep loop, owns world state
      combat.ts              # auto-battle resolution
      effects.ts             # active-effect processing (buffs/debuffs/DoT/HoT/CC)
      abilities.ts           # ability cooldowns + AI cast logic
      stats.ts               # stat definitions, aggregation (base+gear+talents+effects)
      stages.ts              # stage scaling, progress bar, boss, zone-key gating
      chests.ts              # chest drops, storage caps, opening, zone keys
      loot.ts                # loot roll: tier, ilvl, stats, sockets
      pets.ts                # rare pet drop rolls
      bonuses.ts             # getBonuses(): merge tech nodes + owned pets
      offline.ts             # catch-up calculation on load
      rng.ts                 # seeded RNG wrapper
    data/                    # all designer-tunable config
      classes.ts
      stats.ts               # offensive + defensive stat defs
      itemSlots.ts
      tiers.ts               # single T0–T8 tier system (tier = rarity)
      gems.ts                # gem matrix (stat per category)
      effects.ts             # EffectDef library (every buff/debuff/status)
      abilities.ts           # AbilityDef library (per class)
      talents.ts             # per-class talent trees (lines of 2 passives + 1 ability)
      techTree.ts            # tech node DAG (global, not per-hero)
      pets.ts                # pet defs + bonuses (economy only)
      chests.ts              # chest drop/capacity/open config
      stageScaling.ts        # enemy/gold/ilvl/research/tierBias curves
      lootTables.ts
    state/                   # Zustand store
      store.ts
      slices/
        partySlice.ts        # roster, talents, talent points
        inventorySlice.ts
        chestSlice.ts        # unopened chests, zone keys, auto-open
        petSlice.ts          # owned pets + cosmetic selection
        progressSlice.ts
        uiSlice.ts           # open panels, window positions, uiScale, dockOrientation
    platform/                # shell abstraction. v1: surface tagging only. v1.5: real impl.
      hitTest.ts             # isPointerOverInteractive — built in v1.5, fed by v1 surface tags
      clickThrough.ts        # v1.5 only: Tauri setIgnoreCursorEvents
      transparency.ts        # v1.5 only: transparent root/canvas setup
    persistence/
      saveSchema.ts          # versioned, includes future fields
      saveManager.ts         # serialize/deserialize, migrations
    ui/                      # React panels (the floating windows)
      panels/
        StatusPanel.tsx
        HeroPanel.tsx        # party + equipment slots
        TalentPanel.tsx      # per-hero talent tree (lines of 2 passives + 1 ability)
        InventoryPanel.tsx
        ChestPanel.tsx       # open chests, storage, zone keys
        PetsPanel.tsx        # collection, cosmetic selection
        TechTreePanel.tsx    # global tech tree DAG, meta-progression
        CubePanel.tsx        # stub until v1 Phase 6
      components/
        PixelWindow.tsx      # the draggable frame (web: large/free; v1.5: minimal dock skin)
        ItemSlot.tsx
        ItemTooltip.tsx
        StatRow.tsx
        EffectIcons.tsx      # active buff/debuff icons over combatants
        AbilityCooldown.tsx  # cooldown pips for hero abilities
      hud/
        StripHud.tsx         # tiny always-visible controls + chest tray + icon bar
        OptionsPopover.tsx   # zoom, dock orientation
        IconBar.tsx          # the bottom launcher row (chest/skills/formation/cube/portal)
  public/assets/sprites/...
  SPEC.md
```

**Hard rule:** `sim/` and `data/` must NOT import from `game/`, `ui/`, or `state/`. The simulation is a pure library. React/Pixi read from it; it reads from nothing above it.

---

## 3. The screen layout

**v1 (web) — comfortable desktop layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  (normal opaque page background)                              │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐     │
│   │  HERO PANEL  │   │  INVENTORY   │   │  TALENTS     │     │
│   │ (draggable)  │   │ (draggable)  │   │ (draggable)  │     │
│   └──────────────┘   └──────────────┘   └──────────────┘     │
│   several windows open at once, freely arranged, generous     │
├───────────────────────────────────────────────────────────── │
│ [≡] 2-9  🛡️🛡️🛡️ heroes →→→ 👹 enemies     💰246k  ⚙️ │ ← STRIP
└─────────────────────────────────────────────────────────────┘
        strip is the permanent game view · sim runs here
```

**v1.5 (Tauri) — minimal docked redesign (same logic, new skin):**
```
   (real desktop, transparent app background, click-through)
        ┌──────────────┐
        │  HERO  (X)   │  ← summon → use → dismiss, minimal footprint
        └──────────────┘
  ╶─────────────────────────────────────────────────╴
   [≡] 2-9  🛡️🛡️🛡️ →→→ 👹   💰246k  ⚙️   ← docked strip
  ╶─────────────────────────────────────────────────╴
     always-on-top · docked to screen edge · nothing open by default
```

- **Strip:** PixiJS canvas. Current stage label (e.g. `2-9`), party advancing right, enemies, chest/portal props, **stage progress bar**, gold + research counters, active **buff/debuff icons** over combatants and **ability cooldown pips**. A HUD row carries the launcher **icon bar** (chest, skills/talents, formation, cube, portal — per the reference's bottom row).
- **Panel layer:** React `PixelWindow`s — draggable, framed, X to close. **v1:** multiple open, large, spread out. **v1.5:** minimal, dismissible, redesigned for the edge dock. Panel logic is identical across both; only the shell/layout differs.
- Panel open/close + positions live in `uiSlice`.
- **Dock orientation** is a single layout variable (`bottom` | `left` | `right`); the reference docks as a vertical side column, our default is a bottom strip. Used mainly in v1.5.

### 3b. Window scaling (v1) + transparency & click-through (v1.5)

**Combat window scaling — build in v1, applies to both versions**
- The strip renders at a base logical size, drawn at a user-chosen **zoom: 1× / 1.5× / 2×** (extensible, in the Options popover).
- Scaling changes the *rendered* size only; the simulation's logical units never change. One `uiScale` value in `uiSlice` drives a Pixi stage scale + canvas CSS size.
- Pixel-art stays crisp at every zoom: `image-rendering: pixelated`, nearest-neighbor sampling, integer-friendly scaling. For 1.5×, render at 2× and downscale (or snap sprite positions) to avoid blur (`tune`).

**Transparency & click-through — DO NOT build in v1; introduced in v1.5 (Tauri).**
This is deliberately deferred: in a normal web app it is the riskiest tech for zero player benefit. v1 ships on an ordinary opaque page. In **v1.5** these are added together:
- **Transparent background:** transparent root/body/canvas (`backgroundAlpha: 0`); only the strip art and open panels paint pixels, revealing the real desktop behind.
- **Click-through model:** pointer events pass through everywhere the cursor is *not* over interactive game content (the strip or an open panel).
  - Maintain one source of truth, `isPointerOverInteractive`, computed from the bounding regions of the strip + open panels + HUD. (v1 can already expose this cheaply by tagging interactive surfaces; it just isn't wired to anything until v1.5.)
  - In Tauri, on pointer move, toggle the native window's `setIgnoreCursorEvents` — `true` over transparent zones, `false` over interactive regions; debounce to avoid thrash.
  - "Hover over the game" = cursor within the strip's visible bounds (optional later refinement: alpha hit-test against the strip's render texture — a stretch goal).
- **Acceptance (v1.5):** clicking empty transparent area affects the desktop behind, never the game; clicking the strip or a panel always hits the game.

> **Portability note:** because v1 keeps interactive surfaces identifiable and the render/logic split intact, adding transparency + click-through in v1.5 is additive — no rewrite of panels or simulation.

---

## 4. Core data model

### 4.1 Stats (`data/stats.ts`)

Stats are split into **two groups**. The group determines which item slots a stat can roll on:

- **Offensive stats** → roll only on `weapon`, `offhand`, `ring1`, `ring2`, `amulet` (jewelry).
- **Defensive stats** → roll only on armor: `helmet`, `chest`, `gloves`, `legs`, `boots`.

**Offensive:**
- `attackSpeed` — attacks per second (percent)
- `critChance` — % chance to crit
- `critDamage` — crit damage multiplier (percent)
- `damageIncrease` — % increase to all damage dealt
- `attackDamage` — flat attack damage
- `penetration` — % of enemy armor/resist ignored
- `lifesteal` — % of damage dealt returned as HP

**Defensive:**
- `armor` — flat physical mitigation
- `magicResist` — flat magic mitigation
- `health` — flat max HP
- `dodgeChance` — % chance to avoid a hit entirely
- `hpRegen` — HP restored per second
- `hpPerHit` — HP restored each time the hero lands a hit
- `block` — % chance to block a portion of incoming damage

```ts
export type StatGroup = 'offensive' | 'defensive';

export type OffensiveStat =
  | 'attackSpeed' | 'critChance' | 'critDamage' | 'damageIncrease'
  | 'attackDamage' | 'penetration' | 'lifesteal';

export type DefensiveStat =
  | 'armor' | 'magicResist' | 'health' | 'dodgeChance'
  | 'hpRegen' | 'hpPerHit' | 'block';

export type StatKey = OffensiveStat | DefensiveStat;

export interface StatDef {
  key: StatKey;
  label: string;
  group: StatGroup;
  kind: 'flat' | 'percent';
  /** value range per item-level point, before rarity multiplier */
  rollPerIlvl: { min: number; max: number };
}
```

> Add more stats to either list freely later — the group tag is what routes them to the right slots. Derived stats (DPS, effective HP) are **computed**, never stored.

### 4.2 Item slots (`data/itemSlots.ts`)

Exactly these slots per hero:
`helmet, chest, gloves, legs, boots, weapon, offhand, ring1, ring2, amulet`

```ts
export type SlotKey =
  | 'helmet' | 'chest' | 'gloves' | 'legs' | 'boots'
  | 'weapon' | 'offhand' | 'ring1' | 'ring2' | 'amulet';

export type SlotCategory = 'armor' | 'weapon' | 'jewelry';

export interface SlotDef {
  key: SlotKey;
  label: string;
  category: SlotCategory;
  /** the guaranteed base affix on every item of this slot */
  baseAffix: StatKey;
}
```

**Base affix (the always-present main stat) by category:**
- **Armor** (helmet/chest/gloves/legs/boots) → `armor`. Defensive substats only.
- **Weapon** → `attackDamage`. Offensive substats only.
- **Jewelry** (offhand/ring1/ring2/amulet) → no base affix at T0 (jewelry doesn't exist at T0; see tiers). From T1 up, offensive substats only. Offhand counts as jewelry for stat-group purposes.

> Routing rule: armor draws additional stats from the **defensive** pool; weapon and jewelry draw from the **offensive** pool. This is enforced by `category`, not per-slot lists.

### 4.3 Item tiers (`data/tiers.ts`)

**One single system: tiers T0–T8.** Tier *is* rarity — there is no separate axis. Each tier has a name, a color, a fixed number of extra stats and gem sockets, and a stat multiplier.

| Tier | Name (ES) | Name (EN) | Color (tune) | Extra stats | Gem sockets | statMult (tune) |
|---|---|---|---|---|---|---|
| T0 | Normal | Normal | grey | 0 | 0 | ×1.0 |
| T1 | Poco común | Uncommon | green | 1 | 0 | ×1.15 |
| T2 | Raro | Rare | blue | 1 | 1 | ×1.35 |
| T3 | Épico | Epic | purple | 2 | 1 | ×1.6 |
| T4 | Legendario | Legendary | orange | 2 | 2 | ×1.9 |
| T5 | Mítico | Mythic | red | 3 | 2 | ×2.3 |
| T6 | Ancestral | Ancestral | teal | 3 | 3 | ×2.8 |
| T7 | Divino | Divine | gold | 4 | 3 | ×3.4 |
| T8 | Primordial | Primordial | rainbow/iridescent | 4 | 4 | ×4.2 |

Rules baked in:
- **Stat cap = 4 extra stats**, always. T7 and T8 share it; T8 only adds a 4th socket.
- **Jewelry (offhand/rings/amulet) does not exist at T0** — base affix needs a stat and jewelry has no T0 base; reject-and-reroll on drop.
- Base affix is always present (armor→`armor`, weapon→`attackDamage`); jewelry's base affix from T1 up is an offensive stat (`tune` which).

```ts
export type ItemTier = 0|1|2|3|4|5|6|7|8;

export interface TierDef {
  tier: ItemTier;
  name: string;          // localized display name
  color: string;         // border/text color
  extraStats: number;    // 0,1,1,2,2,3,3,4,4
  sockets: number;       // 0,0,1,1,2,2,3,3,4
  statMultiplier: number;
  dropWeight: number;    // base; stage bias shifts toward higher tiers
}
```

### 4.4 Item instance

An item is generated, then frozen except for its gem sockets (gems can be added/removed later).

```ts
export interface SocketState {
  gem: GemKey | null;   // empty until socketed
}

export interface ItemInstance {
  id: string;            // uuid
  slot: SlotKey;
  category: SlotCategory;
  tier: ItemTier;        // tier IS rarity; drives extraStats + sockets
  ilvl: number;          // discrete: 1,5,10,15,20,...
  baseAffix: { key: StatKey; value: number };       // always present
  stats: { key: StatKey; value: number }[];          // length = tierDef.extraStats (≤4)
  sockets: SocketState[];                             // length = tierDef.sockets (≤4)

  /** ── "Birth certificate" — the inputs that fully determine this item. ──
   *  The loot generator is deterministic: generate(origin) === this item, byte-for-byte.
   *  These fields let the server REGENERATE the item from scratch and reject any item
   *  whose claimed stats don't match what its seed produces (§12.12). Present from day one;
   *  unused until the online phase, but every prototype item must populate them correctly. */
  origin: {
    rollSeed: number;        // the seed consumed to roll this item (client-local in option B)
    stageIndex: number;      // global stage where the source chest was earned (plausibility check)
    chestType: ChestType;    // which chest produced it (affects tierBias)
    generatorVersion: number;// loot-rules version; server regenerates with the MATCHING version
  };

  /** Account-bound = untradeable. Set true the moment the item is modified
   *  (gem socketed, or future blacksmith/synthesis). Pristine items stay false
   *  and remain tradeable on the Auction House (§12.4). A modified item no longer
   *  matches its origin, which is fine — bound items are never verified or listed. */
  bound: boolean;
  // future-proofing (unused in proto, present in schema):
  enchantLevel?: number;
  locked?: boolean;        // player "favorite/lock" to prevent accidental salvage (not the same as bound)
}
```

### 4.5 Gems (`data/gems.ts`)

Gems are socketed into items. **Each gem type grants a different stat depending on the category of the item it's socketed into** (armor / weapon / jewelry). Gems are a 3-column matrix:

```ts
export type GemKey = 'sapphire' | 'ruby' | 'emerald' | 'topaz' | 'amethyst' | 'diamond'; // tune set

export interface GemDef {
  key: GemKey;
  name: string;
  color: string;
  /** stat granted per socket context */
  grants: Record<SlotCategory, { key: StatKey; value: number }>;
}
```

Example matrix to encode (`tune` values, keep stat-group rules: armor→defensive, weapon/jewelry→offensive):

| Gem | in Armor | in Weapon | in Jewelry |
|---|---|---|---|
| Ruby | health | attackDamage | critDamage |
| Sapphire | armor | penetration | attackSpeed |
| Emerald | dodgeChance | lifesteal | critChance |
| Topaz | magicResist | damageIncrease | damageIncrease |
| Amethyst | hpRegen | critChance | penetration |
| Diamond | block | critDamage | attackSpeed |

> A gem socketed in armor must grant a **defensive** stat; in weapon/jewelry an **offensive** stat. The matrix above respects this — keep it so when tuning.
> **Socketing a gem sets `item.bound = true`** (the item becomes account-bound and can never be sold/traded — see §12.4). Surface this in the socketing UI with a clear "this will bind the item" confirmation.

### 4.6 Loot generation rule (`sim/loot.ts`)

This is the heart of progression. **Loot does not drop directly from enemies — it comes from opening chests** (see §4.8). When a chest is opened, for each item it yields:

1. **ilvl** = derived from the stage where the chest was earned, snapped to step 5 (`baseIlvlForStage(S)`). Higher stages → higher ilvl bands.
2. **tier (T0–T8)** = weighted random over `TierDef.dropWeight`, with `tierBias(S, chestType)` shifting weight toward higher tiers at higher stages and for better chest types (boss/zone chests roll higher than normal chests).
3. **slot** = uniform over `SlotKey`. **Reject-and-reroll if slot is jewelry and tier is T0** (jewelry doesn't exist at T0).
4. **baseAffix** = `slotDef.baseAffix`, value = `rollPerIlvl × ilvl × tier.statMultiplier`.
5. **stats** = pick `tierDef.extraStats` distinct keys from the correct pool (armor→defensive, weapon/jewelry→offensive), rolled and scaled the same way. No duplicate stat keys, **never more than 4**.
6. **sockets** = `tierDef.sockets` empty `SocketState`s (gems added by the player later).
7. All randomness draws from a seeded RNG: `(chestId, openSeed)` always yields the same result.

**Determinism contract (this is what makes anti-cheat work — §12.12):**
The generator MUST be a pure, deterministic function `generateItem(origin) → ItemInstance`, where `origin = { rollSeed, stageIndex, chestType, generatorVersion }`. The same `origin` must produce a **byte-for-byte identical** item every time, on any machine.
- **Same RNG everywhere:** use one explicit, portable PRNG (e.g. mulberry32) seeded only from `origin` — never `Math.random()`, never time, never floating-point that varies across engines (prefer integer math; if floats are used, round stats to fixed precision so client and server agree exactly).
- **Versioned rules:** the loot tables / scaling constants are tagged with `generatorVersion`. Each version's code path is kept (or reconstructable) so an old item is always regenerated under the rules it was born with. **Never mutate an existing version's numbers — bump the version instead**, or you'd retroactively invalidate legitimately-owned items.
- **No React/Pixi imports** (already required): `sim/loot.ts` runs identically in the browser and in Node on the server.
- A seed is **per-item**, generated locally by the client's RNG at open time (option B — no server pre-issued seeds; a player can open thousands of chests offline without contacting the server). The seed is stored in `item.origin.rollSeed`.

> **Mandatory unit tests:**
> - *Item rolls T3 (Épico), weapon, ilvl 20* → baseAffix = attackDamage, **2 offensive stats** + **1 empty socket**, no defensive stat present.
> - *Item rolls T8 (Primordial), chest armor, ilvl 30* → baseAffix = armor, **4 defensive stats** (cap), **4 empty sockets**.
> - *No jewelry item ever rolls at T0.*
> - Socketing a Ruby into armor grants `health`; the same Ruby in a weapon grants `attackDamage`.
> - Boss/zone chests have measurably higher mean tier than normal chests at the same stage.
> - **Determinism:** `generateItem(origin)` called twice with identical `origin` returns deep-equal items. (This test is the foundation of §12.12 — if it ever fails, listing verification breaks.)

### 4.8 Chests & loot acquisition (`sim/chests.ts`)

**How combat yields loot — the stage loop:**

- Each stage `W-S` (e.g. `1-1`) has an enemy spawn. As the party kills normal enemies, a **stage progress bar** fills.
- When the bar is full, the **stage boss** spawns. Defeating it auto-advances the party to the next stage (`1-1 → 1-2 → … → 1-9`).
- **`W-10` (zone boss) is gated:** it's only accessible with a **Zone Key**, a random drop from chests. Without a key, progression caps at `W-9` (party keeps farming `W-9` until a key drops). Defeating the zone boss advances to the next world (`1-10 → 2-1`).

**Three chest types, each from a different source:**

| Chest type | Source | Drop chance |
|---|---|---|
| `normal` | killing any normal enemy | base % per kill (tune, low) |
| `stageBoss` | killing a mini-stage boss (`1-1`…`1-9`) | base % per boss kill (tune, higher) |
| `zoneBoss` | killing a zone boss (`W-10`) | **100% guaranteed** |

Chest drop chances are improved by tech-tree nodes (`chestDropMult`). Zone Keys drop from chests (any type, low chance; `tune`).

**Chest storage — capacity is a hard cap with per-type limits:**

- The player has a **maximum number of unopened chests** per type. Defaults (`tune`):
  - `normal`: 6
  - `stageBoss`: 4
  - `zoneBoss`: 4
- **When a type's storage is full, that type stops accumulating** — further chests of that type are *not* awarded (no overflow, no loss-beyond-cap; the kill just yields no chest). This is the pressure that makes the player come back to open.
- Caps are raised by tech-tree nodes (`chestStorage` per type).

**Opening chests:**
- Player clicks **Open** on a chest → it rolls its loot (items via §4.6, possibly a Zone Key, possibly a pet via §4.9) and frees the storage slot.
- **Auto-open tech node:** an unlockable ability auto-clicks Open on all chests every **10 minutes**. The interval is reduced by further tech nodes (`autoOpenInterval`). Until unlocked, opening is fully manual.

```ts
export type ChestType = 'normal' | 'stageBoss' | 'zoneBoss';

export interface ChestStack {
  type: ChestType;
  count: number;        // unopened, ≤ capacity[type]
}

export interface ChestDropConfig {
  baseDropChance: Record<ChestType, number>;   // before tech mult
  capacity: Record<ChestType, number>;          // before tech bonus
  itemsPerChest: Record<ChestType, number>;     // how many items rolled on open
  zoneKeyChance: Record<ChestType, number>;
}
```

### 4.7 Classes (`data/classes.ts`)

5 classes, all unlockable **by spending gold — cheap, never a progression blocker**. Start with 1 unlocked (free). The real gate on party size is the **slot unlocks in the tech tree** (§6), which take longer; buying the class itself is fast.

```ts
export interface ClassDef {
  key: string;             // 'priest' | 'warrior' | 'mage' | 'rogue' | 'ranger' (tune)
  name: string;
  role: 'tank' | 'dps' | 'healer' | 'support';
  baseStats: Partial<Record<StatKey, number>>;
  statGrowthPerLevel: Partial<Record<StatKey, number>>;
  unlock: { type: 'free' } | { type: 'gold'; cost: number }; // cost is small
}
```
Party = max 3 heroes. You can own all 5 classes but field at most 3 at once. Party **slots** (how many you can field) are unlocked via the tech tree, not by gold.

### 4.9 Pets (`data/pets.ts`)

Pets are an **extremely rare** drop from killing normal enemies and bosses (not from chests — direct kill drop, `tune` a very low chance; bosses slightly higher than normal enemies). They are a long-tail collection goal.

**Key design rules:**
- Every pet the player **owns** grants its **passive bonus permanently and simultaneously** — owning stacks all owned pets' bonuses at once.
- The **selected** pet is **purely cosmetic** (which one walks with the party on the strip). Selection changes nothing mechanically.
- Pet bonuses are **economy/utility only — never combat stats.** Allowed: XP gain, gold gain, chest drop rate, chest storage, Zone Key chance, auto-open interval. **Forbidden:** any offensive/defensive combat stat.
- **Drop rate is tuned so a player in their first month obtains ~1–2 pets total**, no more. This is a marquee rare reward, not a steady drip.

```ts
export type PetBonus =
  | { kind: 'xpMult';        value: number }
  | { kind: 'goldMult';      value: number }
  | { kind: 'chestDropMult'; value: number }
  | { kind: 'chestStorage';  type: ChestType; value: number }
  | { kind: 'zoneKeyMult';   value: number }
  | { kind: 'autoOpenReduce'; value: number }; // never a combat stat

export interface PetDef {
  key: string;
  name: string;
  sprite: string;
  dropSource: 'enemy' | 'boss' | 'both';
  baseDropChance: number;   // extremely low
  bonus: PetBonus;
}
```
> Pet bonuses feed the same aggregation path as tech bonuses (economy multipliers), so `sim/` reads a single merged bonus object — it never distinguishes pet vs tech source.

### 4.10 Effects, buffs & debuffs (`data/effects.ts`, `sim/effects.ts`) — modular by design

**Core principle: abilities don't mutate combat directly — they apply declarative *effects*.** An ability is data that says "apply effect X to target Y for Z seconds." The combat engine processes a generic list of active effects every tick. **Adding a new ability or status = writing data, never editing the combat loop.** This is the extensibility requirement you asked for.

An **effect** is a timed, stackable modifier attached to a combatant (hero or enemy). The engine maintains, per combatant, a list of `ActiveEffect`s and recomputes derived stats from `base stats + equipment + talents + active effects` each tick.

```ts
export type EffectKind =
  // stat modifiers (the common case — Fuego Rápido lives here)
  | { type: 'statMod'; stat: StatKey; mode: 'flat' | 'percent'; value: number }
  // control / status
  | { type: 'stun' }                       // cannot attack
  | { type: 'silence' }                    // cannot cast abilities
  | { type: 'root' }                       // cannot advance (positioning, future)
  // damage-over-time / heal-over-time
  | { type: 'dot'; damagePerTick: number; element?: string }
  | { type: 'hot'; healPerTick: number }
  // tags other effects/abilities can react to (e.g. "execute if target is 'burning'")
  | { type: 'tag'; tag: string };

export interface EffectDef {
  key: string;                  // 'buff_fast_fire', 'debuff_stun', ...
  name: string;
  icon: string;
  kind: EffectKind;
  durationMs: number;           // 0 = instant/one-shot; >0 = timed
  maxStacks: number;            // 1 = refresh-only; >1 = stacks additively
  stackRule: 'refresh' | 'extend' | 'independent'; // how re-application behaves
  beneficial: boolean;          // buff (true) vs debuff (false) — for UI tint
}

export interface ActiveEffect {
  defKey: string;
  sourceId: string;             // who applied it
  remainingMs: number;
  stacks: number;
}
```

**How the engine consumes effects (`sim/effects.ts` + `sim/combat.ts`):**
- Each tick, decrement `remainingMs`, drop expired effects, then compute each combatant's **effective stats**: `effective = aggregate(base, equipment, talentPassives, Σ active statMod effects)`.
- `stun`/`silence` are checked as gates before an attack/cast resolves. `dot`/`hot` apply their per-tick delta. `tag`s are queryable by other effects (enables synergies later without engine changes).
- Deterministic: effect application, stacking, and expiry are pure functions of game state + the seeded RNG, so combat stays reproducible (required by §5, §12.12).

### 4.11 Abilities (`data/abilities.ts`)

An **ability** is owned by a class/hero, has a cooldown, and on activation applies one or more `EffectDef`s to targets. The auto-battle AI casts an ability whenever it's off cooldown and its (simple) condition holds — no manual input in an idle game.

```ts
export interface AbilityDef {
  key: string;                  // 'ranger_fast_fire'
  name: string;                 // 'Fuego Rápido'
  icon: string;
  cooldownMs: number;           // e.g. 15000
  target: 'self' | 'lowestAllyHp' | 'frontEnemy' | 'allEnemies' | 'allAllies';
  applies: { effectKey: string; durationMsOverride?: number }[]; // effects to apply
  castCondition?: 'always' | 'enemyPresent' | 'allyBelowHpPct'; // when AI fires it
  // scaling with ability rank from the talent tree (see §4.12):
  rankScaling?: { perRank: Partial<{ value: number; durationMs: number; cooldownMs: number }> };
}
```

> **Worked example — Fuego Rápido (Ranger):**
> ```
> EffectDef  buff_fast_fire: { kind: statMod attackSpeed +50% percent, durationMs 8000, maxStacks 1, stackRule 'refresh', beneficial true }
> AbilityDef ranger_fast_fire: { cooldownMs 15000, target 'self', applies [{ effectKey: 'buff_fast_fire' }], castCondition 'enemyPresent' }
> ```
> The combat engine needs **zero new code** for this — it already sums `statMod` effects. A stun ability is just an `AbilityDef` applying a `{type:'stun'}` `EffectDef`. This is the modularity you asked for.

**Mandatory tests:** applying Fuego Rápido raises the hero's effective attack speed by 50% for exactly 8s then reverts; a stun effect blocks attacks for its duration; two stacking debuffs stack per their `stackRule`; effect resolution is deterministic under a fixed seed.

### 4.12 Per-hero talent tree (`data/talents.ts`)

Separate from the global tech tree (§6). **Each hero has its own talent tree**, advancing with that hero's level.

**Structure:**
- Each hero gains **1 talent point per level**.
- The tree is organized in **lines (tiers)**; **a new line unlocks every 10 points spent** (line 1 from the start, line 2 at 10 spent, line 3 at 20, …).
- **Each line has exactly 3 nodes: 2 passives + 1 ability.** Passives are typically `0/5` (5 ranks), the ability typically `0/5` ranks that scale it via `AbilityDef.rankScaling`.
- Example line 1 (per your spec): `Vida 0/5` (passive: +health), `Daño 0/5` (passive: +attackDamage), `Habilidad básica 0/5` (the class's basic active ability, ranks scale it).

```ts
export interface TalentNode {
  key: string;
  lineIndex: number;            // 0-based; line N unlocks at N*10 points spent
  kind: 'passive' | 'ability';
  name: string;                 // 'Vida', 'Daño', 'Habilidad básica'
  maxRank: number;              // typically 5
  // passive: a permanent statMod folded into the hero's aggregate stats
  passive?: { stat: StatKey; mode: 'flat' | 'percent'; valuePerRank: number };
  // ability: which AbilityDef this node grants/scales
  abilityKey?: string;
}

export interface ClassTalentTree {
  classKey: string;
  lines: TalentNode[][];        // lines[0] = [Vida, Daño, HabilidadBásica], ...
}
```

**Rules:**
- Spending a point raises a node's rank (≤ `maxRank`), gated by line unlock (enough total points spent to have reached that line).
- **Passive ranks** feed the same stat aggregation as equipment/effects (they're permanent `statMod`s). **Ability nodes** unlock/scale an `AbilityDef` the combat AI then casts.
- Respec: allow a gold-cost or free respec (`tune`).
- Per-hero talent state lives in `HeroState.talents` (see save schema).

---

## 5. Simulation (`sim/`)

### 5.1 Loop
- Fixed timestep, e.g. 100ms logical ticks. Render interpolates between ticks.
- `Simulation.tick()` advances: party movement, encounter spawning, combat resolution, loot drops, stage progression.
- The loop runs whether panels are open or not.

### 5.2 Combat (`combat.ts`)
- Auto-battle, **server-authoritative-ready** (pure function of state + RNG).
- Party advances right until it meets an enemy group → stop, fight, resolve via DPS/HP exchange tick by tick → on clear, resume advancing.
- **Each tick, before resolving attacks:** update active effects (§4.10) — decrement durations, expire, apply DoT/HoT — then compute every combatant's **effective stats** = `aggregate(base, equipment, talent passives, active statMod effects)`. Gates: a `stun`ned unit skips its attack, a `silence`d unit skips ability casts.
- Heroes attack on their (effective) `attackSpeed` cadence. Damage = (effective) `attackDamage` mitigated by enemy `armor`, with crit roll. Healer class heals lowest-HP ally.
- **Ability casting (AI):** each hero casts any off-cooldown `AbilityDef` whose `castCondition` holds (idle game → no manual input). Casting applies the ability's `EffectDef`s to the resolved target(s). Fuego Rápido = self-buff +50% attack speed 8s, 15s cooldown — handled entirely by the generic effect path.
- Hero death: on party wipe, retreat one stage and resume (penalty in `stageScaling.ts`). No permadeath.
- All of the above is deterministic under the seeded RNG (required by §5.5 / §12.12).

### 5.3 Stages (`stages.ts`)
- Format `W-S` (world-stage): `1-1 … 1-10, 2-1 … 2-10, …`. Infinite worlds.
- **Within a stage `W-S` (S = 1..9):** a continuous enemy spawn. Each normal kill fills a **stage progress bar**. When the bar is full, the **stage boss** spawns. Defeating the stage boss **auto-advances** to `W-(S+1)`.
- **`W-10` (zone boss) is key-gated:** reaching `W-9` cleared does *not* auto-advance to `W-10`. The party keeps farming `W-9` until the player has a **Zone Key** (random chest drop). With a key, the player enters `W-10`; defeating the zone boss consumes the key and advances to `(W+1)-1`.
- Enemy stats scale via a smooth curve `f(globalStageIndex)` (exponential-ish, in `stageScaling.ts`). Bosses are tougher capstones; zone bosses tougher still. Gold, research points, ilvl bands and `tierBias` all scale with the global stage index.

### 5.4 Offline progress (`offline.ts`)
- On load, compute elapsed real time since last save, simulate forward at a capped rate (e.g. up to X hours) at the party's sustainable stage. Award gold + XP + **chests accrued (respecting per-type storage caps)** + a summary. Yield scales with current stage and with merged `offlineMult` (tech + pets): `yield = base(elapsed, stage) × (1 + Σ offlineMult)`. Chests accrue up to caps only — overflow is lost, matching online behavior. Sample statistically but deterministically from the seed. Show a "while you were away" summary (gold, XP, chests waiting to open, any rare pet drop).

---

## 6. Progression: the Tech Tree (`data/techTree.ts`, `progressSlice`)

The **tech tree** is the primary meta-progression system (it replaces the per-hero skill tree from the reference as the proto's core; a per-hero skill tree can come later). Nodes are purchased with a tech currency — **research points earned from kills/stage clears** (define `researchPerKill(S)` in `stageScaling.ts`; gold stays separate, used for class unlocks and gem/market later).

### 6.1 Node model
```ts
export type TechEffect =
  | { kind: 'goldDropMult';   value: number }      // +% gold
  | { kind: 'xpDropMult';     value: number }      // +% XP
  | { kind: 'chestDropMult';  value: number }      // +% chest drop rate
  | { kind: 'chestStorage';   type: ChestType; value: number } // +N storage cap for a chest type
  | { kind: 'unlockAutoOpen' }                     // unlock auto-open ability (every 10 min)
  | { kind: 'autoOpenReduce'; value: number }      // -seconds off auto-open interval
  | { kind: 'zoneKeyMult';    value: number }      // +% Zone Key drop chance
  | { kind: 'combatStat';     stat: StatKey; value: number; mode: 'flat'|'percent' }
  | { kind: 'offlineMult';    value: number }      // +% offline gold/xp generation
  | { kind: 'inventorySlots'; value: number }      // +N inventory slots
  | { kind: 'partySlot';      slot: 2|3 }          // unlock fielding a 2nd / 3rd hero
  | { kind: 'gemDropMult';    value: number };     // +% gem drop from chests

export interface TechNode {
  key: string;
  name: string;
  description: string;
  cost: number;                 // research points
  effects: TechEffect[];
  requires: string[];           // prerequisite node keys (DAG)
  maxRanks: number;             // 1 for unlocks, >1 for stackable bonuses
}
```

### 6.2 Categories the tree must cover (per your design)
- **Economy:** more gold drop, more XP drop, more chest drop rate, more gem drop, higher Zone Key chance.
- **Chests:** raise per-type storage caps (`normal`/`stageBoss`/`zoneBoss`), unlock the **auto-open ability** (opens all chests every 10 min), and reduce the auto-open interval.
- **Combat:** flat/percent bonuses to party combat stats (offensive/defensive stat keys).
- **Offline:** higher offline generation multiplier. Offline yield = `f(elapsedTime, currentStage, Σ offlineMult)` — see §5.4.
- **Slots:** unlock inventory slots (stackable), unlock **party slot 2** and **party slot 3** (single-rank, deeper/more expensive — the *real* gate on party size).

### 6.3 Aggregation
A pure selector `getBonuses(purchasedNodes, ownedPets)` returns a single merged bonus object combining **tech nodes and owned pets** (both feed economy/utility multipliers). Consumed by `sim/` (gold/xp/chest-drop/zone-key mult, combat stat deltas, offline mult, auto-open interval) and by `state/` (inventory slot count, party slot count, per-type chest capacity). The simulation reads the merged bonuses; it never reads the tree or pet list directly.

### 6.4 Other progression
- **Hero levels:** EXP from kills, steep curve (reference: Lv36 ≈ 23.8M EXP).
- **Class unlocks:** cheap gold purchases (§4.7).
- **Party slots:** via tech tree `partySlot` nodes only.
- **Inventory size:** base N slots + tech `inventorySlots` nodes.
- **Chest capacity / auto-open:** base config (§4.8) + tech + pets.


---

## 7. UI panels (React)

All panels use `PixelWindow` (draggable, ornate frame, close X). Pixel-art aesthetic per the reference: dark ornate borders, deep-red title bars with a centered all-caps label, parchment/slate insets, tier-colored item frames, gold-accent icons.

### 7.0 UI design notes (from the reference — guidance for the agent)
The inspiration screenshot is a **narrow vertical column** docked to a screen side, game at the base. Replicate this *information architecture* regardless of dock orientation:
- **Title bar:** ornate frame, big centered title (`HERO`, `STATUS`, `CUBE`…), with small action icons (settings gear, collapse) and a prominent **X** to close. Every window closes independently.
- **Top of HERO:** a class selector with left/right arrows to cycle the selected hero (`‹ Sorcerer ›`), the hero portrait with level beneath (`Lv.35`), surrounded by the **equipment slots**. Locked slots show a small padlock overlay (matches the reference's locked weapon/offhand).
- **Equipment slot ring (10 slots):** arranged around the portrait — weapon/offhand on one side, armor (helmet/chest/gloves/legs/boots) and jewelry (2 rings/amulet) filling the frame. Each slot tints by the equipped item's tier color; empty slots are muted.
- **Inventory vs Formation tabs:** a two-tab strip (`Inventory` / `Formation`) switching the lower region between the item grid and the party-formation editor.
- **Item grid:** dense square cells, tier-colored borders, small red "unequipped/locked" markers like the reference. Hover → tooltip with comparison delta.
- **Bottom icon bar (the launcher):** a row of round ornate buttons that open each window — in the reference: chest (inventory/chests), cross (skills/status), formation, cube (synthesis), portal (zone/teleport). This bar lives on the strip's edge and is the primary way to summon windows.
- **Top status line:** gold with coin icon, plus quick system icons (mail, settings, close-app). Keep the gold counter always visible on the strip HUD.
- **Compactness is the aesthetic:** tight padding, small fonts, everything legible at the small default size and crisper when zoomed.

### 7.1 StripHud (always visible)
Tiny row docked on the strip: stage label (`W-S`), **stage progress bar** (fills toward boss spawn), the **bottom icon bar** (toggles each window), gold counter, research-point counter, a small **Options** button (zoom 1×/1.5×/2×, dock orientation), and a **chest tray** showing unopened counts per type (e.g. `📦×6 / 👑×4 / 🗝️×2`) with an **Open** action. The selected cosmetic pet walks on the strip. This is the only permanent UI.

### 7.1b OptionsPopover
Small popover from the Options button: **render zoom** selector (1× / 1.5× / 2×, extensible), **dock orientation** (bottom / left / right), and a placeholder for audio. Changes apply live and persist in the save (`uiScale`, `dockOrientation`).

### 7.2 StatusPanel
Selected hero: class, level, EXP bar, computed stats (DPS, attack damage, HP, attack speed, armor, crit, etc., split visually into offensive / defensive groups), and a compact view of active buffs/debuffs and ability cooldowns. The full talent tree is its own panel (§7.2c).

### 7.2c TalentPanel (per-hero)
The selected hero's talent tree (§4.12): vertical **lines**, each with **2 passives + 1 ability**, a line unlocking every 10 points spent. Each node shows rank `n/max` (e.g. `Vida 0/5`, `Daño 0/5`, `Habilidad básica 0/5`), with locked lines greyed until enough points are spent. Clicking a node spends a talent point (1 earned per hero level). Shows remaining talent points and a respec button (`tune` cost). This is the per-hero counterpart to the global TechTreePanel.

### 7.2b TechTreePanel
The global tech tree as a node graph (DAG) inside a `PixelWindow`. Nodes show name, cost in research points, current/max rank, and lock state (greyed if prerequisites unmet). Clicking an affordable, unlocked node purchases a rank. Categories visually grouped: Economy / Chests / Combat / Offline / Slots. Shows current research-point balance. (Distinct from the per-hero TalentPanel — this one is account-wide.)

### 7.3 HeroPanel
- Class selector at top (`‹ ClassName ›`) cycling the selected hero; portrait + `Lv.N` below it.
- Party roster row (up to 3 active; locked slots shown with padlock until their tech `partySlot` node is bought).
- The **10 equipment slots** laid out around the portrait (weapon, offhand, helmet, chest, gloves, legs, boots, ring1, ring2, amulet), each tinted by equipped tier.
- `Inventory` / `Formation` tabs below.
- Click a slot → filters the inventory to that slot. Drag-equip or click-equip.

### 7.4 InventoryPanel
- Grid of `ItemInstance`s, each rendered with **tier-colored** border (T0 Normal → T8 Primordial).
- Hover → `ItemTooltip`: name, tier (colored, e.g. "Épico (T3)"), ilvl, base affix, the extra stats, gem sockets (filled gems shown with the stat they grant in *this* item's category), and **comparison delta** vs currently equipped on selected hero.
- Filter by slot, sort by tier/ilvl.
- Inventory is bounded by current slot count (base + tech `inventorySlots`); full inventory blocks new items from chests (or auto-salvages lowest — `tune`).
- Gem socketing UI: click an empty socket → choose an owned gem to slot it. **Socketing binds the item** (`bound=true`, untradeable) — show a confirmation. Bound items display a small "bound" marker (relevant once the AH exists).

### 7.4b ChestPanel
- Shows unopened chests grouped by type with per-type count vs capacity (e.g. `Normal 6/6`, `Stage Boss 3/4`, `Zone Boss 1/4`).
- **Open** (single) and **Open All** actions; opening rolls loot via §4.6, may yield items, a Zone Key, or rarely a pet.
- Surfaces the **auto-open** state if unlocked: countdown to next auto-open and current interval. If not unlocked, shows it as a locked tech perk.
- Opening animation/result list is juice; the reward resolution is deterministic from `(chestId, openSeed)`.

### 7.5 PetsPanel
- Collection grid of all `PetDef`s: owned ones shown in color with their permanent bonus; unowned shown as silhouettes (bonus hidden or hinted).
- Player selects one owned pet as the **cosmetic companion** on the strip (mechanically irrelevant — all owned bonuses are always active).
- Shows the summed active economy bonuses from owned pets.

### 7.6 CubePanel (stub)
Render the panel shell (Synthesis dropdown, 9-slot grid, "Synthesize 9 items of the same grade into one of a higher grade", Auto Fill button) but **logic is disabled in proto** with a "Coming soon" state. Schema for synthesis already in save.

---

## 8. Persistence (`saveSchema.ts`)

Versioned save. Include now (even if some unused):

```ts
export interface SaveV1 {
  version: 1;
  seed: number;
  lastSavedAt: number;        // epoch ms, for offline calc
  progress: { globalStageIndex: number; world: number; stage: number; };
  gold: number;
  researchPoints: number;     // tech-tree currency
  unlockedClasses: string[];
  partySlots: (string | null)[];      // length 3, references roster hero ids; slots 2/3 gated by tech
  roster: HeroState[];
  inventory: ItemInstance[];
  inventoryGems: { gem: GemKey; count: number }[]; // un-socketed gems owned
  techTree: Record<string, number>;  // nodeKey -> purchased ranks
  chests: { type: ChestType; count: number }[];    // unopened, each ≤ derived capacity
  zoneKeys: number;                  // accessing W-10 consumes one
  autoOpen: { unlocked: boolean; lastRunAt: number | null }; // interval derived from tech+pets
  pets: { ownedKeys: string[]; selectedKey: string | null };  // selection is cosmetic only
  settings: {
    uiScale: 1 | 1.5 | 2;             // render zoom
    dockOrientation: 'bottom' | 'left' | 'right';
  };
  // future systems — present, possibly empty:
  cube: { unlocked: boolean };        // synthesis later (also binds items, §12.4)
  online: {
    accountId: string | null;         // null until the player goes online
    premiumCurrency: number;          // local cache only; server is authoritative once online
    premiumUntil: number | null;      // epoch ms of premium-status expiry (server-authoritative)
  };
}
export interface HeroState {
  id: string;
  classKey: string;
  level: number;
  exp: number;
  equipment: Partial<Record<SlotKey, ItemInstance>>;
  talentPoints: number;                 // earned 1/level, minus spent
  talents: Record<string, number>;      // talentNodeKey -> rank (drives passives + abilities)
}
```
> Derived at runtime, never stored: party-slot count, inventory-slot count, per-type chest capacity, auto-open interval (all computed from `techTree` + owned `pets` via `getBonuses`).

Autosave on a timer + on meaningful events. Migration function signature ready for later versions.

### 8.1 Where state lives, by version (authority model)

**Principle: each datum lives where its authority is.** The single-player game is offline by nature and lives locally; only inherently shared or paid data lives on the server.

- **v1 (browser):** the entire `SaveV1` in **IndexedDB**. No server. Fully offline.
- **v1.5 (Tauri/Steam):** the entire `SaveV1` in a **Tauri app-data file** (JSON, or SQLite for robustness) **plus Steam Cloud** for free cross-device sync. Still no server, still fully offline. The save format is unchanged from v1 (a storage-adapter swap, not a schema change).
- **v2 (online layer):** the game state **stays local exactly as in v1.5**. A backend (**Supabase**) is added for, and only for, the shared/paid layer:
  - Auction House (listings, escrow, transactions).
  - Gold and premium **balances** for accounts that have gone online (server-authoritative, double-entry ledger — §12.1).
  - Premium **status** (expiry).
  The single-player save never migrates to the server; only *tradeable assets* become server-tracked once an account goes online.

**Premium status must be unforgeable yet work offline.** Premium can't be a plain `premiumUntil` field in the local save — the player would edit it and grant themselves premium. Instead:
- The **server is the only authority** on whether/until-when an account has premium.
- When the client is online, the server issues a **signed premium token** (e.g. a short JWT-like blob) asserting `{ accountId, premiumUntil }`, signed with a **server-only secret**. 
- The client stores the token and **reads it offline** to enable perks — but **cannot forge or alter it**, because it lacks the signing key; any tampering breaks the signature and the client rejects it (perks off).
- This is the same trust shape as item verification: **the client may read, never fabricate.**
- The only residual exploit (rolling the system clock back to extend `premiumUntil`) is closed by **revalidating against the server on next connection**; premium is a convenience layer, so brief offline clock abuse is low-stakes and self-correcting.
- The `online.premiumUntil` field in the save is therefore a **cache of the token's claim, not the source of truth** — never trusted on its own in v2.

> In v1/v1.5 there is no premium at all (no server to authorize it). The `online` save fields exist but stay empty — present for forward-compatibility, exactly like `origin` and `bound` on items.

---

## 9. Release versions & build phases

> **Master boundary — read before planning any work.** The product ships in three versions. Each is independently shippable, and the cut lines are deliberate: the riskiest, most expensive system (online) comes last, only after the core game is proven. **Nothing below the v2 line is built until v1 is validated.** Crucially, this is a *sequencing* decision, not a re-architecture: the data model already carries every field the later versions need (`origin`, `bound`, premium fields, ledger design), so each version is "build the next phases," never "rewrite the last ones."

### Version map

| Version | Scope | Runtime | Server? |
|---|---|---|---|
| **v1** | Complete game, single-player, in the **browser** | Web (Vite dev/prod) | No |
| **v1.5** | Same game **wrapped in Tauri** for Steam | Native desktop | No |
| **v2** | Adds **Auction House + premium currency** (online) | Native + backend | Yes (Supabase) |

**Persistence by version (see §8.1 for detail):**
- **v1:** browser persistence (IndexedDB). 100% local, offline.
- **v1.5:** local file in the Tauri app-data dir (JSON or SQLite) **+ Steam Cloud** sync. Still 100% local/offline; Steam Cloud handles multi-device save sync for free.
- **v2:** game state stays local as in v1.5. A backend (Supabase) is introduced **only** for the shared/paid layer — Auction House, gold/premium balances, premium status. The single-player save never moves to the server.

---

### v1 — Complete offline game (browser)

**Phase 0 — Skeleton (web, opaque)**
Vite + React + Pixi bootstrap on a **normal opaque page** (no transparency, no click-through — those are v1.5). Strip canvas renders at the bottom with a colored placeholder party that walks right and loops. A `PanelLayer` can open/close/drag a test window. Options popover with working **1× / 1.5× / 2× zoom**. Tag interactive surfaces so a future hit-test is cheap to add, but wire nothing to click-through. ✅ when: a screenshot shows the strip with sprites moving, a draggable test window opens/closes, and zoom toggles work and persist.

**Phase 1 — Simulation core (headless)**
`sim/` with stats (offensive/defensive groups), the single T0–T8 tier model, gem matrix, **effects + abilities engine** (§4.10–4.11), stage scaling, combat, **chest drop + open + storage caps + zone-key gating**, loot generation, portable seeded RNG — **fully unit-tested, no rendering**. The loot generator is the deterministic `generateItem(origin)` contract from §4.6, and **every generated item populates `origin` (rollSeed/stageIndex/chestType/generatorVersion) and `bound=false`** (future AH verification §12.12 depends on this, even though nothing verifies it yet). Mandatory tests from §4.6, §4.8, §4.10 (tier/socket counts, no-jewelry-at-T0, gem-by-category, boss chests roll higher, storage caps stop accrual, W-10 unreachable without a key, **generator determinism**, **Fuego Rápido raises attack speed 50% for 8s then reverts**, **stun blocks attacks**, effect determinism) and a deterministic-combat test. ✅ when: `npm test` green; sim runs 100 stages with abilities firing and logs sane curves.

**Phase 2 — Render the sim**
Wire Pixi strip to sim state: heroes advance, kill enemies, **stage progress bar fills**, boss spawns, party auto-advances; damage numbers float; **active buff/debuff icons + ability cooldown pips** render over combatants; chest-earned popups; stage/gold/research tick. StripHud shows the chest tray and launcher icon bar. ✅ when: a video shows auto-battle filling the bar, abilities firing with visible buffs, a boss dying, and advancing stages.

**Phase 3 — Inventory, equipment, gems & chests**
InventoryPanel + HeroPanel + equip/unequip + gem socketing + ChestPanel (open / open-all, storage caps, zone keys) + tooltips with deltas. Opening chests yields items; equipping/socketing changes computed stats and visibly speeds clears. ✅ when: opening a boss chest produces higher-tier items and equipping them speeds clears.

**Phase 4 — Status, talents, party, classes, tech tree & pets**
StatusPanel; **TalentPanel** (per-hero tree: lines of 2 passives + 1 ability, line unlocks every 10 points, 1 point/level, ranks scale passives and abilities — §4.12); TechTreePanel (Economy/Chests/Combat/Offline/Slots); research earning; gold class unlocks; tech party/inventory/chest-storage unlocks; auto-open unlock + interval reduction; leveling/EXP; PetsPanel with rare pet drops and always-on stacked economy bonuses (selection cosmetic). ✅ when: spending talent points visibly changes a hero's combat (a ranked ability casts more strongly, passives raise stats); tech nodes buff party/economy; a pet's bonus applies regardless of selection.

**Phase 5 — Persistence & offline**
IndexedDB save/load, autosave, offline-progress summary (gold, XP, chests accrued to caps, rare pet chance). ✅ when: reload restores exact state incl. talents; returning after time shows a correct "while away" summary respecting caps and offline-mult.

**Phase 6 — Polish + Cube synthesis**
Pixel-art frames, tier colors (T0 grey → T8 iridescent), juice (hit flashes, chest-open sparkle, pet drop fanfare, ability cast flashes). Cube synthesis logic (9 same-tier items → 1 higher) — **synthesizing sets `bound=true`** (§12.4). CubePanel becomes functional (stub through Phases 1–5). ✅ when: v1 is a complete, fun, fully offline game playable in the browser end-to-end.

> **🚩 v1 SHIP LINE.** v1 is feature-complete: the entire single-player game (combat with abilities/talents, loot, chests, gear, gems, tech, pets, synthesis), no server, no transparency/click-through, no online/premium, no anti-cheat enforcement (the `origin`/`bound` data exists but nothing verifies it — correct, since there's no market). Validate the loop is fun before proceeding.

---

### v1.5 — Tauri wrap for Steam (minimal docked redesign)

**Phase 7 — Native shell, UI redesign + Steam**
Wrap the v1 build in **Tauri**: frameless, always-on-top, screen-edge dock, **transparent window** (`backgroundAlpha: 0`), **OS-level click-through via `setIgnoreCursorEvents`** driven by the `isPointerOverInteractive` hit-test (built fresh here, fed by the interactive-surface tags from Phase 0), system tray. **Redesign the panel layout/skin** from the v1 web-comfortable arrangement to the minimal, dismissible, edge-docked form — *panel logic and the simulation are untouched; this is a re-skin/re-layout only.* Swap persistence to a Tauri app-data file (JSON/SQLite) **+ Steam Cloud**. Steamworks (app ID, Cloud; achievements optional). Window-drag grip so the user repositions the dock. ✅ when: the same game runs as a native always-on-top docked app with working click-through, minimal UI, Steam Cloud saves, launching from Steam.

> **🚩 v1.5 SHIP LINE.** This is the Steam launch. Still 100% offline. No backend, no infra cost, no fraud surface.

---

### v2 — Online layer (Auction House + premium) — only after v1.5 succeeds

**Phase 8 — Backend foundation & identity**
Supabase: accounts/auth, server-authoritative gold + premium balances on an append-only **double-entry ledger** (§12.1), first-online migration of the local inventory to server-tracked ownership, progression-plausibility recording (max stage seen per account). Game state otherwise stays local. ✅ when: an account can go online, its tradeable assets are server-tracked, and balances reconcile to the ledger.

**Phase 9 — Leaderboard**
Server-validated score submission + ranking (smallest online surface; proves the trust model end-to-end). ✅ when: ranks display and implausible submissions are quarantined.

**Phase 10 — Auction House + anti-cheat**
Fixed-price gold listings with server-side **escrow**, filters/sort (incl. premium-currency filter), AH tax (gold sink), concurrency-safe purchase, and the **pre-sale verification** of §12.12 (regenerate item from `origin`, deep-compare, plausibility cross-check; reject mismatches; bound items unlistable). ✅ when: legit items list and sell; tampered/Frankenstein/implausible items are rejected server-side; no double-spend under concurrent buys.

**Phase 11 — Premium currency & status**
Premium currency as a listable AH asset (player-to-player resale for gold) **and** real-money purchase via a payment provider (webhooks, chargeback clawback) — most sensitive, most tested. Premium status delivered to the offline client as a **server-signed token** (§8.1) the client can read but not forge. Premium perks are **QoL/economy only** (§12.8). ✅ when: premium can be bought with € and resold for gold; offline clients honor a valid signed premium token and reject a tampered one; no perk grants combat power.

---

## 10. Definition of done for the prototype
A player can: watch the party auto-battle on an always-visible bottom strip with a **transparent background that lets clicks pass through everywhere except the strip and open windows**; resize the combat view between **1× / 1.5× / 2×** from an Options popover; summon and dismiss every management window (status, hero+equipment, inventory, chests, pets, tech) from a bottom icon bar, with nothing open by default; watch a stage progress bar fill toward a boss that advances them through scaling stages; farm `W-9` until a Zone Key drops to access the `W-10` zone boss; earn three chest types (normal / stage-boss / zone-boss) up to per-type storage caps that halt accrual when full; open chests (manually or via the auto-open tech) to roll T0–T8 items with ilvl-scaled stats (offensive on weapon/jewelry, defensive on armor), ≤4 stats and ≤4 gem sockets; socket gems whose effect depends on item category; spend gold on cheap class unlocks and research points on tech nodes (economy, chests, combat, offline, slot unlocks); collect extremely rare pets that grant always-on stacking economy bonuses with purely cosmetic selection; close all windows to a clean transparent strip; and return after time to restored state with an offline summary.

## 11. Testing requirements
- `sim/` has unit tests; target the loot generator, tier/socket counts, gem-by-category, chest storage caps, zone-key gating, stage scaling monotonicity, combat determinism, offline calc.
- No test may import Pixi or React.
- `platform/hitTest` has a unit test: given strip + open-panel bounds and a pointer position, `isPointerOverInteractive` returns correct true/false (this is the logic the Tauri click-through reuses).
- Every phase ends with a screenshot check for visual elements.

---

## 12. Online phase — Auction House & premium currency (FUTURE, separate build)

> **Do not build during the prototype.** This is the post-launch online layer. It is documented now so the client save schema and item model are already compatible (e.g. the `bound` flag, account identity). **Everything here is server-authoritative.** The client never decides balances, ownership, or trades — it only renders server state and sends signed requests.

### 12.0 Why this section is strict
The premium currency is purchasable with real money **and** tradeable for in-game gold between players (the EVE "PLEX" / WoW "Token" model). That makes it a **real-money-equivalent asset**. A duplication bug, a race condition, or a trusting client is not "lost game gold" — it is fraud, chargeback exposure, and potentially a regulatory problem. Hence the hard rules below.

### 12.1 Backend stack
- **API:** Hono on Fly.io. **DB:** Postgres (Neon) via Drizzle. **Auth:** Auth.js v5 (accounts, sessions).
- **Money ledger:** every balance (gold, premium currency) is the **sum of an append-only, double-entry ledger**, never a mutable `balance` column. Transfers are two balanced ledger rows inside one DB transaction. Balances may be cached/materialized for reads but the ledger is the source of truth and is immutable.
- **All mutations server-side, idempotent, transactional.** Trades, purchases, listings, and payouts run in serializable transactions with idempotency keys to survive retries without double-applying.

### 12.2 Identity & save trust boundary
- The prototype save is local (IndexedDB). For online, the **authoritative inventory/gold/premium lives on the server** for any account that has gone online. The local save becomes a cache + offline buffer that the server validates on sync.
- Server validates progression plausibility (the deterministic sim makes "could this account legitimately have this?" checkable). Implausible jumps are flagged, not trusted.

### 12.3 Leaderboard (build first, simplest online piece)
- Submit score (e.g. highest global stage, or a season metric) → server stores, ranks, returns top-N + player's rank.
- Server-side sanity bounds using the deterministic sim; suspicious submissions quarantined. Seasons optional.

### 12.4 Tradeability rule (CRITICAL — already enforced in item model)
- An item is tradeable **only if it is pristine and unmodified**. The moment a player **sockets a gem**, or (future) uses a **blacksmith / reforge / synthesis** to alter any stat, the item becomes **account-bound** (`bound = true`) and can never be listed, traded, or mailed.
- This is enforced everywhere: the client hides "sell" on bound items; the server **re-checks `bound` on every listing attempt** and rejects bound items regardless of what the client sends. (Client checks are UX; the server check is the security boundary.)
- Add `bound: boolean` to `ItemInstance` now (defaults `false`) so prototype-era items are forward-compatible. Socketing in the prototype already sets it.

### 12.5 What can be listed
Tradeable categories on the Auction House:
- Crafting materials, gems (un-socketed), weapons, armor, jewelry — **only if `bound === false`**.
- **Premium currency** — listed like any other item (a stack of N premium coins) priced in gold.

### 12.6 Auction House model
- **Fixed-price listings only** (no bidding). Seller lists `item OR currency stack` at a chosen **gold** price.
- **Filters & sort:** by category (incl. a dedicated "Premium Currency" filter), slot, tier (T0–T8), ilvl, stat presence; sort by price asc/desc, tier, ilvl, recency. Premium-currency view sorts cheapest-first by default.
- **Listing flow (server-authoritative escrow):**
  1. Seller lists → server **re-validates `bound===false`** and that the seller owns the exact item → moves the item/currency into **escrow** (removed from seller inventory atomically). No double-listing possible.
  2. Buyer purchases → in one serializable transaction: debit buyer gold (ledger), credit seller gold minus **AH tax** (`tune`, a gold sink), transfer escrowed item/currency to buyer. Idempotency key prevents double-spend on retry.
  3. Cancel/expire → escrow returns to seller.
- **Concurrency:** two buyers hitting the same listing → exactly one wins (row lock / conditional update on listing status `active → sold`); the loser gets a clean "already sold."
- **Listing slots:** a player has a max number of simultaneous active listings (`tune`); premium status raises it (§12.8).
- **Gold sinks:** listing deposit and/or sale tax to fight gold inflation (a perpetual idle-economy risk). Tunable.

### 12.7 Premium currency — two distinct flows (do not conflate)
1. **Real-money purchase (outside the AH):** player buys premium currency with € via a **payment provider** (Stripe or similar). Provider webhook → server verifies → credits premium currency to the account via ledger. Handle chargebacks (clawback path), receipts, taxes/VAT as a real storefront. This flow never touches the AH.
2. **Player-to-player resale (inside the AH):** a player lists their *already-owned* premium currency for **gold**, like any item. Another player buys it with gold. This is how a gold-rich player obtains premium without paying €, and how a €-paying player converts spend into gold. The server just moves premium-currency (ledger) ↔ gold (ledger) between two accounts. **No € is involved in this flow** — it's purely internal asset ↔ gold.

> The bridge "€ → premium → (resell for gold)" and "gold → premium → (redeem)" emerges naturally from these two flows; neither flow itself mixes real money with the gold market.

### 12.8 Premium status (what premium currency redeems for)
- Redeeming premium currency grants **30 days of Premium status**.
- Premium is **QoL + economy only — never combat power, never exclusive gear/stats.** Allowed perks (`tune`):
  - **Instant chest opening** (skip the auto-open timer entirely).
  - **More simultaneous AH listings.**
  - **+X% XP and +X% gold gain** — *moderate* (suggest +25–50%, never extreme; see honesty note below).
  - Larger chest storage caps, faster/larger offline accrual window, extra inventory tabs, cosmetic flair on the strip.
- **Explicit anti-pay-to-win boundary:** premium must NOT grant combat stats, higher item tiers, better drop *quality*, exclusive pets that give combat power, or anything that directly raises party DPS/EHP. Drop-*rate*/economy boosts are allowed; drop-*quality* gates are not.

> **Honesty note for the designer:** XP/gold boosts are technically a *soft* pay-for-advantage, because gold buys combat power via the AH. This is the accepted WoW-Token model and is fine — but it means "purely QoL" isn't strictly accurate. Keep the multipliers moderate so a paying player progresses *faster*, not *stronger-by-tier*, and the game stays competitive for non-payers.

### 12.9 Data model (server, Drizzle — sketch)
```ts
// append-only ledger — source of truth for all balances
ledger: { id, accountId, asset: 'gold'|'premium', delta: bigint, reason, refId, createdAt }
// materialized for fast reads, always reconcilable to ledger
balances: { accountId, gold: bigint, premium: bigint, updatedAt }
accounts: { id, ..., premiumUntil: timestamp | null }   // premium status expiry
listings: {
  id, sellerId, status: 'active'|'sold'|'cancelled'|'expired',
  kind: 'item'|'currency', payloadRef, // escrowed item id or currency amount
  priceGold: bigint, createdAt, soldTo?, soldAt?
}
escrow: { listingId, itemSnapshot | currencyAmount }     // held out of inventory while listed
payments: { id, accountId, provider, providerRef, eurAmount, premiumCredited, status, chargebackState }
```
- `ItemInstance` gains `bound: boolean`. Server rejects any listing where `bound === true` or seller ownership doesn't match.

### 12.10 Online build order (within Phase 9)
1. Accounts/auth + server-authoritative balances on a ledger; migrate local save to server inventory on first online.
2. Leaderboard (smallest surface, validates the trust model).
3. Auction House for normal items (escrow, fixed price, filters, tax, concurrency tests).
4. Premium currency as a listable asset (reuses AH; adds the currency filter).
5. Real-money purchase flow (payment provider, webhooks, chargeback handling) — most sensitive, do last and with the most testing.
6. Premium status perks (QoL/economy only).

### 12.11 Online testing requirements (non-negotiable)
- Ledger never goes negative; sum of ledger == materialized balance, always (property test).
- No double-spend: concurrent buys of one listing → exactly one success (race test).
- Bound items can never be listed (server-side, even with a forged client request).
- Idempotent purchases: replaying the same request never double-applies.
- Chargeback clawback path tested: reversing a € purchase correctly debits premium even if partially spent (define policy: negative balance allowed + collection, or block — `tune`).
- Premium grants no combat stat under any code path (assert perk list contains only QoL/economy effects).

### 12.12 Anti-cheat: pre-sale item verification (the core defense)

**Threat model.** The game runs fully offline except the AH. A player can therefore tamper with their local save and fabricate items with inflated or impossible stats. We **do not care** about a player cheating their own single-player progression — we **only** care that fabricated items never enter the shared market. So the entire defense lives at **one chokepoint: the moment an item is listed on the AH.**

**Why not server-side drops.** Generating loot server-side for ~100k concurrent players means millions of drops/min — expensive and pointless, since 99.99% of items are never traded. Instead we verify only at listing time: a rare event (a handful per player per day), one cheap function call each.

**Method — regenerate from origin, compare exactly.** When a player lists a (necessarily `bound === false`) item, the client sends the item **and its `origin`** (`{ rollSeed, stageIndex, chestType, generatorVersion }`). The server then:

1. Picks the loot-generator code path matching `origin.generatorVersion`.
2. Runs the **identical** `generateItem(origin)` that the client used (shared `sim/loot.ts`).
3. **Deep-compares** the regenerated item against the submitted one — tier, ilvl, base affix, every stat key and value, socket count.
4. **Exact match → legitimate**, item is escrowed and listed. **Any mismatch → reject**, item never reaches the market (and the account can be flagged).

This is strictly stronger than range-validation:
- An arco claiming **25% crit** when its seed produces 6% → mismatch → rejected (the obvious tamper).
- A "Frankenstein" item with every stat at its **legal maximum** → its seed produces normal rolls, not all-max → mismatch → rejected. Range-checking would have *passed* this; regeneration does not.

**Plausibility cross-check (cheap, layered on top).** Even before regenerating, reject obviously incoherent origins: `origin.stageIndex` must be ≤ the **max stage the server has ever recorded for this account**, and `ilvl`/`tierBias` must be consistent with that stage. This stops "Primordial ilvl 300 from stage 5" without even running the generator, and bounds what a tampered origin can claim.

**Accepted residual risk (seed fuzzing).** Because in option B the client chooses its own `rollSeed` locally, a determined cheater can brute-force seeds offline until one yields a max-roll-but-legal item, then list it (it *does* regenerate correctly). The deliberate trade-off: **fabricating *lucky* is possible; fabricating *impossible* is not.** A fuzzed item is still something a legitimate player could have rolled — it can't exceed tier/ilvl/stat-range rules, can't be bound-and-modified, and can't claim a stage the account never reached. For an abundant-loot, infinite-progression game with no unique items, that is acceptable at launch.

**Escalation path (only if fuzzing becomes a real problem).** Switch to **option A**: the server issues batches of cryptographically **signed seeds** when the player is online; the client spends them offline; at listing the server verifies the seed's signature (so the player never chose it) *and* regenerates. This eliminates fuzzing entirely. It's strictly more infrastructure (seed issuance, batch refill, signature verification) and is **not** built for launch — the data model (`origin`) already supports adding it later without touching existing items.

**Hard rules for the agent:**
- The listing endpoint regenerates and deep-compares **on the server**; the client-side check is UX only.
- Never trust client-submitted stats; the server's regenerated values are authoritative (if they match, list; if not, reject).
- Bound items skip verification entirely — they're unlistable by definition, so they never reach this path.
- Loot-table numbers are immutable per `generatorVersion`; balance changes **bump the version**, preserving the verifiability of older items.

**Online tests to add:**
- A tampered item (stat raised above its seed's output) is rejected at listing.
- An all-max "Frankenstein" item (each stat legal in isolation) is rejected because it doesn't match its seed.
- A legitimate item round-trips: generate locally → submit → server regenerates → exact match → lists.
- An item whose `origin.stageIndex` exceeds the account's recorded max progress is rejected by the plausibility check.
- Regenerating an old item under its own `generatorVersion` still matches after a newer version ships.

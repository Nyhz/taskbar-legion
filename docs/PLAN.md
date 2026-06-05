# PLAN.md — Phased Execution Plan for v1

This is the build order. **Work top-to-bottom. Do not start a phase until the previous phase's ✅
acceptance criteria are met and committed-to in `PROGRESS.md`.** Each phase lists: its goal, the SPEC
sections to (re)read, the files to build with their responsibility, the tests, and the acceptance gate.

Legend: 📄 = file to create · 🧪 = test to write · ✅ = acceptance gate (must pass to proceed).

A phase is **done** only when: code typechecks (`npm run typecheck`), lints clean (`npm run lint`),
all tests pass (`npm test`), the ✅ gate is met, and `PROGRESS.md` is updated.

> **Order rationale (SPEC §9):** Phase 1 (headless sim) before Phase 2 (render) is deliberate — the sim is
> the load-bearing wall and must be proven by tests with no rendering in the way. Don't render before the
> sim is green.

---

## Phase 0 — Skeleton (web, opaque)

**Goal:** A running app: an opaque page with a Pixi **strip** at the bottom showing a placeholder party that
walks right and loops, a React `PanelLayer` that can open/close/drag a test window, and a working Options
popover with **1× / 1.5× / 2×** zoom that persists. Tag interactive surfaces; wire nothing to click-through.

**Read:** SPEC §0, §1, §2, §3, §3b (the "build in v1" half only), §9 Phase 0. `docs/ARCHITECTURE.md`, `docs/ART.md`.

**Build:**
- 📄 `src/main.tsx` — bootstrap React into `#root`; mount `App`.
- 📄 `src/app/App.tsx` — layout: panel layer over a bottom strip container. Opaque background.
- 📄 `src/app/PanelLayer.tsx` — renders open `PixelWindow`s from `uiSlice`; handles drag.
- 📄 `src/game/GameStrip.ts` — owns the Pixi `Application` (the bottom canvas). Resize + zoom handling.
- 📄 `src/game/camera.ts` — horizontal scroll bookkeeping (stub: constant for now).
- 📄 `src/game/render/Backdrop.ts` — a simple procedural strip background (see ART.md).
- 📄 `src/state/store.ts` + `src/state/slices/uiSlice.ts` — Zustand store; `uiSlice` holds open panels,
  window positions, `uiScale`, `dockOrientation`.
- 📄 `src/ui/components/PixelWindow.tsx` — draggable framed window (web layout: large/free). Parameterize
  size/position so v1.5 can re-skin. **Tag its root as an interactive surface** (`data-interactive` /
  a `platform/surfaces` registry) — but do nothing with the tag yet.
- 📄 `src/ui/hud/StripHud.tsx` — the always-visible row (placeholder counters + Options button + icon bar stub).
- 📄 `src/ui/hud/OptionsPopover.tsx` — zoom selector (1×/1.5×/2×) + dock orientation. Applies live, persists.
- 📄 `src/ui/hud/IconBar.tsx` — the launcher row (buttons that toggle panels; most are stubs in P0).
- 📄 `src/platform/surfaces.ts` — registry of interactive bounding regions (fed by tagged surfaces). **v1
  only populates it; nothing consumes it.** (`hitTest.ts`/`clickThrough.ts`/`transparency.ts` are v1.5 — do
  NOT create them.)
- 📄 `src/styles/*.module.css` — pixel-art CSS (pixelated rendering, palette from ART.md).

**Zoom rule (SPEC §3b):** one `uiScale` value drives a Pixi stage scale + canvas CSS size. Sim logical units
never change. For 1.5×, render at 2× and downscale (or snap positions) to avoid blur.

✅ **Gate:** a screenshot shows the strip with placeholder sprites moving; a draggable test window
opens/closes; zoom toggles 1×/1.5×/2× and survives reload (persisted in `uiSlice` — even before IndexedDB,
use a temporary localStorage shim or in-memory + note it; real persistence is Phase 5).

---

## Phase 1 — Simulation core (headless, fully tested)

**Goal:** The entire `sim/` + `data/` layer, **no rendering**, unit-tested. This is the biggest, most
important phase. The loot generator is the deterministic `generateItem(origin)` contract.

**Read:** SPEC §4 (all of it), §5, §6, §9 Phase 1, §11. `docs/DATA_MODEL.md` (copy the type contracts
verbatim), **`docs/DIFFICULTY.md` (the canonical scaling model — implement these formulas, NOT SPEC §4.6's
linear example)**, `docs/AFFIXES.md` (the per-item-type stat pools), `docs/BALANCE.md` (the numbers),
`docs/TESTING.md` (the mandatory test list).

**Build — `data/` (config + types only; see DATA_MODEL.md for every interface):**
- 📄 `data/stats.ts` — `StatDef`s, offensive/defensive groups, roll bands + `kind` (drives flat/percent scaling).
- 📄 `data/itemSlots.ts` — the 10 slots, categories, `baseAffix` (jewelry = both/mixed, AFFIXES.md).
- 📄 `data/tiers.ts` — T0–T8 `TierDef`s (extraStats, sockets, statMultiplier, **baseWeight + unlockStage**).
- 📄 `data/gems.ts` — **tiered gems**: per-category ordered grant lists + `gemAffixCount`/`gemTierMult` (BALANCE).
- 📄 `data/effects.ts` — `EffectDef` library (incl. `buff_fast_fire`, a stun, a DoT…).
- 📄 `data/abilities.ts` — `AbilityDef` library per class (incl. `ranger_fast_fire`).
- 📄 `data/talents.ts` — per-class talent trees (lines of 2 passives + 1 ability).
- 📄 `data/classes.ts` — the 5 classes (baseStats, growth, gold unlock cost).
- 📄 `data/techTree.ts` — the **large** tech DAG; nodes have `ring` + **gold** `cost` (Economy/Chests/Combat/Offline/Slots).
- 📄 `data/pets.ts` — pet defs + economy-only bonuses.
- 📄 `data/chests.ts` — `ChestDropConfig` (drop chances, capacity, itemsPerChest, zoneKeyChance, gemChance).
- 📄 `data/stageScaling.ts` — `g(S)`/`Φ(S)`, enemy/gold/xp curves, `rollTier`, `ilvl`, `goldCost(ring,rank)` (DIFFICULTY.md).
- 📄 `data/lootTables.ts` — any remaining loot constants; `generatorVersion`; the `RARITY` knob.

**Build — `sim/` (pure logic):**
- 📄 `sim/rng.ts` — mulberry32 seeded RNG, serializable state. The ONLY randomness source.
- 📄 `sim/num.ts` — the numeric seam (DIFFICULTY.md §10): `pow/mul/add/cmp/format` helpers + the big-number
  formatter (`1.2K/3.4M/…/1.2e45`). Route all `Φ`-derived quantities through it so a big-number type can be
  dropped in later. `Φ(S)` + `g(S)` live in `data/stageScaling.ts`; this is the arithmetic/format layer.
- 📄 `sim/stats.ts` — `aggregate(base, equipment, talentPassives, activeStatMods)` → effective stats.
- 📄 `sim/loot.ts` — `generateItem(origin): ItemInstance` + `rollTier(S, chestFactor, rng)` (stage-gated,
  rare — DIFFICULTY.md §13), deterministic (the §4.6 contract).
- 📄 `sim/gems.ts` — `generateGem(origin)` (tiered) + `gemGrants(gem, itemCategory)` (the category-routed,
  tier-scaled grant computation).
- 📄 `sim/effects.ts` — active-effect processing (tick, expire, stack rules, DoT/HoT, gates).
- 📄 `sim/abilities.ts` — cooldown tracking + AI cast logic (apply EffectDefs to targets).
- 📄 `sim/combat.ts` — auto-battle resolution per tick (attack cadence, mitigation, crit, heal, death).
- 📄 `sim/stages.ts` — stage scaling, progress bar, boss spawn, zone-key gating, advancement.
- 📄 `sim/chests.ts` — chest accrual (per-type caps halt accrual), opening → loot/keys/pets.
- 📄 `sim/pets.ts` — rare pet drop rolls on kills.
- 📄 `sim/bonuses.ts` — `getBonuses(purchasedNodes, ownedPets)` → one merged bonus object.
- 📄 `sim/offline.ts` — catch-up calc (capped, deterministic, respects caps + offlineMult).
- 📄 `sim/Simulation.ts` — fixed-timestep loop owning world state; `tick()` advances everything.
- 📄 `sim/world.ts` (if helpful) — the `WorldState` shape the Simulation owns.

**Tests (🧪 — see TESTING.md for the full mandatory list):** tier/socket counts per tier; no-jewelry-at-T0;
gem-by-category (Ruby→health in armor, →attackDamage in weapon); boss chests roll measurably higher mean tier;
storage caps stop accrual; W-10 unreachable without a key; **generator determinism (deep-equal twice)**;
Fuego Rápido raises attack speed +50% for 8s then reverts; stun blocks attacks; stacking debuffs stack per
`stackRule`; deterministic combat (same seed ⇒ same outcome); stage scaling monotonic; offline calc sane.

✅ **Gate:** `npm test` green (incl. the **four progression invariants** from DIFFICULTY.md §11); the smoke
harness (`scripts/sim-smoke.ts`) runs ≥300 stages with abilities firing and logs sane curves (HP, gold,
research, tier distribution, per-stage clear times) **and reports the measured gear-check buffer `B`**.
Constants are co-tuned until all four invariants hold (record measured B + early/late clear times in
PROGRESS.md). No Pixi/React imported anywhere in `sim/` or tests.

---

## Phase 2 — Render the sim

**Goal:** Wire the Pixi strip to live sim state. The auto-battle is now *visible*.

**Read:** SPEC §3, §5, §7.1, §9 Phase 2. `docs/ART.md`.

**Build:**
- 📄 `src/game/render/HeroSprite.ts`, `EnemySprite.ts` — procedural sprites (ART.md), driven by sim state.
- 📄 `src/game/render/StageBackground.ts` — parallax-ish stage backdrop that scrolls as party advances.
- 📄 `src/game/render/FloatingText.ts` — damage numbers, loot/chest popups.
- 📄 `src/game/render/EffectIcons.ts` + `src/ui/components/EffectIcons.tsx` — buff/debuff icons over combatants.
- 📄 `src/game/render/AbilityCooldown.ts` (or React `AbilityCooldown.tsx`) — cooldown pips.
- 📄 A **render driver** (in `GameStrip.ts` or `src/game/renderLoop.ts`): on each animation frame, read sim
  state and reconcile sprites; **interpolate** between fixed ticks for smoothness. Render reads, never mutates.
- Update `StripHud.tsx`: real stage label `W-S`, **stage progress bar**, gold counter (the `sim/num.ts`
  formatter), chest tray. (No research counter — research is unused in v1.)

**Gotcha:** the sim ticks at a fixed 100ms; render runs at display refresh. Interpolate positions; don't
drive sim time from `requestAnimationFrame` deltas directly — accumulate and step the sim in fixed chunks.

✅ **Gate:** a running app (video/screenshot) shows auto-battle filling the progress bar, abilities firing
with visible buff icons, a boss dying, and the party auto-advancing through stages with counters ticking.

---

## Phase 3 — Inventory, equipment, gems & chests

**Goal:** The loot loop closes: open chests → get items → equip/socket → clears visibly speed up.

**Read:** SPEC §4.4–§4.8, §7.3, §7.4, §7.4b, §9 Phase 3.

**Build:**
- 📄 `src/state/slices/inventorySlice.ts`, `chestSlice.ts` — inventory items, owned **gem instances**, unopened
  chests, zone keys, auto-open state, **inventory pages + slot upgrades**. Immutable; bounded by derived caps.
- 📄 `src/ui/panels/InventoryPanel.tsx` — tier-colored item grid, slot filter, sort by tier/ilvl, **page
  tabs (1–5)**, and the **gold expansion controls**: "Buy slot (+1 all pages)" and "Unlock page" with their
  escalating gold costs (BALANCE "Inventory expansion"). Capacity = `pages × (20 + slotUpgrades)`, max 200.
- 📄 `src/ui/components/ItemSlot.tsx`, `ItemTooltip.tsx`, `StatRow.tsx` — slot cells, hover tooltip with
  **comparison delta** vs equipped, stat rows split offensive/defensive, gem grants shown per socket.
- 📄 `src/ui/panels/HeroPanel.tsx` — class selector `‹ Class ›`, portrait + `Lv.N`, the **10 equipment
  slots** ringed around the portrait (tinted by tier), Inventory/Formation tabs, click/drag-equip.
- 📄 `src/ui/panels/ChestPanel.tsx` — chests grouped by type with `count/capacity`, Open / Open All,
  auto-open state (locked perk until tech unlock); opening can yield items, a **tiered gem**, a zone key, or a pet.
- Gem socketing UI: click empty socket → pick an owned **gem instance** (shows its tier + grants in *this*
  item's category) → **sets `item.bound = true`** with a "this will bind the item" confirmation; bound marker.
- Wire equip/unequip/socket + inventory purchases through `state/` (gold); sim reads updated equipment in `aggregate`.

✅ **Gate:** opening a boss chest produces higher-tier items than a normal chest; equipping them + socketing
higher-tier gems visibly speeds clears; tooltips show correct deltas; socketing binds; buying inventory
slots/pages with gold expands capacity (and gets pricier each time).

---

## Phase 4 — Status, talents, party, classes, tech tree & pets

**Goal:** All progression systems live and visibly impactful.

**Read:** SPEC §4.7, §4.9, §4.12, §6, §7.2, §7.2b, §7.2c, §7.5, §9 Phase 4.

**Build:**
- 📄 `src/state/slices/partySlice.ts`, `progressSlice.ts`, `petSlice.ts` — roster, talents, talent points,
  gold, tech ranks (gold-bought), owned/selected pets.
- 📄 `src/ui/panels/StatusPanel.tsx` — selected hero: class/level/EXP bar, computed stats split
  offensive/defensive, compact active buffs/debuffs + cooldowns.
- 📄 `src/ui/panels/TalentPanel.tsx` — per-hero tree: lines of 2 passives + 1 ability, line unlocks every
  10 points, rank `n/max`, 1 point/level, respec button. Passives feed `aggregate`; ability nodes scale
  `AbilityDef` via `rankScaling`.
- 📄 `src/ui/panels/TechTreePanel.tsx` — the **large** global DAG (the main gold sink); nodes show name,
  **gold cost** (exponential by ring), rank/lock, grouped Economy/Chests/Combat/Offline/Slots; clicking an
  affordable unlocked node buys a rank with **gold**.
- 📄 `src/ui/panels/PetsPanel.tsx` — collection grid (owned in color w/ bonus; unowned silhouettes),
  cosmetic selection, summed economy bonuses.
- Hook gold earning (the tech + inventory + class-unlock sink), tech unlocks (party slots 2/3, chest storage,
  auto-open + interval reduction), hero leveling/EXP + talent points, rare pet drops on kills. (No research.)
- Ensure `getBonuses` merges tech + pets and the sim/state read **only** the merged object.

✅ **Gate:** spending talent points visibly changes a hero's combat (ranked ability casts stronger, passives
raise stats); tech nodes buff party/economy and unlock party slot 2/3 + auto-open; a pet's bonus applies
regardless of which pet is selected as cosmetic.

---

## Phase 5 — Persistence & offline

**Goal:** The game survives reload and rewards time away.

**Read:** SPEC §5.4, §8, §8.1 (v1 row only), §9 Phase 5.

**Build:**
- 📄 `src/persistence/saveSchema.ts` — `SaveV1` + `HeroState` exactly per SPEC §8 (incl. future-but-empty
  `cube`/`online` fields, `origin`/`bound` on items). Versioned.
- 📄 `src/persistence/saveManager.ts` — serialize/deserialize the whole store ↔ `SaveV1` via IndexedDB
  (`idb`), autosave on a timer + meaningful events, a `migrate(save)` function signature ready for v2.
- Wire `sim/offline.ts`: on load compute elapsed real time, simulate forward capped, award
  gold/XP/chests(≤caps)/rare-pet, show a "while you were away" summary modal.
- Replace any Phase-0 localStorage shim with real IndexedDB persistence.

✅ **Gate:** reload restores exact state including talents, equipment, gems, tech, pets, chests; returning
after (simulated) time shows a correct offline summary that respects per-type caps and `offlineMult`.

---

## Phase 6 — Polish + Cube synthesis

**Goal:** v1 is a complete, juicy, fun offline game.

**Read:** SPEC §4.3 (tier colors), §7.6, §12.4 (bound-on-synthesis), §9 Phase 6, §10 (definition of done).

**Build:**
- Pixel-art frames + tier colors T0 grey → T8 iridescent across all panels and item borders.
- Juice: hit flashes, crit pops, chest-open sparkle, rare-pet-drop fanfare, ability-cast flashes, smooth
  number tweens. Keep it deterministic-safe (juice reads sim state; never feeds back into it).
- 📄 `src/ui/panels/CubePanel.tsx` — make it functional: 9 same-tier items → 1 of the next tier. Synthesis
  **sets `bound = true`** on the output. "Auto Fill" helper. (Stub shell exists from earlier phases.)
- Pass over the full SPEC §10 "definition of done" checklist; fix gaps.

✅ **Gate (🚩 v1 SHIP LINE):** the entire SPEC §10 player-journey runs end-to-end in the browser:
auto-battle on an always-visible strip; 1×/1.5×/2× zoom; summon/dismiss every panel from the icon bar;
progress bar → boss → scaling stages; farm W-9 for a zone key → W-10; three chest types with capped
storage; open chests → T0–T8 items with correct stat routing, ≤4 stats, ≤4 sockets; category-dependent
gems; cheap gold class unlocks + gold tech nodes (the main sink) + gold inventory expansion; rare pets with always-on stacking economy bonuses
(cosmetic selection); close all windows to a clean strip; reload + offline summary. Cube synthesis works.

---

## Out of scope for this build (do not start)

- **v1.5:** Tauri, frameless/always-on-top/docking, transparency (`backgroundAlpha: 0`),
  `setIgnoreCursorEvents` click-through, Steam, the minimal docked re-skin. (Only *tag* surfaces in P0.)
- **v2:** any backend, Supabase, accounts/auth, ledger, Auction House, premium currency, anti-cheat
  verification, leaderboard. The `origin`/`bound`/`online` data exists but **nothing verifies or uses it**.

If you find yourself building any of the above, stop — it's not v1.

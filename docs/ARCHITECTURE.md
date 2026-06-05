# ARCHITECTURE.md — How the code fits together

This codebase has **one load-bearing idea**: the simulation is a pure library that knows nothing about
how it's drawn or stored. Everything else follows from protecting that boundary.

```
                 reads state, sends intents
   ┌──────────────┐        ┌──────────────┐
   │   game/      │        │    ui/       │
   │  (PixiJS)    │        │  (React)     │
   └──────┬───────┘        └──────┬───────┘
          │   reads                │  reads + dispatches
          ▼                        ▼
                 ┌──────────────┐
                 │   state/     │   Zustand store (slices)
                 │  (Zustand)   │   holds player-facing state, mirrors SaveV1
                 └──────┬───────┘
                        │  feeds inputs to / reads results from
                        ▼
                 ┌──────────────┐        ┌──────────────┐
                 │    sim/      │ reads  │    data/     │
                 │ (pure TS)    │───────▶│ (static cfg) │
                 └──────────────┘        └──────────────┘
                        ▲ imports nothing above this line
                 ┌──────────────┐
                 │ persistence/ │  SaveV1 ↔ platform storage (Tauri save.json)
                 └──────────────┘
```

## The dependency rule (the one that matters most)

**Allowed import directions only:**

- `data/` imports: nothing internal except other `data/` and pure TS. **Not even `sim/`.** It is config.
- `sim/` imports: `data/`, other `sim/`, pure TS. **Never** `game/`, `ui/`, `state/`, `app/`, Pixi, React,
  Zustand, or anything DOM/browser-specific.
- `state/` imports: `sim/`, `data/`, `persistence/`. It's the bridge: it calls the sim and stores results.
- `game/` (Pixi) imports: `state/`, `sim/` (read-only), `data/`. It renders; it never owns game logic.
- `ui/` (React) imports: `state/`, `sim/` (read-only selectors), `data/`. It renders + dispatches intents.
- `persistence/` imports: `data/`, `sim/` (types), the save schema. It serializes `state` ↔ `SaveV1`.
- `platform/` : runtime/OS adapters, all gated behind `isTauri()` and dynamically importing `@tauri-apps/*`
  so the dev bundle + tests stay Tauri-free. Holds `storage.ts` (save backend), `desktopOverlay.ts`
  (transparency / click-through / window drag), `saveTransfer.ts` (native export/import dialogs), `quit.ts`.

ESLint enforces the `sim/`+`data/` half of this (`no-restricted-imports` in `eslint.config.js`). If a lint
error tells you `sim/` can't import React/Pixi/state — **the fix is to restructure, not to disable the rule.**

### Why so strict?

1. **Determinism & testability.** `sim/` runs headless in Node for tests. If it imported Pixi/React it
   couldn't. (SPEC §11: no test imports Pixi or React.)
2. **Portability (the v1.5/v2 payoff).** The same `sim/` later runs on a server for anti-cheat (SPEC §12.12).
   A clean boundary now is free; retrofitting it later is a rewrite.
3. **Render/logic split (SPEC §0.4).** Because logic is decoupled from chrome, v1.5 re-skins panels without
   touching the sim. v1 must keep that seam intact.

## Folder responsibilities

| Folder | Owns | Must NOT |
|---|---|---|
| `data/` | All tunable config + the type definitions it implies. | Contain logic, RNG, or import `sim/`. |
| `sim/` | World state + all game rules as pure functions of state + seeded RNG. | Import render/UI/state/Pixi/React; use `Math.random`/`Date.now`. |
| `state/` | Zustand store mirroring `SaveV1`; calls sim, applies results immutably. | Contain combat/loot math (that's `sim/`). |
| `game/` | Pixi `Application`, sprites, the render loop, camera, floating text. | Mutate sim state; hold authoritative numbers. |
| `ui/` | React panels, HUD, components, tooltips, the icon-bar launcher. | Hold game logic; compute balance numbers. |
| `persistence/` | `SaveV1` schema, serialize/deserialize, IndexedDB, migrations. | Know about rendering. |
| `platform/` | v1: `surfaces.ts` interactive-region registry (tag only). | Build hit-test/click-through/transparency in v1. |
| `app/` | Top-level layout (`App`, `PanelLayer`) and wiring/bootstrap. | Hold domain logic. |

## Data flow examples

**A combat tick → screen:**
1. `Simulation.tick()` advances `WorldState` (movement, spawns, `combat.resolve`, `effects`, loot, stages)
   using the seeded RNG. Pure. (`sim/`)
2. The render loop (`game/`) reads the new `WorldState` each frame and reconciles sprites, **interpolating**
   between the 100ms ticks. It writes nothing back.
3. The HUD (`ui/`) reads derived values (stage label, gold, progress) via selectors and renders them.

**Player equips an item:**
1. `InventoryPanel` (ui) dispatches an `equip(heroId, item)` intent to `inventorySlice`/`partySlice` (state).
2. The slice updates the roster immutably; the item moves from inventory to `hero.equipment[slot]`.
3. Next tick, `sim/stats.aggregate(...)` recomputes the hero's effective stats from the new equipment.
   Combat immediately reflects it. No special "recalc" call — aggregation is per-tick and pure.

**Open a chest:**
1. `ChestPanel` (ui) dispatches `openChest(chestId)`.
2. `chestSlice` (state) calls `sim/chests.openChest(...)`, which uses the seeded RNG to roll loot via
   `sim/loot.generateItem(origin)`. Returns items/keys/pets.
3. The slice adds results to inventory (respecting slot caps) and frees the storage slot. UI re-renders.

## The simulation loop (fixed timestep)

- Logical tick = **100ms** (`docs/BALANCE.md`). `Simulation` owns `WorldState` and a tick counter.
- A driver in `game/` accumulates real elapsed time and calls `tick()` in fixed 100ms steps (catch-up loop,
  clamped to avoid spiral-of-death). Render interpolates between the last two states for smoothness.
- The loop runs whether panels are open or not (opening a panel pauses nothing — SPEC §0.3).
- **Offline** (`sim/offline.ts`) is the same rules run in bulk at load with a capped elapsed time.

## Determinism contract (load-bearing for v2, free to honor now)

- One RNG: `sim/rng.ts` (mulberry32), seeded from save `seed`, state serializable into the save.
- `generateItem(origin)` is pure: `origin = { rollSeed, stageIndex, chestType, generatorVersion }` →
  byte-for-byte identical item anywhere. Tag loot constants with `generatorVersion`; **never mutate a
  version's numbers — bump the version.**
- Prefer integer math; if floats are unavoidable in stat rolls, round to fixed precision so results are
  stable across engines. (SPEC §4.6.)
- Every `ItemInstance` carries `origin` + `bound:false` from creation. Nothing verifies it in v1 — but the
  data must be correct, because v2's anti-cheat regenerates from it.

## State ↔ Save mapping

`state/` slices are shaped to make `SaveV1` a near-direct projection (SPEC §8). `persistence/saveManager`
serializes the store to `SaveV1` and rehydrates on load. Derived values (party-slot count, inventory-slot
count, chest capacity, auto-open interval) are **computed from `techTree` + `pets` via `getBonuses`**, never
stored. See `docs/DATA_MODEL.md` for `SaveV1`/`HeroState`.

## Surface tagging (the only v1.5 hook we build)

Interactive React/Pixi surfaces register their bounding region with `platform/surfaces.ts` (e.g. on mount,
push `{ id, getBounds }`). In v1 nothing reads this registry. In v1.5 a `hitTest.ts` will consume it to drive
click-through. Keep registration cheap and correct; build no consumer now.

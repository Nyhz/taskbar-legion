# CODING_STANDARDS.md — Clean code rules for this project

These are the habits that keep a oneshot build coherent. They're enforced by `tsconfig` strictness +
ESLint where possible; the rest is on you. **When in doubt, prefer the smaller, simpler, more obvious thing.**

## TypeScript

- **Strict, always.** `strict: true` and `noUncheckedIndexedAccess: true` are on. Indexing an array/record
  yields `T | undefined` — handle it; don't `!` it away. (This catches real bugs in loot/stat tables.)
- **No `any`.** Use `unknown` + narrowing, generics, or a precise union. If you truly need an escape hatch,
  isolate it in one tiny well-commented function.
- **No non-null `!`** unless provably safe, with a one-line comment saying why.
- **`import type { … }`** for type-only imports (enforced by lint). Keeps runtime imports honest.
- **Prefer `type`/`interface` from one source.** Domain types live in `data/` (config-shaped) or `sim/`
  (state-shaped). Don't redeclare the same shape in `ui/`; import it.
- **Discriminated unions over flags.** Effects, tech effects, pet bonuses, item-slot categories are unions
  with a `kind`/`type` tag — `switch` on the tag exhaustively (let the compiler prove you covered all cases:
  end with a `never` assertion in the `default`).
- **`as const`** for static config tables and literal unions.
- **Readonly by default** for config (`data/` exports), and for sim inputs you don't mutate.

## Purity & immutability

- `sim/` functions are **pure**: output depends only on inputs (+ the passed RNG). No module-level mutable
  state, no I/O, no clock, no `Math.random`. If a function needs randomness, it takes an `Rng` parameter.
- `state/` updates are **immutable**: produce new objects/arrays (spread, map, filter), never mutate store
  state in place. Zustand `set` returns the next state.
- Side effects (Pixi draws, IndexedDB writes, timers) live at the **edges** (`game/`, `persistence/`,
  effect hooks in `ui/`), never inside `sim/` or `data/`.

## Naming

- Name by **domain meaning**, not implementation pattern: `generateItem`, `aggregateStats`, `tierBias`,
  `rollChestLoot` — not `ItemHelper`, `StatManager`, `doStuff`.
- Functions are verbs (`advanceStage`, `applyEffect`), values are nouns (`activeEffects`, `dropWeight`).
- Booleans read as assertions: `isBound`, `canAfford`, `hasZoneKey`.
- Files: one primary export per file, filename matches it (`HeroSprite.ts` exports `HeroSprite`;
  `loot.ts` exports `generateItem` + helpers). `camelCase` for modules of functions, `PascalCase` for
  classes/React components/Pixi display wrappers.
- Constants from `data/` are the single source of game numbers — reference them, never re-type a literal.

## File size & structure

- **Soft cap ~200 lines per file**, ~50 lines per function. If a file or function sprawls, split by
  responsibility. Many small files > few big files (easier for a fresh context to navigate).
- One concept per file. A panel, a slice, a sprite, a sim subsystem each get their own file.
- Co-locate a unit's helpers with it until they're reused, then lift to a shared module.
- Order within a file: types → constants → main export → helpers below it.

## Comments

- Comment **why**, not **what**. The code says what; comments explain intent, invariants, and the
  non-obvious (e.g. "round to 2dp so client/server agree — SPEC §4.6", "binds the item — SPEC §12.4").
- Cite SPEC sections for rules that came from design (`// SPEC §4.6 step 3: reject jewelry at T0`).
- No commented-out code, no `TODO` without a name/context. Match the surrounding comment density.

## Error handling

- In `sim/`, prefer making illegal states unrepresentable (types) over runtime guards. Where a guard is
  needed (e.g. opening a chest that doesn't exist), fail loudly in dev with a clear message.
- At the edges (`persistence/`, chest opening, save migration), handle the realistic failure (corrupt save,
  missing key) gracefully — never silently swallow. Log with `console.warn`/`console.error` (allowed by lint).
- Never `catch` and ignore. Either handle meaningfully or let it throw.

## React (ui/)

- Function components + hooks only. Read store state via Zustand selectors (subscribe to the **narrowest**
  slice you need to avoid needless re-renders).
- Components render + dispatch intents; they don't compute balance math. Pull derived numbers from `sim/`
  selectors or `getBonuses`.
- `PixelWindow` is the only window chrome — every panel composes it. Parameterize size/position (SPEC §0.4).
- Keep components presentational where possible; push stateful logic into slices/selectors.
- Follow the rules of hooks (lint-enforced via `eslint-plugin-react-hooks`).

## Pixi (game/)

- The render layer **reads** sim/state and reconciles display objects. It never owns authoritative numbers.
- Reuse textures/containers; don't recreate per frame. Generate procedural textures once (see ART.md) and
  cache them. Pool floating-text objects.
- Interpolate between fixed sim ticks for smooth motion; don't tie sim time to frame delta.
- Everything `image-rendering: pixelated` / nearest-neighbor; integer-friendly positions to avoid blur.

## Data-driven discipline (SPEC §0.7 — the big one)

- A new item stat, gem, effect, ability, talent, tech node, pet, or class is **a data edit in `data/`**,
  not a logic edit in `sim/`. If adding content forces you to touch the combat loop, the abstraction is
  wrong — fix the abstraction.
- The combat engine consumes a generic list of `ActiveEffect`s; abilities apply declarative `EffectDef`s.
  This is the modularity contract from SPEC §4.10 — protect it.

## Definition of "done" for any unit of work

`npm run typecheck` ✅ · `npm run lint` ✅ (zero warnings) · `npm test` ✅ · the relevant SPEC rule honored ·
`PROGRESS.md` updated. Only then move on.

# Taskbar Legion

An ambient idle RPG that auto-battles in a thin horizontal strip. A party of up to 3 heroes advances
left-to-right through infinitely-scaling stages; management lives in draggable pixel-art panels floating over
the strip. **This repo builds v1: the complete single-player game, in the browser, 100% offline.**

- **Full design:** [`SPEC.md`](./SPEC.md) (authoritative).
- **How it's built (for the build agent):** [`CLAUDE.md`](./CLAUDE.md) → [`docs/PLAN.md`](./docs/PLAN.md).

## Stack

TypeScript (strict) · Vite · PixiJS v8 (the strip) · React 18 (panels) · Zustand (state) · IndexedDB (save) ·
Vitest (tests). All art is **procedural** (generated in code — no external assets).

## Quick start

```bash
npm install
npm run dev        # the game
npm test           # the sim test suite
npm run typecheck  # strict TS
npm run lint       # incl. the sim/data import-boundary rule
```

## Docs

| File | What |
|---|---|
| `CLAUDE.md` | Operating manual + the golden rules. Start here. |
| `docs/PLAN.md` | The phased execution plan (Phases 0–6). |
| `docs/PROGRESS.md` | Living build checklist. |
| `docs/ARCHITECTURE.md` | Layering, the sim↔render boundary, data flow. |
| `docs/CODING_STANDARDS.md` | Clean-code rules. |
| `docs/DATA_MODEL.md` | All TypeScript type contracts. |
| `docs/PROGRESSION.md` | Scaling bible: infinite/accelerating difficulty, gear-check treadmill, XP. |
| `docs/AFFIXES.md` | Which stats each item type can roll (armor/weapon/jewelry). |
| `docs/TESTING.md` | Test strategy + the mandatory test list. |
| `docs/ART.md` | Procedural pixel-art approach + palette. |
| `docs/BALANCE.md` | Every tunable value resolved into starting numbers. |

## Scope

v1 only: combat with abilities/talents, T0–T8 loot from chests, gems, gear, tech tree, rare pets, offline
progress, persistence, and cube synthesis — no Tauri, no transparency/click-through, no online/server.
Those are v1.5 / v2 and are explicitly out of scope (see `SPEC.md §9`).

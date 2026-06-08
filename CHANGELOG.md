# Changelog

All notable changes to Taskbar Legion are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is pre-1.0, minor versions may include breaking save changes.

## [Unreleased]

### Added

### Changed

### Fixed

## [0.4.1] - 2026-06-08

### Added

### Changed

- **Loadouts are now talent-only** — switching a loadout swaps only your talents and leaves your equipped gear untouched, so presets never re-shuffle or drop items.
- **Knight's Debilitating Strike is now Debilitating Cleave** — it hits every enemy within melee range instead of a single target.

### Fixed

- Fixed the black / blank game screen that could appear in the packaged desktop app on some machines.
- Saves now persist reliably on macOS — the packaged app no longer silently fails to write your progress, so **Continue** always picks up where you left off.

## [0.4.0] - 2026-06-06

### Added

- **Loadouts** — each hero now has two saved gear + talent presets (labelled **Farm** and **Boss**) next to the active abilities. Left-click to instantly switch to a setup, right-click to save the current one or clear it. Loading re-equips whatever of the saved gear you still have (in your bags, stash, or already worn) and skips anything you sold, with a rich hover card showing exactly what each preset holds.
- **Compare items without gems** — hold **Shift** while hovering an item to see its role-impact comparison based on the base items alone, gems set aside.

### Changed

- **Precise item placement** — dragging an item now drops it into the exact slot you release it on (swapping with whatever was there), in both the inventory and the stash, and you can place an item on a later stash page even when earlier pages aren't full.
- Bigger, easier-to-read combat damage numbers.
- Taller overlay window so the top of the tallest panels has more breathing room.

### Fixed

- The drop highlight now frames the exact slot an item will land in, instead of overflowing the cell.
- Moved the world-boss portal's key count above the portal so it no longer overlaps the strip.

## [0.3.0] - 2026-06-06

### Added

- **Perfect item stats** — items can now roll "perfect" inherent stats, about 15% above the normal maximum for their item level and rarity. Perfect stats show a ★ on the stat and on the item's name, and any item with one gets a tier-colored glow in your bags. Synthesizing rolls perfects more often, and transfiguring a stat can also come up perfect.
- **World-boss challenge keys** — world bosses (the X-10 fights) now cost a key to enter, earned from stage-boss chests. Held keys are shown in the Map panel and on the strip, and the portal blocks entry — with a nudge to go farm — when you're out.
- **Zone healing-penalty indicator** — a ☠ badge on the strip shows how much the current difficulty weakens healing, with a per-difficulty breakdown when you hover it.
- The Priest's basic attack now **splashes nearby enemies** for partial damage, giving the healer some light area damage.

### Changed

- **Gem drops rebalanced** — gems are now far more reliable from stage- and world-boss chests while normal chests stay rare, and the Gem Sense tech gives a bigger bonus per rank.
- **Healing scales down more on higher difficulties**, tuned so a well-geared Priest keeps restoring a meaningful share of the tank's health as you climb — healing power stays worth upgrading instead of plateauing.
- **Inventory-slot upgrades are much cheaper**, so late-game farmers can open up far more bag space.
- **Priest visual overhaul** — a new, larger Mend heal effect; the holy-strike auto-attack now bursts from the enemy's feet and reads bigger; a golden Retribution Aura pools on the ground under the Priest; and the Battle Enrage ult swirl was reworked to sit on each buffed ally.
- Casters hang back a little further and the Priest reaches slightly further in melee, for cleaner party spacing.
- A bold **MULTI!** popup now flags multistrike procs over the attacker.

### Fixed

- **Auto-open** now reveals its haul with the same floating loot toasts as opening chests by hand (including world-boss keys), instead of silently banking everything.

## [0.2.0] - 2026-06-05

### Added

- World bosses now gain telegraphed abilities at higher difficulties: **Frenzy** (Inferno+, attacks faster for a few seconds) and **Mortal Wound** (Torment, a heavy hit that cuts the tank's healing) — each shows a cast bar and its own on-screen effect.
- Title / start screen.
- Item-level indicators: per-hero average iLvl with a gear-vs-stage arrow, and per-item iLvl in tooltips.
- Native save export / import via file dialogs on the desktop app.
- Independent **Menu** and **Game** UI scaling, controlled from the strip's top bar.
- Reworked Ranger abilities — Explosive Arrow (radius-limited splash) and Caltrops (ground spikes) — plus a Priest enrage aura.
- Pointer-based item drag-and-drop.

### Changed

- Rebalanced the difficulty curve: smoother, progressively harder world-boss walls, tuned so clearing the final Torment 10-10 boss takes roughly 2–3 months of play, with no sudden multi-week stalls.
- Shield abilities no longer stack on an already-shielded ally, so casts aren't wasted.
- Retuned hero ability cooldowns and scaling, with dynamic cooldown reduction.
- Many desktop overlay sizing and zoom refinements.

### Fixed

- Malformed saves are rejected before loading, preventing a boot-loop brick.
- World and stage bosses now reach the front hero (wider attack range).
- Enemy HP bars no longer overlap when enemies bunch together.
- Each install seeds its own RNG, so loot rolls differ per install.
- Render fixes: the boss enrage aura and the Ranger ultimate crosshair now sit on the body instead of floating above it.
- The party always retreats off a world-boss stage on a wipe.

## [0.1.0] - 2026-06-05

### Added

- Initial desktop builds: Tauri v2 transparent, always-on-top, bottom-docked overlay.
- Multi-platform release pipeline (macOS universal, Windows, Linux) via GitHub Actions.

[Unreleased]: https://github.com/Nyhz/taskbar-legion/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/Nyhz/taskbar-legion/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Nyhz/taskbar-legion/releases/tag/v0.1.0

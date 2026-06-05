# Changelog

All notable changes to Taskbar Legion are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is pre-1.0, minor versions may include breaking save changes.

## [Unreleased]

### Added

### Changed

### Fixed

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

[Unreleased]: https://github.com/Nyhz/taskbar-legion/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Nyhz/taskbar-legion/releases/tag/v0.1.0

# Changelog

All notable changes to Taskbar Legion are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is pre-1.0, minor versions may include breaking save changes.

## [Unreleased]

### Added

### Changed

### Fixed

## [0.5.4] - 2026-11-18

### Added

### Changed

- **Softer ambience** — no shrill sounds in any world: the meadow's birds now warble low and round, the crickets and far whistle are quieter, and the windmills creak in World 1; the canyon's hawk and pebbles and the glass chimes of the monastery, caverns and citadel are lower and softer.
- **Combat sounds are a simple on/off switch** (the "only while looking" mode is gone: the game is always on top, so it made no difference).

### Fixed

- **Second screens** — dragging the game onto another monitor now fits the window to that monitor, so larger strip scales (×2) are available there, and the scale you chose comes back when it fits.
- The strip may take up to half the window's height (×2 was hidden on 900-pixel-tall screens).
- The options window no longer covers the hero window or other open panels; it steps to their right.
- The gold and key amounts on the HUD keep a fixed width, so the rail no longer shifts sideways as gold changes.

## [0.5.3] - 2026-11-18

### Added

### Changed

### Fixed

- **macOS:** the game can be clicked and dragged again after moving it to a second screen with a different scale (for example a Retina MacBook next to an external monitor). Before, the whole window let clicks pass through to the apps behind it.

## [0.5.2] - 2026-11-18

### Added

- **Sound** — the game now has sound: soft, hand-synthesised effects for blows, every ability and ultimate, boss mechanics, chests and loot, the interface and the Cube, plus a quiet ambience for each of the ten worlds (and its Torment version). By default, combat blows only sound while you are looking at the game (a panel open or the pointer over the strip); the big moments always do.
- **Sound options** — a sound switch, volume for effects, interface and ambience, and when combat sounds play (while watching, always or never).

### Changed

- **More common chests** — a common chest now drops on 0.5 % of kills (was 0.2 %), about one every three minutes.
- **Chest research is worth buying** — Common Hauls and Boss Spoils add +2.5 % per rank on top of the base chance (were +0.25 % and +0.5 %); their texts now say so.
- **Difficulty curve re-tuned** for the extra loot — enemies from world 2 on and the world bosses of Hell to Torment are tougher, so each difficulty keeps its length and every wall still asks more than the one before.

### Fixed

- Melee enemies no longer hit the party from a distance: the front ones fight in contact and the rest wait their turn.
- Enemies walking in no longer stop or slide backwards.
- Elite enemies keep only their aura (no more purple bolts).

## [0.5.1] - 2026-11-17

### Added

- **Polish, a new Cube recipe** — pay gold to roll the value of one affix again (the stat stays) and choose whether to keep the new value. Each polish of the same piece costs ×1.5 the last, and a polish comes out perfect (★) 5 % of the time. It gives late-game gold a use.

### Changed

- **Fuller waves** — every stage's waves are bigger (from 9 enemies at X-1 up to 22 at X-9), in Normal too.
- **Normal enemies have their full life** — a plain enemy takes two or three hits and an elite about ten, with waves that wear the Knight down a little without real danger. Normal is a longer stroll (about 6–8 hours).
- **Recruits cost more** — the Ranger joins around 1-5 and the Priest just before the first world boss.
- **Scholarship gives +0.5 % XP per rank** (was +2.5 %), so level 120 arrives late in Torment instead of halfway through.
- **Away time yields 15 % of online gold and experience** (was 50 %); Expedition buys back +1 % per rank, up to 35 %.
- Refreshed README with new art and screenshots.

### Fixed

## [0.5.0] - 2026-11-17

### Added

- **A complete visual redesign** — new pixel-art heroes, enemies and world bosses with engine-driven animation, battle-strip backdrops for all ten worlds (each with its own Torment atmosphere), new item icons, and a rebuilt interface (HUD, hero window, cube, map, pets and upgrades) in a hand-made pixel style.
- **Spanish (Spain)** — every text in the game is now available in English and Spanish.
- **Redesigned classes** — Knight, Ranger and Priest have new talent trees, role talents, reactive abilities and passives.
- **Pets, party supports and the Support's Enchanted Weapons aura.**
- **Boss mechanics** — world bosses now enrage, press the front hero, telegraph a **Charged Strike** that tests the tank's defences, and hit with a fixed physical or magic mix that the boss portal shows. Mirror bosses turn reflected buffs back into shards.
- **The back line takes damage** — ranged enemies shoot past the tank and area blows splash the whole party.
- **The hero sheet** shows real swings per second, with the raw attack speed and the per-hit bonus in the tooltip.

### Changed

- **Full progression rebalance** across the five difficulties — each one is clearly longer and asks for more gear than the one before, and every world boss is a harder wall than the previous one.
- **Magic resistance matters** — bosses deal 75 % of their damage in their own type, so skipping magic resistance loses the magic bosses from Eternal on.
- **Attack speed follows a soft per-class cadence** — past each class's natural pace, extra attack speed turns into damage per hit instead of absurd swing rates.
- **More waves per stage in the higher difficulties**, rarer top-tier drops, better boss-chest tables and a world-boss key in every boss chest where it's needed.
- **The Priest is the party healer**; a party without heals no longer survives the late walls.

### Fixed

- Attack speed is no longer lost to timer rounding: heroes swing exactly as often as their attack speed says.
- Bag pages keep their height, so the page keys stay under the pointer.
- A game scale saved before the whole-pixel system no longer shrinks the desktop app.
- Wide bosses stand behind their contact point, and ability hits land with the blow.
- Switching class refunds talent points; a removed ability in an old save no longer breaks the game.

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

[Unreleased]: https://github.com/Nyhz/taskbar-legion/compare/v0.5.4...HEAD
[0.5.4]: https://github.com/Nyhz/taskbar-legion/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/Nyhz/taskbar-legion/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/Nyhz/taskbar-legion/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/Nyhz/taskbar-legion/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/Nyhz/taskbar-legion/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Nyhz/taskbar-legion/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Nyhz/taskbar-legion/releases/tag/v0.1.0

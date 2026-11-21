"""The STRIP EVENTS' figures (src/data/stripEvents.ts): what turns up on the battle strip now and then for whoever is
looking — the runaway chest and the wandering merchant. One module per event, named by its kind, carrying
`EVENT = "ClassName"` (read as text, like a pet's `PET` line), a `Character` of that name, its `ANIMS`, and `OX`,
`OY`: the point under its feet in the cel. `export-events` bakes them into src/assets/strip/events/ — the same
atlas shape as a pet's (export_pets). World-neutral: one design for every world and difficulty.

Drawn facing RIGHT, like every figure; the game mirrors what goes left (the runaway chest flees right → left)."""

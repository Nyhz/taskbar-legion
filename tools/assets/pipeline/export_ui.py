"""`export-ui`: copies the interface art the game uses from `out/icons` into `src/assets/ui/` (tracked in git, so
the game builds without the pipeline). Run `icons` first. Only what a rebuilt panel already uses is listed here;
each panel adds its prefixes when it is ported.
"""
from __future__ import annotations

import shutil
from pathlib import Path

ICONS = Path(__file__).resolve().parents[1] / "out" / "icons"
DEST = Path(__file__).resolve().parents[3] / "src" / "assets" / "ui"

#: File-stem prefixes that go to the game. Composed review scenes (`hud_scene_*`) never do.
PREFIXES = (
    "ui_", "hud_", "stat_", "crest_", "tab_", "btn_", "map_diff_", "raw_", "frame_",
    # the kit's window / slot / key / menu / tooltip pieces and the hero, bag, stash, talents and sheet panels
    "bag_", "tal_", "tech_", "opt_", "cube_", "cube2_", "map_lock", "kit_",
    # stand-in ability signs (Ranger, Priest, the three ultimates) until the class redesign draws the final ones
    "abil_",
    # item icons drawn natively at 2/3 (22 px in a 24 px frame): what every slot in the game uses
    "sm_", "smframe_",
    # marks of the 24 px item cell (empty well, buy cell, perfect star, small class crests)
    "mark_",
    # the map and pets wings (world thumbnails, boss doors, difficulty signs, pets and their plinths)
    "map_", "pet_",
)
SKIP = ("hud_scene_", "raw_tier_")


def main() -> None:
    files = sorted(f for f in ICONS.glob("*.png") if f.stem.startswith(PREFIXES) and not f.stem.startswith(SKIP))
    if not files:
        raise SystemExit("nothing to export: run `sh run.sh icons` first")
    DEST.mkdir(parents=True, exist_ok=True)
    for old in DEST.glob("*.png"):
        old.unlink()
    for f in files:
        shutil.copyfile(f, DEST / f.name)
    print(f"export-ui: {len(files)} files → {DEST}")

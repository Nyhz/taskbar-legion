"""Exports what the lab page's live strip needs: backdrop layers per world and grade, and one sprite sheet per
animation of every figure."""
from __future__ import annotations

import importlib
import json
from pathlib import Path

from PIL import Image

from .families import backdrop_w01
from .rig import GROUND, bake
from .roster import ROSTER, load

OUT = Path(__file__).resolve().parents[1] / "out" / "scene"
#: Every backdrop family present: families/backdrop_wNN.py → "wNN".
WORLDS = {f.stem.removeprefix("backdrop_"): importlib.import_module(f".families.{f.stem}", __package__)
          for f in sorted((Path(__file__).parent / "families").glob("backdrop_w*.py"))}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta: dict = {"ground": GROUND, "path_y": backdrop_w01.PATH_Y, "worlds": {}, "chars": {}}
    for key, bd in WORLDS.items():
        meta["worlds"][key] = {"layers": [[name, speed] for name, _fn, speed in bd.LAYERS]}
        for grade in ("normal", "torment"):
            for name, img in bd.build(grade).items():
                img.save(OUT / f"{key}_{grade}_{name}.png")
    for name, (_path, _cls, side, world) in ROSTER.items():
        mod, char = load(name)
        meta["chars"][name] = {"w": char.W, "h": char.H + char.TOP, "ground": GROUND + char.TOP, "root": char.build.root_x, "side": side, "world": world, "anims": {}}
        for key, anim in mod.ANIMS.items():
            frames = bake(char, anim)
            sheet = Image.new("RGBA", (char.W * len(frames), char.H + char.TOP), (0, 0, 0, 0))
            for i, f in enumerate(frames):
                sheet.alpha_composite(f, (i * char.W, 0))
            sheet.save(OUT / f"{name}_{key}.png")
            meta["chars"][name]["anims"][key] = {"n": len(frames), "ms": anim.ms, "loop": anim.loop}
    (OUT / "meta.json").write_text(json.dumps(meta))
    print(f"wrote {OUT}")

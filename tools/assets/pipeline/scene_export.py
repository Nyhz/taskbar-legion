"""Exports what the lab page's live strip needs: backdrop layers per grade and one sprite sheet per animation."""
from __future__ import annotations

import importlib
import json
from pathlib import Path

from PIL import Image

from .families import backdrop_w01 as bd
from .rig import GROUND, bake

OUT = Path(__file__).resolve().parents[1] / "out" / "scene"
CLASSES = {"knight": "Knight", "ranger": "Ranger", "priest": "Priest"}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta: dict = {"ground": GROUND, "path_y": bd.PATH_Y, "layers": [[name, speed] for name, _fn, speed in bd.LAYERS], "chars": {}}
    for grade in ("normal", "torment"):
        for name, img in bd.build(grade).items():
            img.save(OUT / f"{grade}_{name}.png")
    for name, cls in CLASSES.items():
        mod = importlib.import_module(f".chars.{name}", __package__)
        char = getattr(mod, cls)()
        meta["chars"][name] = {"w": char.W, "h": char.H, "root": char.build.root_x, "anims": {}}
        for key, anim in mod.ANIMS.items():
            frames = bake(char, anim)
            sheet = Image.new("RGBA", (char.W * len(frames), char.H), (0, 0, 0, 0))
            for i, f in enumerate(frames):
                sheet.alpha_composite(f, (i * char.W, 0))
            sheet.save(OUT / f"{name}_{key}.png")
            meta["chars"][name]["anims"][key] = {"n": len(frames), "ms": anim.ms, "loop": anim.loop}
    (OUT / "meta.json").write_text(json.dumps(meta))
    print(f"wrote {OUT}")

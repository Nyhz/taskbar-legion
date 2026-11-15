"""`export-strip`: what the GAME needs to draw the battle strip's backdrops, written into `src/assets/strip/`
(tracked in git, so the game builds without the pipeline):

- `wNN_<grade>.png` — one sheet per world and grade, its parallax layers stacked top to bottom in `LAYERS` order
  (each layer is a full 600×160 tile that wraps horizontally);
- `backdrops.json` — the strip's size and path line, and per world its layers (name, parallax factor, whether it
  drifts on its own) and its ATMOSPHERE per grade (the real-time effects: lightning, particles, eyes, pulse,
  flicker — validated here like the lab does, so a typo fails the export, not the game).

Deterministic: the same sources give the same bytes.
"""
from __future__ import annotations

import importlib
import json
from pathlib import Path

from PIL import Image

from .lab_page import atmosphere

DEST = Path(__file__).resolve().parents[3] / "src" / "assets" / "strip"
GRADES = ("normal", "torment")
#: Layers that move on their own even when the party stands still (the lab's rule).
DRIFTING = ("clouds", "mist")


def worlds() -> dict[str, object]:
    """Every backdrop family present: families/backdrop_wNN.py → "wNN"."""
    return {f.stem.removeprefix("backdrop_"): importlib.import_module(f".families.{f.stem}", __package__)
            for f in sorted((Path(__file__).parent / "families").glob("backdrop_w*.py"))}


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    for old in DEST.glob("w*_*.png"):
        old.unlink()
    found = worlds()
    if not found:
        raise SystemExit("no backdrop families found")
    first = next(iter(found.values()))
    meta: dict = {"width": first.W, "height": first.H, "pathY": first.PATH_Y, "grades": list(GRADES), "worlds": {}}
    for key, bd in found.items():
        assert (bd.W, bd.H, bd.PATH_Y) == (first.W, first.H, first.PATH_Y), f"{key}: strip geometry differs"
        for grade in GRADES:
            layers = bd.build(grade)
            sheet = Image.new("RGBA", (bd.W, bd.H * len(bd.LAYERS)), (0, 0, 0, 0))
            for i, (name, _fn, _speed) in enumerate(bd.LAYERS):
                sheet.alpha_composite(layers[name], (0, i * bd.H))
            sheet.save(DEST / f"{key}_{grade}.png", optimize=True)
        meta["worlds"][key] = {
            "layers": [{"name": name, "factor": speed, "drift": name in DRIFTING} for name, _fn, speed in bd.LAYERS],
            "atmosphere": atmosphere(key, bd),
        }
    (DEST / "backdrops.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n")
    print(f"export-strip: {len(found)} worlds × {len(GRADES)} grades → {DEST}")

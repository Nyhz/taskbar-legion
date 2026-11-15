"""`export-pets`: the COMPANIONS the game draws in the battle strip (the pet chosen to go with the party), written
into `src/assets/strip/pets/` (tracked in git) — an atlas of their own, apart from the fighters':

- `<pet>.png` — one atlas per pet, the same grid as a fighter's (export_figs): cells `w`×`h`, `cols` wide, each
  animation starting on a row of its own. Cells are cropped to what the pet ever fills, so they are small;
- `pets.json` — every pet's meta, the same shape as a fighter's (cell size, `cols`, the `root` column and
  `ground` row — here the point under the pet's feet — the box its `idle` fills, and per animation its first row,
  frame count, per-frame `ms` and whether it loops).

A pet is a module in `pipeline/pets/` named by its key in src/data/pets.ts, carrying `PET = "ClassName"`.
Also writes an enlarged sheet of every clip to `out/preview/pet_<key>_sheet.png`, to review.
Deterministic: the same sources give the same bytes.
"""
from __future__ import annotations

import importlib
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

from .palette import color
from .rig import bake

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "src" / "assets" / "strip" / "pets"
PREVIEW = Path(__file__).resolve().parents[1] / "out" / "preview"
_PET = re.compile(r'^PET = "(\w+)"', re.M)
MARGIN = 1  # clear pixels kept round the union of every frame
#: No atlas may be wider or taller than this (src/game/render/petData.ts PET_ATLAS_MAX): half the smallest texture
#: limit of a GPU the game runs on, so it loads everywhere. A pet that outgrows it must wrap its rows first.
MAX_SIDE = 4096
SHEET_ZOOM = 4


def pets() -> dict[str, str]:
    """Pet key → its class name, for every module in pets/ that declares one."""
    out = {}
    for file in sorted((Path(__file__).parent / "pets").glob("*.py")):
        m = _PET.search(file.read_text())
        if m:
            out[file.stem] = m.group(1)
    return out


def export_pet(key: str, cls: str) -> tuple[dict, dict[str, list[Image.Image]]]:
    mod = importlib.import_module(f".pets.{key}", __package__)
    char = getattr(mod, cls)()
    baked = {name: bake(char, anim) for name, anim in mod.ANIMS.items()}
    boxes = [f.getbbox() for frames in baked.values() for f in frames]
    x0, y0 = min(b[0] for b in boxes if b) - MARGIN, min(b[1] for b in boxes if b) - MARGIN
    x1, y1 = max(b[2] for b in boxes if b) + MARGIN, max(b[3] for b in boxes if b) + MARGIN
    assert x0 >= 0 and y0 >= 0 and x1 <= char.W and y1 <= char.H, f"{key}: a frame touches the edge of its cel"
    w, h = x1 - x0, y1 - y0
    cut = {name: [f.crop((x0, y0, x1, y1)) for f in frames] for name, frames in baked.items()}
    cols = max(len(f) for f in cut.values())
    anims, row = {}, 0  # one row per clip: the longest has 16 frames, far under any texture limit
    if w * cols > MAX_SIDE or h * len(cut) > MAX_SIDE:
        raise SystemExit(f"export-pets: the atlas of {key} would be {w * cols}×{h * len(cut)} px — over {MAX_SIDE} a side")
    atlas = Image.new("RGBA", (w * cols, h * len(cut)), (0, 0, 0, 0))
    for name, frames in cut.items():
        anim = mod.ANIMS[name]
        anims[name] = {"row": row, "n": len(frames), "ms": [int(ms) for ms in anim.ms], "loop": bool(anim.loop)}
        for i, f in enumerate(frames):
            atlas.alpha_composite(f, (i * w, row * h))
        row += 1
    atlas.save(DEST / f"{key}.png", optimize=True)
    root, ground = int(mod.OX) - x0, int(mod.OY) - y0
    idle = [f.getbbox() for f in cut["idle"]]
    box = [min(b[0] for b in idle) - root, min(b[1] for b in idle) - ground, max(b[2] for b in idle) - root, max(b[3] for b in idle) - ground]
    return {"w": w, "h": h, "cols": cols, "root": root, "ground": ground, "box": box, "anims": anims}, cut


def sheet(key: str, cut: dict[str, list[Image.Image]]) -> None:
    """Every clip enlarged, one row each on the strip's dusk, labelled — what a reviewer looks at."""
    w, h = next(iter(cut.values()))[0].size
    z, pad, label = SHEET_ZOOM, 6, 58
    cols = max(len(f) for f in cut.values())
    img = Image.new("RGBA", (label + cols * (w * z + pad) + pad, len(cut) * (h * z + pad) + pad), (*color("dusk", 1), 255))
    draw = ImageDraw.Draw(img)
    for r, (name, frames) in enumerate(cut.items()):
        y = pad + r * (h * z + pad)
        draw.text((6, y + h * z // 2 - 5), name, fill=(*color("dusk", 8), 255))
        for i, f in enumerate(frames):
            big = f.resize((w * z, h * z), Image.NEAREST)
            img.alpha_composite(big, (label + pad + i * (w * z + pad), y))
    PREVIEW.mkdir(parents=True, exist_ok=True)
    img.save(PREVIEW / f"pet_{key}_sheet.png")


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    found = pets()
    if not found:
        raise SystemExit("no pets found in pipeline/pets/")
    meta = {}
    for key, cls in found.items():
        meta[key], cut = export_pet(key, cls)
        sheet(key, cut)
        print("pet", key, f"{meta[key]['w']}×{meta[key]['h']}")
    for old in DEST.glob("*.png"):
        if old.stem not in found:
            old.unlink()
    (DEST / "pets.json").write_text(json.dumps({"pets": meta}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"export-pets: {len(meta)} pets → {DEST}")

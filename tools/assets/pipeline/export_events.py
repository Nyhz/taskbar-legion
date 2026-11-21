"""`export-events`: the STRIP EVENTS' figures (pipeline/events/: the runaway chest, the wandering merchant), written
into `src/assets/strip/events/` (tracked in git) — the same atlas shape as a pet's (export_pets): `<kind>.png` and
`events.json` with every figure's meta (cell size, `cols`, `root`/`ground` under its feet, the box of its first
clip, and per clip its row, frame count, per-frame `ms` and whether it loops).

Also writes an enlarged sheet of every clip to `out/preview/event_<kind>_sheet.png` and a GIF of each clip to
docs/redesign/lab/img/events/, to review. Deterministic: the same sources give the same bytes.
"""
from __future__ import annotations

import importlib
import json
import re
from pathlib import Path

from PIL import Image

from .export_pets import MARGIN, MAX_SIDE, SHEET_ZOOM, sheet as pet_sheet
from .palette import color
from .rig import bake

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "src" / "assets" / "strip" / "events"
LAB = ROOT / "docs" / "redesign" / "lab" / "img" / "events"
PREVIEW = Path(__file__).resolve().parents[1] / "out" / "preview"
_EVENT = re.compile(r'^EVENT = "(\w+)"', re.M)


def events() -> dict[str, str]:
    out = {}
    for file in sorted((Path(__file__).parent / "events").glob("*.py")):
        m = _EVENT.search(file.read_text())
        if m:
            out[file.stem] = m.group(1)
    return out


def export_event(key: str, cls: str) -> tuple[dict, dict[str, list[Image.Image]]]:
    mod = importlib.import_module(f".events.{key}", __package__)
    char = getattr(mod, cls)()
    baked = {name: bake(char, anim) for name, anim in mod.ANIMS.items()}
    boxes = [f.getbbox() for frames in baked.values() for f in frames]
    x0, y0 = min(b[0] for b in boxes if b) - MARGIN, min(b[1] for b in boxes if b) - MARGIN
    x1, y1 = max(b[2] for b in boxes if b) + MARGIN, max(b[3] for b in boxes if b) + MARGIN
    assert x0 >= 0 and y0 >= 0 and x1 <= char.W and y1 <= char.H, f"{key}: a frame touches the edge of its cel"
    w, h = x1 - x0, y1 - y0
    cut = {name: [f.crop((x0, y0, x1, y1)) for f in frames] for name, frames in baked.items()}
    cols = max(len(f) for f in cut.values())
    if w * cols > MAX_SIDE or h * len(cut) > MAX_SIDE:
        raise SystemExit(f"export-events: the atlas of {key} would be over {MAX_SIDE} a side")
    atlas = Image.new("RGBA", (w * cols, h * len(cut)), (0, 0, 0, 0))
    anims, row = {}, 0
    for name, frames in cut.items():
        anim = mod.ANIMS[name]
        anims[name] = {"row": row, "n": len(frames), "ms": [int(ms) for ms in anim.ms], "loop": bool(anim.loop)}
        for i, f in enumerate(frames):
            atlas.alpha_composite(f, (i * w, row * h))
        row += 1
    atlas.save(DEST / f"{key}.png", optimize=True)
    root, ground = int(mod.OX) - x0, int(mod.OY) - y0
    first = [f.getbbox() for f in next(iter(cut.values()))]
    box = [min(b[0] for b in first) - root, min(b[1] for b in first) - ground, max(b[2] for b in first) - root, max(b[3] for b in first) - ground]
    return {"w": w, "h": h, "cols": cols, "root": root, "ground": ground, "box": box, "anims": anims}, cut


def gifs(key: str, cut: dict[str, list[Image.Image]], ms: dict[str, list[int]]) -> None:
    """Each clip as a GIF, ×4, on the strip's dusk — what the lab shows."""
    LAB.mkdir(parents=True, exist_ok=True)
    bg = (*color("dusk", 1), 255)
    for name, frames in cut.items():
        w, h = frames[0].size
        out = []
        for f in frames:
            img = Image.new("RGBA", (w, h), bg)
            img.alpha_composite(f)
            out.append(img.resize((w * SHEET_ZOOM, h * SHEET_ZOOM), Image.NEAREST).convert("P", palette=Image.ADAPTIVE))
        out[0].save(LAB / f"{key}_{name}.gif", save_all=True, append_images=out[1:], duration=ms[name], loop=0, disposal=2)


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    found = events()
    if not found:
        raise SystemExit("no events found in pipeline/events/")
    meta = {}
    for key, cls in found.items():
        meta[key], cut = export_event(key, cls)
        pet_sheet(f"event_{key}", cut)
        gifs(key, cut, {n: a["ms"] for n, a in meta[key]["anims"].items()})
        print("event", key, f"{meta[key]['w']}×{meta[key]['h']}")
    for old in DEST.glob("*.png"):
        if old.stem not in found:
            old.unlink()
    (DEST / "events.json").write_text(json.dumps({"events": meta}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"export-events: {len(meta)} figures → {DEST}")

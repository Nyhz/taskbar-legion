"""`export-figs`: the FIGHTERS the game draws in the battle strip, written into `src/assets/strip/figs/` (tracked in
git, so the game builds without the pipeline):

- `<figure>.png` — one atlas per figure (the three heroes, every world's four creatures and its world boss if it has one): a grid of `w`×`h`
  cells, `cols` wide; each animation starts on a row of its own and wraps onto the next ones when it has more than
  `cols` frames (so no atlas is wider than `MAX_WIDTH`, which every GPU can hold as one texture);
- `figs.json` — ONE file with every figure's meta (cell size, `cols`, the `root` column and `ground` row that
  stand on the path, the box its standing pose fills, and per animation its first row, frame count, per-frame
  `ms` and whether it loops) and which figures are the heroes. Frame `i` of an animation is the cell
  (`i % cols`, `row + i // cols`).

Which creature stands for which enemy of a world is NOT written here: the game reads that from src/data/worlds.ts.
The worlds' data files (docs/redesign/lab/data/wNN.json) only tell this export which creatures to bake.

Same baking as the lab page (`lab_page.export_figure`), so the game shows exactly what was approved there.
Deterministic: the same sources give the same bytes.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from .rig import GROUND, bake
from .roster import ROSTER, load

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "docs" / "redesign" / "lab" / "data"
DEST = ROOT / "src" / "assets" / "strip" / "figs"
#: The roles of a world's cast (`kind` in docs/redesign/lab/data/wNN.json).
KINDS = ("beast", "melee", "ranged", "boss")
#: A world may also give its WORLD boss (the W-10 fight) a creature of its own: one more entry, `kind` "worldboss".
#: A world without one keeps drawing its stage boss there.
OPTIONAL_KINDS = ("worldboss",)
#: No atlas is wider than this many pixels.
MAX_WIDTH = 2048
#: The animation whose frames measure the standing figure (where its life bar and auras go).
STANDING = "idle"


def export_figure(name: str) -> dict:
    mod, char = load(name)
    w, h = char.W, char.H + char.TOP
    ground, root = int(GROUND + char.TOP), int(char.build.root_x)
    baked = {key: bake(char, anim) for key, anim in mod.ANIMS.items()}
    cols = min(max(len(f) for f in baked.values()), MAX_WIDTH // w)
    anims, cells, row = {}, [], 0
    for key, frames in baked.items():
        anims[key] = {"row": row, "n": len(frames), "ms": [int(ms) for ms in mod.ANIMS[key].ms], "loop": bool(mod.ANIMS[key].loop)}
        cells += [(f, i % cols, row + i // cols) for i, f in enumerate(frames)]
        row += -(-len(frames) // cols)
    atlas = Image.new("RGBA", (w * cols, h * row), (0, 0, 0, 0))
    for f, cx, cy in cells:
        atlas.alpha_composite(f, (cx * w, cy * h))
    atlas.save(DEST / f"{name}.png", optimize=True)
    # The box the standing figure fills, over every frame of its idle: [left, top, right, bottom] in art pixels
    # from the point that stands on the path (root column, ground row); right and bottom are exclusive.
    boxes = [f.getbbox() for f in baked[STANDING]]
    x0, y0 = min(b[0] for b in boxes if b), min(b[1] for b in boxes if b)
    x1, y1 = max(b[2] for b in boxes if b), max(b[3] for b in boxes if b)
    return {"w": w, "h": h, "cols": cols, "root": root, "ground": ground, "box": [x0 - root, y0 - ground, x1 - root, y1 - ground], "anims": anims}


def worlds() -> dict[str, dict[str, str]]:
    """Per world, which creature plays each role: {"w01": {"beast": "boar", …, "worldboss": "crowmother"}, …}."""
    out: dict[str, dict[str, str]] = {}
    for f in sorted(DATA.glob("w[0-9][0-9].json")):
        foes = json.loads(f.read_text())["foes"]
        cast = {foe["kind"]: foe["key"] for foe in foes}
        assert len(cast) == len(foes), f"{f.stem}: two creatures with the same role"
        assert sorted(k for k in cast if k not in OPTIONAL_KINDS) == sorted(KINDS), f"{f.stem}: needs exactly one creature per role, got {sorted(cast)}"
        missing = [key for key in cast.values() if key not in ROSTER]
        assert not missing, f"{f.stem}: creatures without a figure: {missing}"
        out[f.stem] = {kind: cast[kind] for kind in KINDS + OPTIONAL_KINDS if kind in cast}
    return out


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    for old in DEST.glob("*.png"):
        old.unlink()
    cast = worlds()
    if not cast:
        raise SystemExit("no worlds found")
    heroes = [name for name, (_path, _cls, side, _world) in ROSTER.items() if side == "hero"]
    wanted = heroes + [key for roles in cast.values() for key in roles.values()]
    figs = {}
    for name in wanted:
        if name not in figs:
            figs[name] = export_figure(name)
            print("figure", name)
    meta = {"heroes": heroes, "figs": figs}
    (DEST / "figs.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"export-figs: {len(heroes)} heroes, {len(cast)} worlds, {len(figs)} figures → {DEST}")

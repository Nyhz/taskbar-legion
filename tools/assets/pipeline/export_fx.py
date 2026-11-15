"""`export-fx`: the ability EFFECTS the game plays in the battle strip, written into `src/assets/strip/fx/` (tracked in
git, so the game builds without the pipeline):

- `fx.png` — ONE atlas with every effect (pipeline/fx): each effect's frames sit in a row of their own (wrapping
  when the row would pass `MAX_WIDTH`);
- `skin_<hero>_<skin>.png` — the heroes' figures recoloured whole (`stone`: Stone Skin; `gold`: Last Stand), with
  EXACTLY the layout of the hero's own atlas in src/assets/strip/figs (the game swaps one sheet for the other and
  reads frames with the same meta) — so run `export-figs` first whenever a hero's animations change;
- `skin_<hero>_<rim>.png` — RIMS, laid out the same way: not the figure but a thin line of light hugging its
  silhouette frame by frame (`infused`: Power Infusion; `roused`: Battle Enrage on an ally). The game shows a rim
  BEHIND the figure, on top of whatever skin it wears — a light that follows every movement and covers nothing;
- `fx.json` — the meta: per effect its place in the atlas (`x`, `y`, cell `w`×`h`, `cols`), the cell point that sits
  on its attach point (`ax`, `ay`), frame count, per-frame `ms`, `loop`; and which skins exist for which heroes.

Previews for the eye (not tracked): tools/assets/out/fx/<key>.png — the frames in a row at ×4 over a pale and a
dark ground — and `_all.png` with everything.

Deterministic: the same sources give the same bytes.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from .fx import all_fx
from .palette import OUTLINE_COLORS, color, ramp
from .rig import bake
from .roster import ROSTER, load

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "src" / "assets" / "strip" / "fx"
FIGS = ROOT / "src" / "assets" / "strip" / "figs" / "figs.json"
OUT = Path(__file__).resolve().parents[1] / "out" / "fx"
MAX_WIDTH = 1024
GROUNDS = (color("dusk", 8), color("ink", 1))

#: A skin: the ramp a figure is repainted in (by how light each pixel is) and the gamma of that mapping.
SKINS: dict[str, tuple[str, float]] = {
    "stone": ("bone", 1.25),  # carved stone, warm and matt: nothing like his steel, blue and crimson
    "gold": ("brass", 0.8),
}


#: A rim: (the hugging line from the head down, the outer line, the glow at the feet). Tones are (ramp, index).
#: The hugging line is brightest at the head and goes down the list towards the feet; the outer line — the darker
#: edge that keeps the rim readable on a pale sky — stops at the knees; a third, broken one crowns the head and
#: shoulders. So the rim is three pixels at the top, two round the body and one at the legs.
RIMS: dict[str, dict] = {
    "infused": {"inner": [("light", 0), ("brass", 7), ("brass", 7), ("brass", 6)], "outer": ("brass", 4), "crown": ("brass", 5), "glow": ("brass", 6)},
    "roused": {"inner": [("brass", 7), ("crimson", 7), ("crimson", 6), ("crimson", 5)], "outer": ("crimson", 4), "crown": ("crimson", 5), "glow": ("crimson", 5)},
}


def _rim_cell(cell: Image.Image, ground: int, root: int, rim: str) -> Image.Image:
    """One frame's rim: a line of light one pixel outside the figure's silhouette, brightest at the head and fading
    down the body; a second, darker line outside it down to the knees, and over the head and shoulders a third,
    broken one; under the feet a short dotted glow. Nothing is drawn where the figure is — it only surrounds it."""
    spec = RIMS[rim]
    w, h = cell.size
    a = cell.getchannel("A").load()
    solid = lambda x, y: 0 <= x < w and 0 <= y < h and a[x, y] > 0  # noqa: E731
    ys = [y for y in range(h) for x in range(w) if a[x, y] > 0]
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    if not ys:
        return out
    top = min(ys)
    height = max(1, ground - top)
    p = out.load()
    ring1 = {(x, y) for y in range(h) for x in range(w) if not solid(x, y)
             and any(solid(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    ring2 = {(x, y) for y in range(h) for x in range(w) if not solid(x, y) and (x, y) not in ring1
             and any((x + dx, y + dy) in ring1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    ring3 = {(x, y) for y in range(h) for x in range(w) if not solid(x, y) and (x, y) not in ring1 and (x, y) not in ring2
             and any((x + dx, y + dy) in ring2 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    up = lambda y: (ground - y) / height  # 0 at the feet, 1 at the top of the head  # noqa: E731
    inner = spec["inner"]
    for x, y in ring1:
        if y >= ground:
            continue  # nothing under the ground line: the feet stand on the path
        k = up(y)
        tone = inner[0] if k > 0.72 else inner[1] if k > 0.42 else inner[2] if k > 0.16 else inner[3]
        p[x, y] = (*color(*tone), 255)
    for x, y in ring2:
        if y < ground and up(y) > 0.25:
            p[x, y] = (*color(*spec["outer"]), 255)
    for x, y in ring3:
        if y < ground and up(y) > 0.62 and (x + y) % 2 == 0:
            p[x, y] = (*color(*spec["crown"]), 255)
    # The glow at the feet: a short dotted line of light on the ground under the body.
    for dx in range(-9, 10):
        x = root + dx
        if 0 <= x < w and 0 <= ground < h and not solid(x, ground) and dx % 2 == 0 and abs(dx) > 1:
            p[x, ground] = (*color(*spec["glow"]), 255)
    return out


def rim_sheet(base: Image.Image, w: int, h: int, ground: int, root: int, rim: str) -> Image.Image:
    """A hero's whole atlas as rims: each cell on its own, so a rim never leaks into the next frame."""
    out = Image.new("RGBA", base.size, (0, 0, 0, 0))
    for top in range(0, base.height, h):
        for left in range(0, base.width, w):
            cell = base.crop((left, top, left + w, top + h))
            if cell.getbbox() is not None:
                out.paste(_rim_cell(cell, ground, root, rim), (left, top))
    return out


def _luma(c: tuple[int, int, int]) -> float:
    return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255.0


def reskin(img: Image.Image, skin: str) -> Image.Image:
    """The figure repainted in one ramp: outlines stay the darkest tone, everything else lands on the ramp by its
    lightness — the modelling of the figure survives, its colours do not."""
    name, gamma = SKINS[skin]
    tones = ramp(name)
    out = img.copy()
    p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = p[x, y]
            if a == 0:
                continue
            if (r, g, b) in OUTLINE_COLORS:
                p[x, y] = (*tones[0 if _luma((r, g, b)) < 0.09 else 1], 255)
                continue
            lum = min(1.0, _luma((r, g, b)) ** gamma * 1.12)
            p[x, y] = (*tones[2 + int(round(lum * (len(tones) - 3 - (1 if skin == "stone" else 0))))], 255)
    return out


def export_skins(heroes: list[str]) -> dict[str, list[str]]:
    figs = json.loads(FIGS.read_text())["figs"]
    for name in heroes:
        mod, char = load(name)
        meta = figs[name]
        w, h, cols = meta["w"], meta["h"], meta["cols"]
        # The skin follows figs.json, not the sources: a clip being drawn right now and not exported yet (another
        # job's work in progress) is simply not in the skin until `export-figs` has run — the game reads skins with
        # figs.json's layout, so that is exactly what it can show. Said aloud, never an error: failing here would
        # leave the effects atlas written and its meta not.
        pending = [k for k in mod.ANIMS if k not in meta["anims"]]
        if pending:
            print(f"  {name}: clips not in figs.json yet, left out of its skins until export-figs runs: {pending}")
        rows = max(a["row"] + -(-a["n"] // cols) for a in meta["anims"].values())
        base = Image.new("RGBA", (w * cols, h * rows), (0, 0, 0, 0))
        for key, placed in meta["anims"].items():
            if key not in mod.ANIMS:
                continue
            frames = bake(char, mod.ANIMS[key])
            if len(frames) != placed["n"]:
                print(f"  {name}.{key}: {len(frames)} frames drawn, {placed['n']} in figs.json — run export-figs, then export-fx again")
            for i, f in enumerate(frames[: placed["n"]]):
                base.alpha_composite(f, ((i % cols) * w, (placed["row"] + i // cols) * h))
        for skin in SKINS:
            reskin(base, skin).save(DEST / f"skin_{name}_{skin}.png", optimize=True)
        for rim in RIMS:
            rim_sheet(base, w, h, meta["ground"], meta["root"], rim).save(DEST / f"skin_{name}_{rim}.png", optimize=True)
        print("skins", name)
    return {skin: heroes for skin in [*SKINS, *RIMS]}


def _preview(key: str, frames: list[Image.Image]) -> Image.Image:
    w, h = frames[0].size
    sheet = Image.new("RGBA", (w * len(frames), h * len(GROUNDS)), (0, 0, 0, 255))
    for g, ground in enumerate(GROUNDS):
        band = Image.new("RGBA", (w * len(frames), h), (*ground, 255))
        for i, f in enumerate(frames):
            band.alpha_composite(f, (i * w, 0))
        sheet.alpha_composite(band, (0, g * h))
    return sheet.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST)


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for old in list(DEST.glob("*.png")) + list(OUT.glob("*.png")):
        old.unlink()
    effects = all_fx()
    placed, meta, y = [], {}, 0
    for fx in effects:
        frames = [cel.image() for cel in fx.frames()]
        cols = min(len(frames), MAX_WIDTH // fx.w)
        meta[fx.key] = {"x": 0, "y": y, "w": fx.w, "h": fx.h, "cols": cols, "ax": fx.ax, "ay": fx.ay, "n": len(frames),
                        "ms": [int(ms) for ms in fx.ms], "loop": bool(fx.loop)}
        placed += [(f, (i % cols) * fx.w, y + (i // cols) * fx.h) for i, f in enumerate(frames)]
        y += -(-len(frames) // cols) * fx.h
        _preview(fx.key, frames).save(OUT / f"{fx.key}.png")
    width = max(m["w"] * m["cols"] for m in meta.values())
    atlas = Image.new("RGBA", (width, y), (0, 0, 0, 0))
    for f, x, top in placed:
        atlas.alpha_composite(f, (x, top))
    atlas.save(DEST / "fx.png", optimize=True)
    both = Image.new("RGBA", (width * 2, y), (0, 0, 0, 255))
    for g, ground in enumerate(GROUNDS):
        half = Image.new("RGBA", (width, y), (*ground, 255))
        half.alpha_composite(atlas)
        both.alpha_composite(half, (g * width, 0))
    both.resize((both.width * 2, both.height * 2), Image.Resampling.NEAREST).save(OUT / "_all.png")

    heroes = [name for name, (_path, _cls, side, _world) in ROSTER.items() if side == "hero"]
    skins = export_skins(heroes)
    (DEST / "fx.json").write_text(json.dumps({"fx": meta, "skins": skins}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"export-fx: {len(effects)} effects, {len(SKINS)} skins and {len(RIMS)} rims × {len(heroes)} heroes → {DEST}")

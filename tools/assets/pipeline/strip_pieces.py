"""Pieces of the strip for the lab's compositions (the start-screen reel) and the app icon: a frame of a figure
sheet, a world's backdrop split into what is behind the fighters and what is in front, and the title's row of
keys. Reads the game's exports (src/assets/strip/figs, src/assets/ui) and the backdrop families.
"""
from __future__ import annotations

import importlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .palette import color

ROOT = Path(__file__).resolve().parents[3]
UI = ROOT / "src" / "assets" / "ui"
FIGS = ROOT / "src" / "assets" / "strip" / "figs"
FIG_META = json.loads((FIGS / "figs.json").read_text())["figs"]

def fig(name: str, anim: str = "idle", i: int = 0, flip: bool = False) -> tuple[Image.Image, int, int]:
    """One frame of a sheet, with its root x and ground y (flipped: root mirrored)."""
    m = FIG_META[name]
    a = m["anims"][anim]
    sheet = Image.open(FIGS / f"{name}.png").convert("RGBA")
    f = sheet.crop((i * m["w"], a["row"] * m["h"], (i + 1) * m["w"], (a["row"] + 1) * m["h"]))
    root = m["root"]
    if flip:
        f = f.transpose(Image.FLIP_LEFT_RIGHT)
        root = m["w"] - 1 - root
    return f, root, m["ground"]

def backdrop(world: int, grade: str = "normal") -> tuple[Image.Image, Image.Image]:
    """A world's backdrop: everything behind the fighters, and the foreground in front of them."""
    bd = importlib.import_module(f".families.backdrop_w{world:02d}", __package__)
    layers = bd.build(grade)
    back = Image.new("RGBA", (bd.W, bd.H), (0, 0, 0, 0))
    fore = Image.new("RGBA", (bd.W, bd.H), (0, 0, 0, 0))
    for name, *_rest in bd.LAYERS:
        (fore if name == "fore" else back).alpha_composite(layers[name])
    return back, fore

def nine(src: Image.Image, w: int, h: int, s: int = 4) -> Image.Image:
    """Stretch a 9-slice key to w×h."""
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sw, sh = src.size
    xs = [(0, s, 0, s), (s, sw - s, s, w - s), (sw - s, sw, w - s, w)]
    ys = [(0, s, 0, s), (s, sh - s, s, h - s), (sh - s, sh, h - s, h)]
    for x0, x1, dx0, dx1 in xs:
        for y0, y1, dy0, dy1 in ys:
            if dx1 > dx0 and dy1 > dy0:
                out.paste(src.crop((x0, y0, x1, y1)).resize((dx1 - dx0, dy1 - dy0), Image.NEAREST), (dx0, dy0))
    return out

def menu(label: str = "Empezar") -> Image.Image:
    """The title's row of keys: options, sound, quit, then the one gold key."""
    font = ImageFont.truetype(str(ROOT / "src" / "assets" / "fonts" / "Jacquard12-Regular.ttf"), 12)
    tw = int(ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength(label, font=font))
    gold_w = 4 + 14 + 2 + tw + 8
    w = 3 * 24 + 2 * 2 + 5 + gold_w
    out = Image.new("RGBA", (w, 24), (0, 0, 0, 0))
    key = Image.open(UI / "ui_btn.png").convert("RGBA")
    for n, sign in enumerate(("opt_gear", "opt_sound", "opt_quit")):
        x = n * 26
        out.alpha_composite(nine(key, 24, 20), (x, 2))
        out.alpha_composite(Image.open(UI / f"{sign}.png").convert("RGBA"), (x + 5, 4))
    gx = 3 * 26 + 3
    out.alpha_composite(nine(Image.open(UI / "ui_btn_gold.png").convert("RGBA"), gold_w, 24), (gx, 0))
    out.alpha_composite(Image.open(UI / "title_play.png").convert("RGBA"), (gx + 3, 4))
    d = ImageDraw.Draw(out)
    d.fontmode = "1"
    d.text((gx + 4 + 14 + 2, 4), label, font=font, fill=color("brass", 1) + (255,))
    return out

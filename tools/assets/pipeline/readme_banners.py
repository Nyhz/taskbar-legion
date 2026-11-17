"""`readme`: the README's pixel-art banners, written into `docs/banners/`.

Built only from what the game itself ships — the exported strip backdrops (`src/assets/strip/wNN_<grade>.png`),
the figures' atlases (`src/assets/strip/figs/`), the interface art (`src/assets/ui/`) and the kit's pixel faces
(`src/assets/fonts/`) — so a banner never shows art the game does not have. Run the exports first if the art changed.

- `banner-hero.png`    — the title over the Golden Meadows, the party facing the Crowmother;
- `banner-classes.png` — the three heroes in the hero window's stone niche, crest, name and signs;
- `banner-worlds.png`  — the ten worlds, each tile split between its Normal and its Torment look, two of its
  creatures on the path.

The README's `screenshot-*.png` beside them are real captures of the running game (scripts/shot-app.mjs, see
docs/TESTING.md), not built here.

Every banner is composed at 1× art pixels and only then enlarged by a whole factor with nearest-neighbour, so
nothing is smoothed. Lettering is rendered at its face's own grid size and thresholded to hard pixels.
Deterministic: the same sources give the same bytes.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
STRIP = ROOT / "src" / "assets" / "strip"
UI = ROOT / "src" / "assets" / "ui"
FONTS = ROOT / "src" / "assets" / "fonts"
DEST = ROOT / "docs" / "banners"
#: Which creature plays which role in each world (the same files export-figs reads).
CASTS = ROOT / "docs" / "redesign" / "lab" / "data"

# The kit's tokens (src/ui/kit/tokens.ts), all tones of the «dusk» palette.
K0, K9 = "#0b0d17", "#e6e6e8"
GOLD, GOLD_HI = "#ebb94f", "#f8dc84"

_BACKDROPS = json.loads((STRIP / "backdrops.json").read_text())
_FIGS = json.loads((STRIP / "figs" / "figs.json").read_text())["figs"]
PATH_Y: int = _BACKDROPS["pathY"]
STRIP_W: int = _BACKDROPS["width"]
STRIP_H: int = _BACKDROPS["height"]


# ── Sources ─────────────────────────────────────────────────────────────────────────────────────────────────

def backdrop(world: int, grade: str = "normal", part: str = "all") -> Image.Image:
    """One world's strip, its parallax layers flattened back to front (the sheet stacks them top to bottom).
    `part` "back" keeps only the layers behind the fighters, "front" only those that pass in front (factor > 1)."""
    key = f"w{world:02d}"
    sheet = Image.open(STRIP / f"{key}_{grade}.png").convert("RGBA")
    out = Image.new("RGBA", (STRIP_W, STRIP_H), (0, 0, 0, 0))
    for i, layer in enumerate(_BACKDROPS["worlds"][key]["layers"]):
        in_front = layer["factor"] > 1
        if (part == "back" and in_front) or (part == "front" and not in_front):
            continue
        out.alpha_composite(sheet.crop((0, i * STRIP_H, STRIP_W, (i + 1) * STRIP_H)))
    return out


def frame(name: str, anim: str = "idle", index: int = 0) -> Image.Image:
    """Frame `index` of a figure's animation: cell (i % cols, row + i // cols) of its atlas (figs.json)."""
    meta = _FIGS[name]
    a = meta["anims"][anim]
    i = index % a["n"]
    col, row = i % meta["cols"], a["row"] + i // meta["cols"]
    sheet = Image.open(STRIP / "figs" / f"{name}.png").convert("RGBA")
    return sheet.crop((col * meta["w"], row * meta["h"], (col + 1) * meta["w"], (row + 1) * meta["h"]))


def place(canvas: Image.Image, name: str, x: int, ground: int, anim: str = "idle", index: int = 0,
          facing_left: bool = False, scale: int = 1) -> None:
    """Stands a figure with its root column at `x` and its ground row on `ground`, as the strip does. Every
    figure is drawn facing right; foes face left in the strip (mirrored about the root column)."""
    meta = _FIGS[name]
    img = frame(name, anim, index)
    root = meta["root"]
    if facing_left:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        root = meta["w"] - 1 - root
    if scale != 1:
        img = img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)
    paste(canvas, img, x - root * scale, ground - meta["ground"] * scale)


def ui(stem: str) -> Image.Image:
    return Image.open(UI / f"{stem}.png").convert("RGBA")


def paste(canvas: Image.Image, img: Image.Image, x: int, y: int) -> None:
    """alpha_composite that tolerates sprites hanging off any edge."""
    sx, sy = max(0, -x), max(0, -y)
    if sx >= img.width or sy >= img.height:
        return
    canvas.alpha_composite(img.crop((sx, sy, img.width, img.height)), (max(0, x), max(0, y)))


# ── Lettering ───────────────────────────────────────────────────────────────────────────────────────────────

#: The kit's faces (Jacquard 12 for names and titles, Jersey for text), each at the FreeType size that lands its
#: own pixel grid on whole pixels (measured: below these the glyphs break, at other sizes their edges blur).
FACES = {"title": ("Jacquard12-Regular.ttf", 21), "text": ("Jersey10-Regular.ttf", 13),
         "big": ("Jersey20-Regular.ttf", 17)}


def lettering(text: str, face: str, color: str, outline: str | None = K0, shadow: str | None = None,
              lower: str | None = None, scale: int = 1) -> Image.Image:
    """`text` as hard pixels: rendered at the face's grid size, alpha thresholded, then a 1-px outline all round
    (the kit's `--ink`) and an optional drop shadow one pixel down-right. `lower` paints the lower half of the
    glyphs in a second tone (a logo's two-tone fill); `scale` enlarges the finished lettering by a whole factor."""
    file, size = FACES[face]
    font = ImageFont.truetype(str(FONTS / file), size)
    left, top, right, bottom = font.getbbox(text)
    pad = 2
    mask = Image.new("L", (right - left + pad * 2, bottom - top + pad * 2), 0)
    ImageDraw.Draw(mask).text((pad - left, pad - top), text, font=font, fill=255)
    mask = mask.point(lambda v: 255 if v >= 128 else 0)
    w, h = mask.size
    out = Image.new("RGBA", (w + 1, h + 1), (0, 0, 0, 0))
    if shadow is not None:
        out.paste(Image.new("RGBA", (w, h), shadow), (1, 1), mask)
    if outline is not None:
        ink = Image.new("RGBA", (w, h), outline)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            out.paste(ink, (dx, dy), mask)
    fill = Image.new("RGBA", (w, h), color)
    if lower is not None:
        box = mask.getbbox() or (0, 0, w, h)
        fill.paste(lower, (0, (box[1] + box[3]) // 2 + 1, w, h))
    out.paste(fill, (0, 0), mask)
    out = out.crop(out.getbbox())
    return enlarge(out, scale) if scale != 1 else out


# ── Chrome ──────────────────────────────────────────────────────────────────────────────────────────────────

def nine_slice(stem: str, w: int, h: int, border: int) -> Image.Image:
    """The kit's window: corners kept, edges and centre stretched (they are flat tones, so stretching is exact)."""
    src = ui(stem)
    sw, sh = src.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    b = border
    xs = [(0, b, 0, b), (b, sw - b, b, w - b), (sw - b, sw, w - b, w)]
    ys = [(0, b, 0, b), (b, sh - b, b, h - b), (sh - b, sh, h - b, h)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            piece = src.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.Resampling.NEAREST)
            out.alpha_composite(piece, (dx0, dy0))
    return out


def enlarge(img: Image.Image, factor: int) -> Image.Image:
    return img.resize((img.width * factor, img.height * factor), Image.Resampling.NEAREST)


def save(img: Image.Image, name: str) -> None:
    """Saved as an exact indexed PNG when the art fits in 256 colours (it should: one palette), else as RGBA."""
    rgba = img.convert("RGBA")
    colors = rgba.getcolors(256)
    path = DEST / name
    if colors is not None:
        tones = sorted(c for _n, c in colors)
        index = {c: i for i, c in enumerate(tones)}
        indexed = Image.new("P", rgba.size)
        indexed.putpalette([v for c in tones for v in c[:3]])
        indexed.putdata([index[c] for c in rgba.getdata()])
        alpha = bytes(c[3] for c in tones)
        indexed.save(path, optimize=True, **({"transparency": alpha} if min(alpha) < 255 else {}))
    else:
        rgba.save(path, optimize=True)
    print(f"readme: {path.relative_to(ROOT)} {img.width}x{img.height}, {path.stat().st_size // 1024} KB")


# ── Banners ─────────────────────────────────────────────────────────────────────────────────────────────────

def hero_banner() -> Image.Image:
    """The Golden Meadows at dusk: the Priest, the Ranger and the Knight against the Crowmother, title above."""
    x0, w, h = 96, 400, 150  # a window of the 600×160 strip: the castle hill, the sun behind the boss
    full = backdrop(1, part="back").crop((x0, 0, x0 + w, h))
    fore = backdrop(1, part="front").crop((x0, 0, x0 + w, h))
    place(full, "priest", 58, PATH_Y, "cast", 7)
    place(full, "ranger", 102, PATH_Y, "aimed", 8)
    place(full, "knight", 172, PATH_Y, "attack", 5)
    place(full, "boar", 214, PATH_Y, "run", 3, facing_left=True)
    place(full, "crowmother", 300, PATH_Y, "attack", 7, facing_left=True)
    full.alpha_composite(fore)
    logo = lettering("Taskbar Legion", "title", GOLD_HI, lower=GOLD, shadow=K0)
    paste(full, logo, 11, 9)
    tag = lettering("Leave it running. Come back richer.", "text", K9)
    paste(full, tag, 12, 9 + logo.height + 4)
    return enlarge(full, 3)


#: Each class's signs, as its talent tree and hero window draw them (src/ui/abilityArt.ts): its signature
#: ability, two more of its trunk and its ultimate.
CLASS_SIGNS = {
    "knight": ("Knight", ["tal_stone_skin", "tal_cleave", "tal_bulwark", "abil_ult_last_stand"]),
    "ranger": ("Ranger", ["abil_rapid_fire", "abil_aimed_shot", "abil_raining_arrows", "abil_ult_hunters_mark"]),
    "priest": ("Priest", ["abil_mend", "abil_healing_light", "abil_holy_shield", "abil_ult_battle_enrage"]),
}


def niche(hero: str) -> Image.Image:
    """The hero window's stone niche with the hero standing in it at ×2 (src/ui/components/HeroIdleSprite: the
    feet 3 px above the figure box, whose bottom is 15 px above the niche's; the body centred across it)."""
    out = ui("ui_alcove")
    meta = _FIGS[hero]
    left, _top, right, _bottom = meta["box"]
    centre = out.width // 2
    x = centre - ((left + right) // 2) * 2
    place(out, hero, x, out.height - 15 - 3, scale=2)
    return out


def classes_banner() -> Image.Image:
    """The three heroes side by side in their niches, crest and name beneath, then their signs."""
    pad, gap, icon, icon_gap = 18, 22, 16, 3
    nw, nh = ui("ui_alcove").size
    w = pad * 2 + nw * 3 + gap * 2
    h = 12 + nh + 8 + 17 + 7 + icon + 14
    out = nine_slice("ui_window", w, h, 10)
    for i, (hero, (name, signs)) in enumerate(CLASS_SIGNS.items()):
        x = pad + i * (nw + gap)
        out.alpha_composite(niche(hero), (x, 12))
        crest = ui(f"crest_{hero}")
        label = lettering(name, "title", GOLD_HI, lower=GOLD, shadow=None)
        row_w = crest.width + 4 + label.width
        y = 12 + nh + 8
        rx = x + (nw - row_w) // 2
        out.alpha_composite(crest, (rx, y))
        paste(out, label, rx + crest.width + 4, y + (crest.height - label.height) // 2)
        icons_w = len(signs) * icon + (len(signs) - 1) * icon_gap
        ix = x + (nw - icons_w) // 2
        for j, stem in enumerate(signs):
            out.alpha_composite(ui(stem), (ix + j * (icon + icon_gap), y + 17 + 7))
    return enlarge(out, 3)


#: Per world, the left edge of the window of its strip each tile shows (its landmarks; in Torment, its dark sun).
WORLD_VIEWS = {1: 150, 2: 150, 3: 150, 4: 180, 5: 200, 6: 120, 7: 150, 8: 170, 9: 150, 10: 60}
#: Every tile shows the same rows: the skyline down to just below the path.
TILE_W, TILE_H = 290, 80
TILE_TOP = PATH_Y + 5 - TILE_H


def world_tile(world: int) -> Image.Image:
    """One world, Normal on the left and Torment on the right, split by a stepped diagonal (one column every
    two rows) drawn in the outline tone."""
    x, y = WORLD_VIEWS[world], TILE_TOP
    normal = backdrop(world, "normal").crop((x, y, x + TILE_W, y + TILE_H))
    torment = backdrop(world, "torment").crop((x, y, x + TILE_W, y + TILE_H))
    out = normal.copy()
    pn, pt, po = normal.load(), torment.load(), out.load()
    ink = Image.new("RGBA", (1, 1), K0).getpixel((0, 0))
    for row in range(TILE_H):
        split = TILE_W // 2 + (TILE_H // 2 - row) // 2
        for col in range(TILE_W):
            if col == split:
                po[col, row] = ink
            elif col > split:
                po[col, row] = pt[col, row]
    # Two of the world's own creatures on its path, facing the party as in the strip.
    cast = {foe["kind"]: foe["key"] for foe in json.loads((CASTS / f"w{world:02d}.json").read_text())["foes"]}
    ground = PATH_Y - y
    place(out, cast["melee"], 96, ground, facing_left=True)
    place(out, cast["beast"], 222, ground, facing_left=True)
    framed = Image.new("RGBA", (TILE_W + 2, TILE_H + 2), K0)
    framed.alpha_composite(out, (1, 1))
    badge = lettering(str(world), "text", GOLD_HI)
    plate = Image.new("RGBA", (badge.width + 5, badge.height + 4), K0)
    plate.alpha_composite(badge, (3, 2))
    framed.alpha_composite(plate, (0, 0))
    return framed


def worlds_banner() -> Image.Image:
    """The ten worlds in two columns of five, each tile half Normal, half Torment."""
    pad, gap, cols = 14, 6, 2
    tw, th = TILE_W + 2, TILE_H + 2
    w = pad * 2 + cols * tw + (cols - 1) * gap
    rows = -(-10 // cols)
    h = pad * 2 + rows * th + (rows - 1) * gap
    out = nine_slice("ui_window", w, h, 10)
    for i in range(10):
        out.alpha_composite(world_tile(i + 1), (pad + (i % cols) * (tw + gap), pad + (i // cols) * (th + gap)))
    return enlarge(out, 2)


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    save(hero_banner(), "banner-hero.png")
    save(classes_banner(), "banner-classes.png")
    save(worlds_banner(), "banner-worlds.png")

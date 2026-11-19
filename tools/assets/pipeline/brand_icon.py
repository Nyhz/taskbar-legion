"""The APP ICON (chosen 2026-11-19 from the lab: proposal 4B): the name as a two-line wordmark in the gothic
lettering of the title's logo (`icon_sets/s94_options.LOGO`), the title logo's brass rule under it, over world 1
in Torment — the blood-red sky and the black eclipse — on a rounded plate with a brass rim.

    sh tools/assets/run.sh app-icon      # src-tauri/app-icon.png (1024 px)
    npm run gen:icon                     # the above, then `tauri icon` expands it into every platform size

Drawn on a 256-px grid and written at 1024 (×4, nearest).
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from .palette import color
from .rig import Cel, Tone
from .icon_sets.s94_options import LOGO

ROOT = Path(__file__).resolve().parents[3]
APP_ICON = ROOT / "src-tauri" / "app-icon.png"
G = 256
M, R = 10, 34  # the plate's margin and corner radius

WORDS = {"Taskbar": (0, 67), "Legion": (73, 125)}

def word(name: str, s: int = 3, ramp: str = "brass") -> Image.Image:
    """A word of the logo at `s` px a glyph cell: beaten metal lit from the top, a dark-brass rim, an ink outline."""
    a, b = WORDS[name]
    rows = [r[a:b] for r in LOGO]
    gw, gh = b - a, len(rows)
    pad = 4
    c = Cel(gw * s + pad * 2, gh * s + pad * 2)
    on = lambda gx, gy: 0 <= gx < gw and 0 <= gy < gh and rows[gy][gx] == "#"  # noqa: E731
    cap = 11 * s  # the letters' body height (the descender of the g goes below)
    for gy in range(gh):
        for gx in range(gw):
            if not on(gx, gy):
                continue
            for dy in range(s):
                for dx in range(s):
                    y = gy * s + dy
                    t = y / cap
                    base = 7 if t < 0.18 else 6 if t < 0.42 else 5 if t < 0.7 else 4 if t < 0.95 else 3
                    if dy == 0 and not on(gx, gy - 1):
                        base = min(7, base + 1)  # the top of a stroke catches the light
                    if dx == 0 and not on(gx - 1, gy) and base < 7:
                        base += 1  # and its left side
                    if dy == s - 1 and not on(gx, gy + 1):
                        base -= 2  # its foot falls in shade
                    elif dx == s - 1 and not on(gx + 1, gy):
                        base -= 1
                    c.put(pad + gx * s + dx, pad + y, (ramp, max(2, min(7, base))))
    # a rim in dark brass, then the ink outline
    rim: dict[tuple[int, int], Tone] = {}
    for (x, y) in list(c.px):
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n not in c.px:
                rim[n] = (ramp, 1)
    c.px.update(rim)
    c.outline()
    ring: dict[tuple[int, int], Tone] = {}
    for (x, y) in list(c.px):
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n not in c.px and 0 <= n[0] < c.w and 0 <= n[1] < c.h:
                ring[n] = ("ink", 0)
    c.px.update(ring)
    return c.image()
def with_shadow(img: Image.Image, dx: int = 2, dy: int = 4, tone: tuple[str, int] = ("ink", 0)) -> Image.Image:
    out = Image.new("RGBA", (img.width + dx, img.height + dy), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, color(*tone) + (255,))
    sh.putalpha(img.getchannel("A"))
    out.alpha_composite(sh, (dx, dy))
    out.alpha_composite(img, (0, 0))
    return out


# ── ornaments ─────────────────────────────────────────────────────────────────────────────────────────────────
def _inside(x: int, y: int, inset: int = 0) -> bool:
    a, b, r = M + inset, G - 1 - M - inset, R - inset
    cx = min(max(x, a + r), b - r)
    cy = min(max(y, a + r), b - r)
    return a <= x <= b and a <= y <= b and (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.5
def plate(fill: Image.Image) -> Image.Image:
    """The rounded plate: `fill` inside, a thin brass rim with an ink edge round it."""
    out = Image.new("RGBA", (G, G), (0, 0, 0, 0))
    px, fp = out.load(), fill.load()
    for y in range(G):
        for x in range(G):
            if not _inside(x, y):
                continue
            if not _inside(x, y, 1) or (not _inside(x, y, 3) and _inside(x, y, 2)):
                px[x, y] = color("ink", 0) + (255,)
            elif not _inside(x, y, 2):
                px[x, y] = color("brass", 6 if x + y < G - 20 else 3) + (255,)
            else:
                px[x, y] = fp[x, y]
    return out
def place_words(img: Image.Image, y1: int, y2: int, x1: int | None = None, x2: int | None = None) -> tuple[int, int, int, int]:
    t, l = with_shadow(word("Taskbar")), with_shadow(word("Legion"))
    ax = (G - t.width) // 2 if x1 is None else x1
    bx = (G - l.width) // 2 if x2 is None else x2
    img.alpha_composite(t, (ax, y1))
    img.alpha_composite(l, (bx, y2))
    return ax, y1, bx, y2


# ── the proposals ─────────────────────────────────────────────────────────────────────────────────────────────
def rule(img: Image.Image, y: int, x0: int = 40, x1: int = 216) -> None:
    """The logo's rule: a brass line that thins towards its ends, a lozenge in the middle."""
    c = Cel(G, G)
    mid = (x0 + x1) // 2
    for x in range(x0, x1):
        far = abs(x - mid)
        tone = 6 if far < 30 else 5 if far < 60 else 4
        c.put(x, y, ("brass", tone))
        if far < 70:
            c.put(x, y + 1, ("brass", 3))
    for dy in range(-5, 6):
        half = 5 - abs(dy)
        for dx in range(-half, half + 1):
            c.put(mid + dx, y + dy, ("brass", 7 if dy < 0 and dx <= 0 else 5 if dy <= 0 else 4))
    c.outline()
    img.alpha_composite(with_shadow(c.image(), 1, 2))
def _torment_scene() -> Image.Image:
    """World 1 in Torment behind the plate: the blood-red sky continued above the backdrop, the black eclipse."""
    from .strip_pieces import backdrop

    back, fore = backdrop(1, "torment")
    x0 = 430 - 128
    scene = Image.new("RGBA", (G, G), back.getpixel((x0 + 5, 2)))
    scene.alpha_composite(back.crop((x0, 0, x0 + G, 160)), (0, G - 160 - 4))
    scene.alpha_composite(fore.crop((x0, 0, x0 + G, 160)), (0, G - 160 - 4))
    return scene
def clip(img: Image.Image) -> Image.Image:
    """Keep only what is on the plate (ornaments may run over its edge)."""
    out = Image.new("RGBA", (G, G), (0, 0, 0, 0))
    mask = Image.new("L", (G, G), 0)
    mp = mask.load()
    for y in range(G):
        for x in range(G):
            if _inside(x, y, 3):
                mp[x, y] = 255
    rim = plate(Image.new("RGBA", (G, G), (0, 0, 0, 0)))
    out.alpha_composite(rim)
    inner = Image.composite(img, Image.new("RGBA", (G, G), (0, 0, 0, 0)), mask)
    out.alpha_composite(inner)
    return out

def app_icon() -> Image.Image:
    """The name in old gold over the blood harvest, the logo's rule under it."""
    img = plate(_torment_scene())
    place_words(img, 30, 84)
    rule(img, 146, 52, 204)
    return clip(img)


def main() -> None:
    app_icon().resize((1024, 1024), Image.NEAREST).save(APP_ICON)
    print(f"wrote {APP_ICON.relative_to(ROOT)}")

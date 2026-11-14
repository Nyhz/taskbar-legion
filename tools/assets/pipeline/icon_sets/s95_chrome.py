"""Interface chrome: the window frame, tooltip, buttons, tabs and wells as pixel art rather than CSS boxes. The
panels use them as nine-slices (`border-image` in the mock-ups, a nine-slice sprite in the game), so a corner is
drawn once and the edges stretch. Also the alcove the hero stands in on the hero panel.
"""
from __future__ import annotations

import math

from PIL import Image

from ..rig import Cel, Tone


def _cel(rows: list[str], legend: dict[str, Tone]) -> Cel:
    c = Cel(len(rows[0]), len(rows))
    c.stamp(rows, legend, 0, 0)
    return c


def _mirrored(quad: list[str]) -> list[str]:
    """A whole plate from its top-left quarter."""
    top = [r + r[::-1] for r in quad]
    return top + top[::-1]


# Window, 24×24, slice 10. A dark plate with a thin dim line for an edge and a brass fitting on each corner (the
# same bracket the top rarity frames carry), so the gold stays in the corners and the edges stay quiet.
WINDOW_QUAD = [
    "..kkkkkkkkkk",
    ".kGGGGGGGkdd",
    "kGHggggggkbb",
    "kGgkkkkkkkbb",
    "kGgkbbbbbbbb",
    "kGgkbbbbbbbb",
    "kGgkbbbbbbbb",
    "kGgkbbbbbbbb",
    "kGgkbbbbbbbb",
    "kkkkbbbbbbbb",
    "kdbbbbbbbbbb",
    "kdbbbbbbbbbb",
]


def window() -> Image.Image:
    rows = _mirrored(WINDOW_QUAD)
    lit = {"k": ("ink", 0), "d": ("ink", 3), "b": ("ink", 1), "G": ("brass", 5), "H": ("brass", 7), "g": ("brass", 3)}
    low = {**lit, "G": ("brass", 4), "H": ("brass", 5), "g": ("brass", 2), "d": ("ink", 2)}  # the lower half sits in shade
    c = Cel(24, 24)
    c.stamp(rows[:12], lit, 0, 0)
    c.stamp(rows[12:], low, 0, 12)
    return c.image()


def tip() -> Image.Image:  # tooltip, 12×12, slice 4: near-black, a steel line, the corners stepped
    return _cel(_mirrored([
        "..kkkk",
        ".kkddd",
        "kkdkkk",
        "kdkkkk",
        "kdkkkk",
        "kdkkkk",
    ]), {"k": ("ink", 0), "d": ("ink", 4)}).image()


def button(ramp: str, hi: int, body: int, shade: int, lip: int) -> Image.Image:
    """14×14, slice 4: a raised key — lit top edge, a shaded foot and a dark lip under it."""
    rows = [".kkkkkkkkkkkk.", "khhhhhhhhhhhhk"] + ["khBBBBBBBBBBsk"] * 9 + ["kssssssssssssk", "kllllllllllllk", ".kkkkkkkkkkkk."]
    return _cel(rows[:1] + rows[1:2] + rows[2:10] + rows[11:], {"k": ("ink", 0), "h": (ramp, hi), "B": (ramp, body), "s": (ramp, shade), "l": (ramp, lip)}).image()


def tab(on: bool) -> Image.Image:
    """22×22: a bookmark that sticks out of the window's left edge. The lit one is brass-edged and takes the
    colour of the window, which it overlaps, so the two read as one piece."""
    w = h = 22
    c = Cel(w, h)
    edge: Tone = ("brass", 4) if on else ("ink", 3)
    body: Tone = ("ink", 1) if on else ("ink", 2)
    for y in range(h):
        for x in range(w):
            corner = (x, y) in ((0, 0), (0, h - 1), (1, 0), (0, 1), (1, h - 1), (0, h - 2))
            if corner and (x, y) not in ((1, 0), (0, 1), (1, h - 1), (0, h - 2)):
                continue
            if x == 0 or y == 0 or y == h - 1 or (x, y) in ((1, 1), (1, h - 2)):
                c.put(x, y, ("ink", 0))
            elif y == 1 or (on and (x == 1 or y == h - 2)):
                c.put(x, y, edge if y == 1 or on else body)
            elif y == h - 2:
                c.put(x, y, ("ink", 1))
            else:
                c.put(x, y, body)
    if on:
        c.put(2, 2, ("brass", 6))
    return c.image()


def well() -> Image.Image:  # an empty slot, 36×36: sunk, darker than any frame
    c = Cel(36, 36)
    for y in range(36):
        for x in range(36):
            ring = min(x, y, 35 - x, 35 - y)
            c.put(x, y, ("ink", 2) if ring == 0 else ("ink", 0))
    for i in range(1, 35):
        c.put(i, 34, ("ink", 1))
        c.put(34, i, ("ink", 1))
    return c.image()


def rule() -> Image.Image:  # the ornament in the middle of a divider, 9×5
    return _cel([
        "....g....",
        "...gHg...",
        "d.gHGHg.d",
        "...gGg...",
        "....g....",
    ], {"g": ("brass", 3), "G": ("brass", 5), "H": ("brass", 6), "d": ("ink", 3)}).image()


def close() -> Image.Image:
    """13×13: the close key. It sits on the window's top-right corner in place of the brass fitting."""
    return _cel([
        "..kkkkkkkkk..",
        ".khhhhhhhhhk.",
        "khRRRRRRRRRsk",
        "khRwRRRRRwRsk",
        "khRRwRRRwRRsk",
        "khRRRwRwRRRsk",
        "khRRRRwRRRRsk",
        "khRRRwRwRRRsk",
        "khRRwRRRwRRsk",
        "khRwRRRRRwRsk",
        "khRRRRRRRRRsk",
        ".klllllllllk.",
        "..kkkkkkkkk..",
    ], {"k": ("ink", 0), "h": ("crimson", 4), "R": ("crimson", 3), "s": ("crimson", 2), "l": ("crimson", 1), "w": ("bone", 7)}).image()


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def alcove() -> Image.Image:
    """100×116: a stone niche for the hero panel. Dusk light pools behind the figure and thins to night at the
    edges (ordered dither between neighbouring tones); a slab to stand on, its top edge at y = 100."""
    w, h, mid, spring, rad, floor = 100, 116, 49.5, 50.0, 44.0, 98
    c = Cel(w, h)
    for y in range(h):
        for x in range(w):
            dx = x - mid
            d = (abs(dx) if y >= spring else math.hypot(dx, y - spring)) - rad
            if d > 5:
                continue
            if d > 4 or 0 < d <= 1 or y == h - 1:
                c.put(x, y, ("ink", 0))
            elif d > 1:  # the stone rim, lit from the upper left, jointed
                ang = math.degrees(math.atan2(spring - y, dx)) if y < spring else None
                joint = (round(ang) % 30 == 15) if ang is not None else ((y - int(spring)) % 16 == 15)
                tone = 4 if (dx < 0 and y < spring + 10) else 3 if dx < 0 or y < spring else 2
                c.put(x, y, ("ink", 1) if joint else ("ink", tone))
            elif y >= floor:  # the slab: a lit lip, the top face, then the front
                depth = y - floor
                c.put(x, y, ("ink", 5) if depth == 0 else ("ink", 4) if depth <= 3 else ("ink", 1) if depth == 4 or (x % 22 == 7 and depth > 4) else ("ink", 2 if depth < 12 else 1))
            else:
                glow = max(0.0, 1.0 - math.hypot(dx / 46.0, (y - 82.0) / 66.0))
                level = glow * 4.2
                base = int(level)
                step = base + (1 if (level - base) * 16 > BAYER[y % 4][x % 4] + 0.5 else 0)
                c.put(x, y, ("dusk", min(4, step)))
    for x in range(34, 67):  # the figure's shadow on the slab
        for y in (100, 101):
            if abs(x - 50) <= (16 if y == 100 else 13):
                c.put(x, y, ("ink", 2))
    return c.image()


def build() -> list[dict]:
    return [{
        "key": "chrome",
        "title": "Piezas del marco",
        "note": "El marco de la interfaz dibujado en pixel art: ventana, tooltip, botones, pestañas y casilla vacía se estiran por sus bordes (nine-slice); el nicho es donde posa el héroe en su panel.",
        "items": [
            ("ui_window", "Ventana", window()), ("ui_tip", "Tooltip", tip()),
            ("ui_btn", "Botón", button("dusk", 4, 3, 2, 1)), ("ui_btn_gold", "Botón principal", button("brass", 6, 5, 4, 2)), ("ui_btn_off", "Botón apagado", button("ink", 4, 3, 2, 1)),
            ("ui_tab", "Pestaña", tab(False)), ("ui_tab_on", "Pestaña activa", tab(True)),
            ("ui_well", "Casilla vacía", well()), ("ui_rule", "Adorno de separador", rule()), ("ui_x", "Cerrar", close()),
            ("ui_alcove", "Nicho del héroe", alcove()),
        ],
    }]

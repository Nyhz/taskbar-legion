"""World 8 backdrop — the ash lands and their forges under a red, smoke-laden sky — in every difficulty grade.

An industrial hell lit from below. Layers (back to front): sky (a dull sun veiled by haze over a hot horizon),
clouds (rolling banks of smoke, their bellies lit by the fires), far (rugged volcano cones with glowing lava and
smoke columns, and a distant skyline of stacks), forges (blast furnaces with burning mouths, chimney stacks, a
great wheel, a crane with a ladle, sheds with lit windows, pipes, slag heaps), mist (ash and embers drifting),
ground (a river of lava with crust plates behind a slag bank and chained bollards, the path of ash and iron
plates, and cracked crust with half-buried gears, ingots and chains below it) and foreground (anvil, gear, slag,
chain pile; chains and a ladle hanging from above). Depth is by value: the further, the closer to the sky's red.
The Torment grade is the cold forges: the fire has died. Ash-grey and iron-black under a lid of black smoke, the
river crusted over and buried in ash, the works split and silent, and where the fire was only thin seams of a
wrong, cold white-blue light. The Rift and its crystals are the one violet thing left.

`ATMOSPHERE` is the weather the strip runs in real time: embers and ash in Normal; in Torment a heavy ash-fall,
sheet lightning inside the smoke, the light stuttering and the cold seams breathing.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, fill_below, periodic, put, vertical_gradient
from ..palette import Color, color, hex_of
from ..raster import Shape, capsule, circle, ellipse, polygon, rasterize, rect, ring
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("crimson", 2)


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    sun: tuple[Color, Color, Color]  # disc, rim, veil across it
    smoke: tuple[Color, Color, Color, Color]  # top, body, belly, underside lit by the fire
    far: tuple[Color, Color, Color]  # volcanoes: shadow, body, rim
    skyline: tuple[Color, Color]  # the distant works: body, rim
    forge: tuple[Color, Color, Color, Color]  # the forges: shadow, body, firelit, rim
    haze: tuple[Color, Color, Color]  # the foot of the works seen through the heat off the river: shade, body, rim
    fire: tuple[Color, Color, Color, Color, Color]  # core, bright, mid, edge, halo
    crust: tuple[Color, Color]  # cooled lava and slag: body, lit lip
    path: tuple[Color, Color, Color]  # dark, body, light
    plate: tuple[Color, Color, Color]  # iron plates on the path: shadow, body, lit edge
    ash: tuple[Color, Color, Color, Color]  # near ground: light, body, deep, deepest
    iron: tuple[Color, Color, Color]  # scrap below the path: shadow, body, lit
    fore: tuple[Color, Color]
    flecks: tuple[Color, Color]  # ash in the air
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("ink", 0), _c("crimson", 0), _c("crimson", 1), _c("crimson", 2), _c("crimson", 3), _c("crimson", 3), _c("crimson", 4), _c("crimson", 4), _c("crimson", 5)],
    sky_end=108,
    sun=(_c("crimson", 5), _c("crimson", 6), _c("crimson", 3)),
    smoke=(_c("dusk", 0), _c("dusk", 2), _c("crimson", 3), _c("crimson", 5)),
    far=(_c("crimson", 1), _c("crimson", 2), _c("crimson", 4)),
    skyline=(_c("crimson", 1), _c("crimson", 3)),
    forge=(_c("ink", 0), _c("crimson", 0), _c("crimson", 1), _c("crimson", 4)),
    haze=(_c("crimson", 1), _c("crimson", 2), _c("crimson", 3)),
    fire=(_c("light", 0), _c("brass", 6), _c("brass", 5), _c("crimson", 5), _c("crimson", 4)),
    crust=(_c("ink", 1), _c("crimson", 5)),
    path=(_c("ink", 1), _c("ink", 2), _c("ink", 3)),
    plate=(_c("ink", 1), _c("ink", 3), _c("ink", 5)),
    ash=(_c("ink", 3), _c("ink", 2), _c("ink", 2), _c("ink", 1)),
    iron=(_c("ink", 0), _c("ink", 3), _c("ink", 5)),
    fore=(_c("ink", 0), _c("crimson", 4)),
    flecks=(_c("bone", 4), _c("bone", 2)),
)

# Cold forges: bone for the ash, ink for the iron, and azure-white for the only light left.
TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("ink", 0), _c("ink", 1), _c("bone", 0), _c("bone", 0), _c("bone", 1), _c("bone", 1), _c("bone", 2), _c("bone", 2)],
    sky_end=108,
    sun=(_c("ink", 0), _c("azure", 7), _c("bone", 1)),
    smoke=(_c("ink", 0), _c("ink", 1), _c("ink", 2), _c("bone", 2)),
    far=(_c("bone", 0), _c("bone", 1), _c("bone", 2)),
    skyline=(_c("bone", 0), _c("bone", 1)),
    forge=(_c("ink", 0), _c("ink", 1), _c("ink", 2), _c("bone", 3)),
    haze=(_c("bone", 1), _c("bone", 2), _c("bone", 2)),  # no rim lines in the ash: the foot of the works is one soft mass
    fire=(_c("light", 0), _c("azure", 8), _c("azure", 6), _c("azure", 4), _c("azure", 2)),
    crust=(_c("ink", 1), _c("bone", 3)),
    path=(_c("ink", 2), _c("ink", 3), _c("ink", 4)),
    plate=(_c("ink", 2), _c("ink", 4), _c("ink", 5)),
    ash=(_c("bone", 3), _c("bone", 1), _c("ink", 2), _c("ink", 1)),
    iron=(_c("ink", 0), _c("ink", 2), _c("bone", 3)),
    fore=(_c("ink", 0), _c("bone", 3)),
    flecks=(_c("bone", 5), _c("bone", 3)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- helpers
def _pixels(shape: Shape) -> set[tuple[int, int]]:
    """The pixels of a shape, allowing it to hang over either edge of the tile (they are wrapped when painted)."""
    pts = rasterize(_shift(shape, W), W * 3, H)
    return {(x - W, y) for (x, y) in pts}


def _form(img: Image.Image, shape: Shape, shadow: Color, body: Color, rim: Color, sun: int = 1, depth: int = 2) -> set[tuple[int, int]]:
    """A solid with volume: a lit rim on top and on the sun side, a band of shadow on the other side."""
    pts = _pixels(shape)
    for (x, y) in pts:
        if (x, y - 1) not in pts or (x + sun, y) not in pts:
            c = rim
        elif any((x - sun * k, y) not in pts for k in range(1, depth + 1)):
            c = shadow
        else:
            c = body
        put(img, x, y, c)
    return pts


def _billows(img: Image.Image, puffs: list[tuple[float, float, float]], tones: tuple[Color, Color, Color, Color], slab: Shape | None = None) -> None:
    """Smoke as a mass of round billows: dark crowns, lit bellies, and the edge of each billow showing inside.
    `slab` is a flat underside for a bank of it."""
    top, body, belly, lit = tones
    shape = slab
    for cx, cy, r in puffs:
        shape = circle(cx, cy, r) if shape is None else shape | circle(cx, cy, r)
    if shape is None:
        return
    pts = _pixels(shape)
    col: dict[tuple[int, int], Color] = {}
    for (x, y) in pts:
        if (x, y + 1) not in pts:
            col[(x, y)] = lit
        elif (x, y + 2) not in pts or (x, y + 3) not in pts:
            col[(x, y)] = belly
        elif (x, y - 1) not in pts or (x, y - 2) not in pts:
            col[(x, y)] = top
        else:
            col[(x, y)] = body
    for cx, cy, r in puffs:
        if r < 4 or slab is not None:  # a flat bank keeps a clean belly
            continue
        for y in range(int(cy + r * 0.3), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if r - 1.6 < d <= r and col.get((x, y)) == body:
                    col[(x, y)] = belly
    for (x, y), c in col.items():
        put(img, x, y, c)


def _glow(img: Image.Image, cx: float, cy: float, r: float, inner: Color, outer: Color, only: set[tuple[int, int]] | None = None) -> None:
    """Light spilling round a fire: a solid ring of the inner tone, then a broken one of the outer."""
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if d > r or (only is not None and (x, y) not in only):
                continue
            if d < r * 0.6:
                put(img, x, y, inner)
            elif (x + y) % 2 == 0 or d < r * 0.8:
                put(img, x, y, outer)


def _mouth(img: Image.Image, x: float, base: float, w: int, h: int, g: Grade) -> None:
    """A furnace mouth: an arch full of fire, hottest at the hearth."""
    core, bright, mid, edge, halo = g.fire
    for dy in range(h):
        half = w / 2 * (1.0 if dy < h * 0.55 else math.sqrt(max(0.0, 1 - ((dy - h * 0.55) / (h * 0.45)) ** 2)))
        for dx in range(int(-half), int(half) + 1):
            t = math.hypot(dx / max(1.0, w / 2), dy / h)
            put(img, int(x) + dx, int(base) - 1 - dy, core if t < 0.4 else bright if t < 0.7 else mid if t < 0.95 else edge)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=1.0)
    px = img.load()
    for y in range(g.sky_end, H):
        for x in range(W):
            px[x, y] = (*g.sky[-1], 255)
    disc, rim, veil = g.sun
    sx, sy = 436, 58
    if g.torment:
        # No stars: a lid of smoke. Under it veils of pale ash hang in long flat sheets, and the sun is a black
        # disc with a cold corona: a thin hard ring, then a broken one, and a few rays.
        for _ in range(12):
            cx, cy = rng.uniform(0, W), rng.uniform(34, 96)
            tone = g.sky[min(len(g.sky) - 1, int(cy / g.sky_end * (len(g.sky) - 1)) + 1)] if cy < 70 else _c("bone", 3)
            for (x, y) in _pixels(ellipse(cx, cy, rng.uniform(34, 90), rng.uniform(0.6, 1.5))):
                put(img, x, y, tone)
        for (x, y) in rasterize(circle(sx, sy, 20), W, H):
            d = math.hypot(x + 0.5 - sx, y + 0.5 - sy)
            if d > 17.5 and (x + y) % 2 == 0:
                px[x, y] = (*_c("azure", 3), 255)
        for (x, y) in rasterize(circle(sx, sy, 16), W, H):
            px[x, y] = (*rim, 255)
        for (x, y) in rasterize(circle(sx, sy, 14.6), W, H):
            px[x, y] = (*disc, 255)
        for k in range(10):
            a = math.tau * k / 10 + 0.2
            for r in range(18, 22 + (k % 3) * 3):
                x, y = int(sx + math.cos(a) * r), int(sy + math.sin(a) * r)
                if 0 <= x < W and 0 <= y < H:
                    px[x, y] = (*(_c("azure", 5) if r < 21 else _c("azure", 3)), 255)
        for cy, half, ry in ((53, 34, 1.0), (63, 46, 1.3)):  # ash drifting across it
            for (x, y) in rasterize(ellipse(sx + rng.uniform(-8, 8), cy, half, ry), W, H):
                px[x, y] = (*veil, 255)
        _rift(img, rng)
        return img
    # A dull sun: a disc no brighter than the fires, with a faint halo, cut by veils of haze.
    for (x, y) in rasterize(circle(sx, sy, 19), W, H):
        if (x + y) % 2 == 0:
            px[x, y] = (*g.sky[6], 255)
    for (x, y) in rasterize(circle(sx, sy, 15), W, H):
        px[x, y] = (*rim, 255)
    for (x, y) in rasterize(circle(sx, sy, 13.5), W, H):
        px[x, y] = (*disc, 255)
    for cy, half, ry in ((52, 40, 1.2), (61, 54, 1.6), (67, 30, 1.0)):
        for (x, y) in rasterize(ellipse(sx + rng.uniform(-8, 8), cy, half, ry), W, H):
            px[x, y] = (*veil, 255)
    # Long flat streaks of haze high up, and the heat of the lava fields along the horizon.
    for _ in range(9):
        cx, cy = rng.uniform(0, W), rng.uniform(26, 92)
        band = min(len(g.sky) - 1, int(cy / g.sky_end * (len(g.sky) - 1)) + 1)
        for (x, y) in _pixels(ellipse(cx, cy, rng.uniform(30, 80), rng.uniform(0.6, 1.4))):
            put(img, x, y, g.sky[band])
    f = periodic(W, rng, [(1, 2.4), (2, 1.6), (5, 0.8)])
    for x in range(W):
        top = int(98 + f(x))
        for y in range(top, g.sky_end):
            t = (y - top) / max(1, g.sky_end - top)
            px[x, y] = (*dither_pick([_c("crimson", 5), _c("crimson", 6), _c("brass", 5)], t, x, y), 255)
    return img


def smoke(g: Grade, rng: random.Random) -> Image.Image:
    """Banks of smoke rolling over the works: flat underneath, heaped above, lit from below the lower they hang."""
    img = blank(W, H)
    top, body, belly, lit = g.smoke
    for i in range(8):
        cx = i * W / 8 + rng.uniform(-30, 30)
        cy = rng.uniform(12, 56)
        length = rng.uniform(46, 104)
        puffs = []
        n = int(length / 8)
        for k in range(n):
            t = (k + 0.5) / n
            r = (3.0 + 7.5 * math.sin(math.pi * t) ** 0.8) * rng.uniform(0.8, 1.2)
            puffs.append((cx - length / 2 + t * length + rng.uniform(-2, 2), cy - r * 0.95, r))
        slab = ellipse(cx, cy - 1.5, length / 2 + 4, 3.6)
        # High smoke only catches a little of the glow.
        _billows(img, puffs, (top, body, belly, lit) if cy > 32 else (top, body, body, belly), slab)
    return img


def _cone(img: Image.Image, cx: float, base: float, hgt: float, half: float, g: Grade, rng: random.Random) -> None:
    """A volcano: concave slopes broken by ledges, a notched rim, gullies, lava glowing down one flank."""
    shadow, body, rim = g.far
    core, bright, mid, edge, halo = g.fire
    crater = 4.5 + half * 0.07
    top = base - hgt
    n = 8
    left = [(cx - half + (half - crater) * (i / n) + rng.uniform(-1.5, 1.5), base - hgt * (i / n) ** 1.55 + rng.uniform(-1.2, 1.2)) for i in range(n)]
    right = [(cx + half * 0.94 - (half * 0.94 - crater) * (i / n) + rng.uniform(-1.5, 1.5), base - (hgt - 2.5) * (i / n) ** 1.5 + rng.uniform(-1.2, 1.2)) for i in range(n)]
    lip = [(cx - crater, top - 1.0), (cx - crater * 0.45, top + 1.5), (cx + crater * 0.1, top + 3.0), (cx + crater * 0.55, top + 2.0), (cx + crater, top + 2.5)]
    pts = _pixels(polygon([(cx - half - 3, base + 4)] + left + lip + right[::-1] + [(cx + half + 3, base + 4)]))
    # The flank away from the sun is in shadow; the split runs down from the notch.
    for (x, y) in pts:
        t = (y - top) / max(1.0, hgt)
        ridge = cx - crater * 0.2 - t * half * 0.22
        edge_px = (x, y - 1) not in pts or (x + 1, y) not in pts
        put(img, x, y, rim if edge_px else shadow if x < ridge else body)
    # Gullies: dark seams on the lit flank, paler ones on the dark flank.
    for k in range(7):
        x = cx + rng.uniform(-crater, crater) + (k - 3) * 1.5
        y = top + rng.uniform(4, 10)
        drift = (k - 3) * 0.28 + rng.uniform(-0.1, 0.1)
        while y < base and (int(x), int(y)) in pts:
            t = (y - top) / max(1.0, hgt)
            lit_side = x >= cx - crater * 0.2 - t * half * 0.22
            if rng.random() < 0.8:
                put(img, int(x), int(y), shadow if lit_side else body)
            y += 1.0
            x += drift * (1.0 + t * 1.8) + rng.uniform(-0.4, 0.4)
    # Lava: it wells in the notch, runs down in two streams that glow on the rock, and pools at the foot.
    for dx in range(int(-crater * 0.5), int(crater * 0.7) + 1):
        put(img, int(cx) + dx, int(top + 3), bright if not g.torment or abs(dx) < 2 else body)
        if g.torment:
            continue
        put(img, int(cx) + dx, int(top + 2), core if abs(dx) < 2 else mid)
        put(img, int(cx) + dx, int(top + 1), edge)
        put(img, int(cx) + dx, int(top), halo)
    for start, drift, wide in (((0.1, 0.42, 1),) if g.torment else ((0.1, 0.42, 2), (-0.3, -0.3, 1))):
        x, y = cx + crater * start, top + 4.0
        while y < base + 1:
            t = (y - top) / max(1.0, hgt)
            c = bright if t < 0.3 else mid if t < 0.62 else edge
            for k in range(wide if t < 0.75 else 1):
                put(img, int(x) + k, int(y), core if (wide == 2 and k == 0 and t < 0.18) else c)
            for k in (-1, wide if t < 0.75 else 1):
                if (int(x) + k, int(y)) in pts and rng.random() < 0.85:
                    put(img, int(x) + k, int(y), halo)
            y += 1.0
            x += drift * (0.6 + t * 2.2) + rng.uniform(-0.5, 0.5)
        if g.torment:
            continue  # nothing reaches the foot any more
        for (a, b) in _pixels(ellipse(x, base + 1.5, rng.uniform(5, 9), 1.6)):
            put(img, a, b, mid if abs(a - x) < 3 else edge)
    if g.torment:
        return  # no plume: the mountain is dead
    # The plume: puffs that swell and lean downwind as they climb; the lowest are lit by the crater.
    stop, sbody, sbelly, slit = g.smoke
    low, high = [], []
    for k in range(10):
        puff = (cx + k * 3.0 + rng.uniform(-2.0, 2.0), top - 1 - k * 3.6 + rng.uniform(-1, 1), 2.6 + k * 1.05 + rng.uniform(-0.6, 0.8))
        (low if k < 3 else high).append(puff)
    _billows(img, high, (stop, sbody, sbody, sbelly))
    _billows(img, low, (sbody, sbelly, slit, edge))


def far(g: Grade, rng: random.Random) -> Image.Image:
    """Volcano cones on the horizon and, in front of them, the skyline of works too far to make out."""
    img = blank(W, H)
    f = periodic(W, rng, [(2, 2.0), (3, 1.6), (7, 0.8)])
    contour = lambda x: 98 + f(x)  # noqa: E731
    for cx, hgt, half in ((92, 46, 66), (306, 31, 50), (486, 55, 76)):
        _cone(img, cx, contour(cx) + 2, hgt, half, g, rng)
    body, rim = g.skyline
    core, bright, mid, edge, halo = g.fire
    # The distant works: stacks, sheds with saw-tooth roofs, a gasometer, a few lights.
    for i in range(22):
        x = i * W / 22 + rng.uniform(-8, 8)
        base = contour(x) + 2
        kind = rng.random()
        if kind < 0.55:
            hgt = rng.uniform(9, 24)
            shape = polygon([(x - 1.6, base), (x + 1.6, base), (x + 1.0, base - hgt), (x - 1.0, base - hgt)]) | rect(x - 1.6, base - hgt - 1, x + 1.6, base - hgt)
            _form(img, shape, body, body, rim)
            if not g.torment:
                put(img, int(x), int(base - hgt) - 2, mid)
                for k in range(1, rng.randint(4, 9)):  # a thread of smoke
                    put(img, int(x + k * 0.9), int(base - hgt - 2 - k * 1.3), body)
        elif kind < 0.85:
            wid = rng.uniform(10, 18)
            shape = rect(x - wid / 2, base - 5, x + wid / 2, base)
            for k in range(int(wid // 5)):
                x0 = x - wid / 2 + k * 5
                shape = shape | polygon([(x0, base - 5), (x0 + 5, base - 5), (x0, base - 9)])
            _form(img, shape, body, body, rim)
            if not g.torment:
                for k in range(int(wid // 4)):
                    put(img, int(x - wid / 2 + 2 + k * 4), int(base) - 3, mid if k % 2 else edge)
        else:
            _form(img, ellipse(x, base - 6, 6, 5) | rect(x - 6, base - 6, x + 6, base), body, body, rim)
    fill_below(img, contour, body, rim, y_end=114)
    return img


def _stack(img: Image.Image, x: float, base: float, hgt: float, wid: float, g: Grade, rng: random.Random, smoke_len: int = 8) -> tuple[float, float]:
    """A chimney stack: tapered, banded, collared; it smokes unless the works are dead. Returns its top."""
    shadow, body, lit, rim = g.forge
    core, bright, mid, edge, halo = g.fire
    top = base - hgt
    if g.torment:
        top += hgt * rng.uniform(0.2, 0.45)  # snapped off
    shape = polygon([(x - wid / 2, base), (x + wid / 2, base), (x + wid * 0.36, top), (x - wid * 0.36, top)]) | rect(x - wid * 0.36 - 1, top - 2, x + wid * 0.36 + 1, top)
    if g.torment:
        shape = shape | polygon([(x - wid * 0.36, top), (x - wid * 0.1, top - 5), (x + wid * 0.1, top)])
    _form(img, shape, shadow, body, rim)
    for k in range(1, 4):  # iron bands
        y = base - hgt * k / 4
        if y > top + 3:
            half = wid / 2 - (wid / 2 - wid * 0.36) * (base - y) / max(1.0, hgt)
            for dx in range(int(-half) + 1, int(half)):
                put(img, int(x) + dx, int(y), lit)
    if not g.torment:
        for dx in range(int(-wid * 0.36), int(wid * 0.36) + 1):
            put(img, int(x) + dx, int(top) - 3, bright if abs(dx) < wid * 0.2 else mid)
        put(img, int(x), int(top) - 4, core)
        puffs = [(x + k * 2.4 + rng.uniform(-1.2, 1.2), top - 6 - k * 2.6 + rng.uniform(-0.8, 0.8), 2.4 + k * 0.9) for k in range(smoke_len)]
        stop, sbody, sbelly, slit = g.smoke
        _billows(img, puffs[2:], (shadow, body, lit, lit))
        _billows(img, puffs[:2], (body, lit, sbelly, edge))
    return x, top - 2


def _blast_furnace(img: Image.Image, x: float, base: float, hgt: float, g: Grade, rng: random.Random) -> None:
    """A blast furnace: a banded bottle of iron with a burning mouth, a skip hoist climbing to its throat and a
    fat pipe coming down the other side to a dust catcher."""
    shadow, body, lit, rim = g.forge
    core, bright, mid, edge, halo = g.fire
    w0, w1, w2 = 11.0, 13.0, 6.0
    profile = [(0.0, w0), (0.32, w1), (0.84, w2), (1.0, w2 + 1.5)]

    def half_at(t: float) -> float:
        for (t0, a), (t1, b) in zip(profile, profile[1:]):
            if t <= t1:
                return a + (b - a) * (t - t0) / (t1 - t0)
        return profile[-1][1]

    bottle = polygon([(x - half_at(t), base - hgt * t) for t, _w in profile] + [(x + half_at(t), base - hgt * t) for t, _w in profile[::-1]])
    cap = rect(x - w2 - 3, base - hgt - 3, x + w2 + 3, base - hgt) | rect(x - 2.5, base - hgt - 9, x - 0.5, base - hgt) | rect(x + 1.5, base - hgt - 12, x + 3.5, base - hgt)
    hoist = capsule(x + 31, base, x + w2 + 2, base - hgt - 1, 1.3)
    down = capsule(x - w2, base - hgt + 2, x - 25, base - hgt * 0.5, 2.2)
    catcher = rect(x - 30, base - hgt * 0.52, x - 20, base - hgt * 0.2) | polygon([(x - 30, base - hgt * 0.2), (x - 20, base - hgt * 0.2), (x - 25, base - hgt * 0.06)])
    legs = rect(x - 30, base - hgt * 0.2, x - 29, base) | rect(x - 21, base - hgt * 0.2, x - 20, base)
    if g.torment:
        # Split down the middle; the throat has fallen in.
        bottle = bottle - polygon([(x - 0.5, base - hgt - 13), (x + 3.5, base - hgt - 13), (x - 1.5, base - hgt * 0.55), (x + 2.5, base), (x - 0.5, base), (x - 4.0, base - hgt * 0.55)])
        cap = rect(x - w2 - 3, base - hgt - 3, x - 2, base - hgt)
    pts = _form(img, bottle | cap | hoist | down | catcher | legs, shadow, body, rim)
    for k in range(1, 7):  # hoops
        t = k / 7
        y = int(base - hgt * t)
        for dx in range(int(-half_at(t)) + 2, int(half_at(t))):
            if (int(x) + dx, y) in pts:
                put(img, int(x) + dx, y, lit)
    for k in range(4, 30, 4):  # the hoist's lattice
        t = k / 30
        put(img, int(x + 31 + (w2 + 2 - 31) * t), int(base + (-hgt - 1) * t) + 1, rim)
    if g.torment:
        return
    _glow(img, x, base - 3, 12, lit, lit, only=pts)
    _mouth(img, x, base, 9, 8, g)
    for dx in (-8, -4, 4, 8):  # tuyeres round the belly
        put(img, int(x) + dx, int(base - hgt * 0.26), mid)
        put(img, int(x) + dx, int(base - hgt * 0.26) + 1, edge)
    for bx, by in ((x - 1.5, base - hgt - 10), (x + 2.5, base - hgt - 13)):  # bleeders flaring
        put(img, int(bx), int(by), bright)
        put(img, int(bx), int(by) - 1, mid)
        put(img, int(bx) + 1, int(by) - 2, edge)


def _wheel(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """The great wheel that drives the bellows, on its frame, with a shed at its foot."""
    shadow, body, lit, rim = g.forge
    cy, r = base - 19, 16.0
    shape = ring(x, cy, r, r - 3.2) | circle(x, cy, 3.4) | capsule(x, cy, x - 13, base, 1.8) | capsule(x, cy, x + 13, base, 1.8) | rect(x - 16, base - 3, x + 16, base)
    spokes = 8
    for k in range(spokes):
        a = math.tau * k / spokes + 0.2
        if g.torment and k in (1, 2):
            continue
        shape = shape | capsule(x, cy, x + math.cos(a) * (r - 1), cy + math.sin(a) * (r - 1), 1.0)
        shape = shape | capsule(x + math.cos(a) * r, cy + math.sin(a) * r, x + math.cos(a) * (r + 2.8), cy + math.sin(a) * (r + 2.8), 1.6)
    if g.torment:
        shape = shape - polygon([(x, cy), (x + 30, cy - 26), (x + 30, cy - 4)])
    _form(img, shape, shadow, body, rim, depth=1)
    put(img, int(x), int(cy), rim)


def _crane(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """A jib crane swinging a ladle of molten iron on a chain."""
    shadow, body, lit, rim = g.forge
    core, bright, mid, edge, halo = g.fire
    top = base - 46
    mast = rect(x - 2.5, top, x + 2.5, base) | rect(x - 5, base - 4, x + 5, base)
    jib_end = (x + 34.0, top - 5.0)
    jib = capsule(x, top + 4, jib_end[0], jib_end[1], 1.2) | capsule(x, top - 9, jib_end[0], jib_end[1], 0.6) | rect(x - 1.5, top - 10, x + 1.5, top)
    back = capsule(x, top + 3, x - 13, top + 1, 1.1) | rect(x - 17, top - 1, x - 10, top + 6) | capsule(x, top - 9, x - 13, top + 1, 0.6)
    if g.torment:
        jib_end = (x + 30.0, top + 22.0)  # the jib has dropped
        jib = capsule(x, top + 4, jib_end[0], jib_end[1], 1.2) | rect(x - 1.5, top - 10, x + 1.5, top)
    _form(img, mast | jib | back, shadow, body, rim, depth=1)
    for y in range(int(top) + 3, int(base) - 4, 5):  # bracing
        put(img, int(x) - 1, y, lit)
        put(img, int(x), y + 1, lit)
        put(img, int(x) + 1, y + 2, lit)
    if g.torment:
        return
    hang = 17
    for k in range(hang):
        put(img, int(jib_end[0]), int(jib_end[1]) + 1 + k, rim if k % 3 == 0 else body)
    lx, ly = jib_end[0], jib_end[1] + hang + 1
    ladle = polygon([(lx - 5, ly), (lx + 5, ly), (lx + 3.5, ly + 6.5), (lx - 3.5, ly + 6.5)]) | capsule(lx - 5, ly, lx, ly - 4, 0.5) | capsule(lx + 5, ly, lx, ly - 4, 0.5)
    _form(img, ladle, shadow, body, rim, depth=1)
    for dx in range(-4, 5):
        put(img, int(lx) + dx, int(ly), bright if abs(dx) < 3 else mid)
    put(img, int(lx), int(ly) - 1, core)
    for k in range(1, 5):  # it drips
        put(img, int(lx) + 4, int(ly) + 6 + k * 2, mid if k < 3 else edge)


def _shed(img: Image.Image, x: float, base: float, wid: float, g: Grade, rng: random.Random) -> None:
    """A casting shed: saw-tooth roof, a row of arched windows burning from inside, a great door."""
    shadow, body, lit, rim = g.forge
    core, bright, mid, edge, halo = g.fire
    hgt = 15.0
    shape = rect(x - wid / 2, base - hgt, x + wid / 2, base)
    teeth = int(wid // 11)
    for k in range(teeth):
        x0 = x - wid / 2 + k * wid / teeth
        if g.torment and k == teeth // 2:
            continue
        shape = shape | polygon([(x0, base - hgt), (x0 + wid / teeth, base - hgt), (x0, base - hgt - 7)])
    if g.torment:
        shape = shape - polygon([(x - 2, base - hgt - 8), (x + 5, base - hgt - 8), (x + 1, base - 6), (x - 3, base - 6)])
    pts = _form(img, shape, shadow, body, rim)
    if g.torment:
        return
    n = int(wid // 8)
    for k in range(n):
        wx = int(x - wid / 2 + 4 + k * (wid - 8) / max(1, n - 1))
        for dy in range(5):
            for dx in (0, 1):
                put(img, wx + dx, int(base) - 5 - dy, core if dy < 2 and k % 2 == 0 else bright if dy < 3 else mid)
        put(img, wx, int(base) - 10, edge)
        put(img, wx + 1, int(base) - 10, edge)
        put(img, wx - 1, int(base) - 6, lit)
        put(img, wx + 2, int(base) - 6, lit)
    for dy in range(1, 4):  # firelight low on the wall
        for dx in range(int(-wid / 2) + 1, int(wid / 2)):
            if (int(x) + dx, int(base) - dy) in pts and (dx + dy) % 3:
                put(img, int(x) + dx, int(base) - dy, lit)


def _pipe_run(img: Image.Image, x0: float, x1: float, y: float, base_fn, g: Grade) -> None:
    """A pipe on trestles, with flanges."""
    shadow, body, lit, rim = g.forge
    shape = rect(x0, y - 1.5, x1, y + 1.5)
    xs = [x0 + 6 + k * 15 for k in range(int((x1 - x0 - 6) // 15) + 1)]
    for tx in xs:
        shape = shape | rect(tx - 0.5, y, tx + 0.5, base_fn(tx) + 2) | capsule(tx - 3, base_fn(tx) + 2, tx, y + 5, 0.5) | capsule(tx + 3, base_fn(tx) + 2, tx, y + 5, 0.5)
    _form(img, shape, shadow, body, rim, depth=1)
    for k in range(int(x0) + 4, int(x1), 9):
        put(img, k, int(y), lit)
        put(img, k, int(y) + 1, lit)


def forges(g: Grade, rng: random.Random) -> Image.Image:
    """The works: two blast furnaces, clusters of stacks, the great wheel, a crane, casting sheds, pipes and slag."""
    img = blank(W, H)
    shadow, body, lit, rim = g.forge
    core, bright, mid, edge, halo = g.fire
    f = periodic(W, rng, [(1, 1.4), (3, 1.6), (6, 0.8)])
    contour = lambda x: 102 + f(x)  # noqa: E731
    base = lambda x: contour(x) + 2  # noqa: E731
    # Slag heaps behind everything, a glowing rivulet down some of them.
    for i in range(11):
        x = i * W / 11 + rng.uniform(-18, 18)
        hgt = rng.uniform(7, 15)
        heap = polygon([(x - hgt * 1.7, base(x)), (x - hgt * 0.5, base(x) - hgt * 0.8), (x - hgt * 0.1, base(x) - hgt), (x + hgt * 0.4, base(x) - hgt * 0.7), (x + hgt * 1.6, base(x))])
        pts = _form(img, heap, shadow, body, rim, depth=1)
        if not g.torment and i % 2 == 0:
            hx, hy = x - hgt * 0.1, base(x) - hgt + 1
            while (int(hx), int(hy)) in pts:
                put(img, int(hx), int(hy), mid if hy < base(x) - hgt * 0.5 else edge)
                hy += 1
                hx += rng.choice((0, 1, 1))
    _pipe_run(img, 236, 330, contour(280) - 12, base, g)
    _pipe_run(img, 500, 566, contour(530) - 17, base, g)
    # Stacks, in clusters of different heights.
    for x0, specs in ((34, ((0, 50, 7), (11, 36, 6), (-10, 28, 5))), (346, ((0, 44, 6), (9, 60, 7))), (566, ((0, 40, 6), (-10, 56, 7), (10, 30, 5)))):
        for dx, hgt, wid in specs:
            _stack(img, x0 + dx, base(x0 + dx), hgt, wid, g, rng)
        _form(img, rect(x0 - 16, base(x0) - 9, x0 + 16, base(x0)), shadow, body, rim)
        if not g.torment:
            for k in range(-2, 3):
                put(img, int(x0 + k * 6), int(base(x0)) - 5, bright if k % 2 == 0 else mid)
                put(img, int(x0 + k * 6), int(base(x0)) - 4, mid)
    _blast_furnace(img, 122, base(122), 52, g, rng)
    _blast_furnace(img, 462, base(462), 44, g, rng)
    _wheel(img, 212, base(212), g, rng)
    _shed(img, 286, base(286), 46, g, rng)
    _crane(img, 388, base(388), g, rng)
    _shed(img, 22 + W - 76, base(546), 34, g, rng)
    fill_below(img, contour, body, rim, y_end=118)
    # The ground of the works is lit by the river in front of it.
    for x in range(W):
        top = int(round(contour(x)))
        for y in range(top + 1, 118):
            put(img, x, y, lit if y < top + 3 else g.crust[1] if (not g.torment and y == top + 3 and x % 3) else lit)
    # The fighters stand in front of the foot of the works. Heat (or ash) off the river hazes it: from above
    # their heads down, the darks lift and the rims soften in three steps, and no fire in that band stays brighter
    # than a glow, so a figure — dark or pale — keeps its whole silhouette.
    shade, hazed, soft = g.haze
    px = img.load()
    step1 = {shadow: body}
    step2 = {shadow: body, body: lit, core: bright}
    step3 = {shadow: shade, body: hazed, lit: hazed, rim: soft, core: mid, bright: mid, mid: edge}
    for y in range(78, 118):
        table = step1 if y < 84 else step2 if y < 90 else step3
        for x in range(W):
            r, gr, b_, a = px[x, y]
            if a and (r, gr, b_) in table:
                px[x, y] = (*table[(r, gr, b_)], 255)
    return img


def ash(g: Grade, rng: random.Random) -> Image.Image:
    """A thin drift of ash, and in Normal a few embers with little tails. Most of what is in the air is not
    painted here any more: it is the strip's particles (see ATMOSPHERE), so it falls and rises for real."""
    img = blank(W, H)
    core, bright, mid, edge, halo = g.fire
    for _ in range(36):
        x, y = rng.randrange(W), rng.randrange(6, 116)
        put(img, x, y, g.flecks[0] if rng.random() < 0.5 else g.flecks[1])
    if g.torment:
        return img
    for _ in range(14):
        x, y = rng.randrange(W), int(86 - 76 * rng.random() ** 1.6)  # kept above the fighters' heads
        put(img, x, y, mid)
        if rng.random() < 0.6:
            put(img, x - 1, y + 1, edge)
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The river of lava with its crust plates, the slag bank and its chained bollards, the path of ash and iron
    plates, and below it cooled crust split by glowing cracks, with scrap half buried in the ash."""
    img = blank(W, H)
    px = img.load()
    core, bright, mid, edge, halo = g.fire
    crust, lip = g.crust
    dark_p, path, light_p = g.path
    light_a, body_a, deep_a, pit = g.ash
    f = periodic(W, rng, [(2, 1.0), (5, 0.7), (9, 0.4)])
    b = periodic(W, rng, [(3, 0.9), (7, 0.6), (13, 0.4)])
    top = [int(round(104 + f(x))) for x in range(W)]
    bank = [int(round(113 + b(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    for x in range(W):
        # The flow: white-hot down its middle, cooling to red at the banks.
        for y in range(top[x], bank[x]):
            t = (y - top[x]) / max(1, bank[x] - top[x] - 1)
            if g.torment:
                # Crusted over and buried in ash: a dull grey field (the seams are drawn below).
                px[x, y] = (*body_a, 255)
            else:
                # Hot along the far bank only: the near half, where the fighters' legs stand, is a flat red glow.
                px[x, y] = (*dither_pick([edge, mid, bright, mid, edge, halo, halo, halo], t, x, y, blend=0.2), 255)
        px[x, top[x]] = (*lip, 255)
        # The near bank: slag, its lip lit by the flow (or dusted with ash).
        for y in range(bank[x], path_top):
            if g.torment:  # ash lies over the bank too: one pale field from the far shore to the path
                px[x, y] = (*(lip if y == bank[x] and x % 3 else body_a), 255)
            else:
                px[x, y] = (*(lip if y == bank[x] else halo if y == bank[x] + 1 and x % 2 else crust), 255)
        for y in range(path_top, path_bot + 1):
            t = (y - path_top) / (path_bot - path_top)
            px[x, y] = (*dither_pick([light_p, path, path, dark_p], t, x, y), 255)
        for y in range(path_bot + 1, H):
            t = (y - path_bot) / (H - path_bot)
            px[x, y] = (*dither_pick([body_a, deep_a, deep_a, pit], t, x, y), 255)
    if g.torment:
        # Drifts of ash on the crust, the cracks between its plates, and the cold light in a few of them: thin,
        # long, far apart.
        for _ in range(60):
            x = rng.randrange(W)
            y = rng.randint(top[x] + 1, bank[x] - 1)
            for k in range(rng.randint(3, 10)):
                if top[(x + k) % W] < y < bank[(x + k) % W]:
                    put(img, x + k, y, _c("bone", 2) if y < (top[x] + bank[x]) // 2 else _c("bone", 0))
        for i in range(9):
            x, y = float(i * W / 9 + rng.uniform(-12, 12)), float(rng.randint(105, 108))
            lit_from = rng.randint(4, 14) if i % 3 == 0 else 10 ** 6
            for k in range(rng.randint(26, 54)):
                xi, yi = int(x) % W, int(y)
                if top[xi] < yi < bank[xi]:
                    seam = lit_from <= k < lit_from + 16
                    put(img, xi, yi, (core if k % 5 == 2 else bright) if seam else crust)
                    if seam:
                        put(img, xi, yi + 1, edge)
                x += 1.0
                y += rng.choice((-0.5, 0.0, 0.0, 0.0, 0.5))
    else:
        # Plates of crust riding the flow, thick along the far bank, with glowing edges; white streaks between them.
        for _ in range(22):
            x = rng.randrange(W)
            y = rng.uniform(top[x] + 1.5, (top[x] + bank[x]) / 2 + 1.0)
            plate = _pixels(ellipse(x, y, rng.uniform(3, 8), rng.uniform(0.9, 1.4)))
            for (a, c) in plate:
                if top[a % W] < c < bank[a % W]:
                    put(img, a, c, edge if (a, c - 1) not in plate else crust)
        for _ in range(16):
            x = rng.randrange(W)
            y = (3 * top[x] + bank[x]) // 4 + min(0, rng.randint(-1, 1))  # the white streaks keep to the far shore
            for k in range(rng.randint(4, 12)):
                put(img, x + k, y, core)
    # Jagged slag standing on the bank, black against the flow: a few, and low, so the legs in front stay clear.
    for _ in range(10):
        x = rng.randrange(W)
        hgt = rng.uniform(3, 6.5)
        spike = polygon([(x - rng.uniform(2, 4.5), bank[x] + 2), (x + rng.uniform(-1.5, 1.5), bank[x] - hgt), (x + rng.uniform(2, 4.5), bank[x] + 2)])
        _form(img, spike, crust, crust, lip, depth=1)
    # Bollards along the far edge of the path, a chain slung from one to the next.
    posts = [i + 16 for i in range(0, W, 50)]
    for k, fx in enumerate(posts):
        if g.torment and k % 4 == 2:
            continue
        post = rect(fx - 1.5, path_top - 11, fx + 1.5, path_top + 1) | rect(fx - 2.5, path_top - 12.5, fx + 2.5, path_top - 10.5)
        _form(img, post, g.iron[0], g.iron[1], lip, depth=1)
    for k, fx in enumerate(posts):
        if g.torment and k % 4 in (1, 2):
            continue
        for d in range(4, 47):
            t = d / 50
            y = path_top - 9 + 5.0 * 4 * t * (1 - t)
            put(img, fx + d, int(y), g.iron[1] if d % 3 == 0 else g.iron[0])  # dark links: nothing bright at leg height
    # The path: packed ash, pebbles of clinker, and iron plates laid over the worst of it.
    for _ in range(80):
        x, y = rng.randrange(W), rng.randrange(path_top + 1, path_bot)
        put(img, x, y, light_p)
        put(img, x + 1, y, dark_p)
    for i in range(0, W, 75):
        x0 = i + rng.randint(4, 30)
        wid = rng.randint(20, 32)
        y0, y1 = path_top + 2, path_bot - 2
        for x in range(x0, x0 + wid):
            for y in range(y0, y1 + 1):
                put(img, x, y, g.plate[2] if y == y0 else g.plate[0] if y == y1 else g.plate[1])
        for rx_, ry in ((x0 + 1, y0 + 2), (x0 + wid - 2, y0 + 2), (x0 + 1, y1 - 2), (x0 + wid - 2, y1 - 2)):
            put(img, rx_, ry, g.plate[2])
            put(img, rx_, ry + 1, g.plate[0])
        for x in range(x0, x0 + wid):
            if rng.random() < 0.5:
                put(img, x, y1 + 1, dark_p)
    _below(img, g, rng, path_bot)
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([bank[0] + 3, rng.randrange(path_bot + 8, H - 4)]), rng)
    return img


def _below(img: Image.Image, g: Grade, rng: random.Random, path_bot: int) -> None:
    """The strip below the path: ash over slabs of cooled crust, the fire showing through a few long cracks, and
    what the forges threw away — cogs, an anvil, ingots still warm, chain."""
    core, bright, mid, edge, halo = g.fire
    light_a, body_a, deep_a, pit = g.ash
    shadow, iron, lit = g.iron
    # Ash lying in drifts, and the joints between the slabs under it.
    for _ in range(90):
        x = rng.randrange(W)
        y = int(path_bot + 3 + (H - path_bot - 3) * rng.random() ** 1.4)
        for k in range(rng.randint(3, 9)):
            put(img, x + k, y, light_a if y < path_bot + 12 else g.path[0])
    # A few long cracks with the fire in them: a bright seam, a red lip under it.
    for i in range(5):
        x, y = float(i * W / 5 + rng.uniform(-10, 40)), float(rng.randrange(path_bot + 8, H - 10))
        ang = rng.uniform(-0.25, 0.25)
        for k in range(rng.randint(36, 64)):
            put(img, int(x), int(y), core if k % 9 == 4 else bright if k % 5 != 4 else mid)
            put(img, int(x), int(y) + 1, edge)
            if k % 2:
                put(img, int(x), int(y) + 2, halo)
            x += 1.0
            y += math.sin(ang) + rng.choice((-0.5, 0.0, 0.0, 0.5))
            ang = max(-0.45, min(0.45, ang + rng.uniform(-0.25, 0.25)))
            if not (path_bot + 5 < y < H - 5):
                break
    # Cogs half buried: a thick toothed rim and a hub standing out of the ash.
    for i in range(4):
        x = i * W / 4 + rng.uniform(30, 100)
        cy = rng.uniform(path_bot + 17, H - 5)
        r = rng.uniform(11, 14)
        shape = ring(x, cy, r, r - 5.0) | circle(x, cy, 3.0)
        for k in range(14):
            a = math.tau * k / 14 + i * 0.4
            shape = shape | capsule(x + math.cos(a) * r, cy + math.sin(a) * r, x + math.cos(a) * (r + 2.2), cy + math.sin(a) * (r + 2.2), 1.5)
        shape = shape & rect(x - r - 5, 0, x + r + 5, cy - 2.0)
        _form(img, shape, shadow, iron, lit, depth=1)
        for dx in range(int(-r) - 6, int(r) + 7):  # the ash banked against it
            put(img, int(x) + dx, int(cy) - 2, light_a)
            if rng.random() < 0.5:
                put(img, int(x) + dx, int(cy) - 3, light_a)
    # An anvil on its block.
    for x in (150 + rng.uniform(-10, 10), 452 + rng.uniform(-10, 10)):
        y = rng.uniform(path_bot + 19, H - 8)
        anvil = (polygon([(x - 9, y - 10), (x + 6, y - 10), (x + 6, y - 6), (x - 5, y - 6)]) | polygon([(x + 6, y - 10), (x + 13, y - 8.5), (x + 6, y - 6.5)]) | rect(x - 3, y - 6, x + 3, y - 3)
                 | rect(x - 6, y - 3, x + 6, y) | rect(x - 8, y, x + 8, y + 4))
        _form(img, anvil, shadow, iron, lit, depth=1)
    # Ingots stacked where they were dropped — still warm unless the fires are out.
    for x in (64 + rng.uniform(-12, 12), 318 + rng.uniform(-12, 12), 548 + rng.uniform(-10, 10)):
        y = rng.uniform(path_bot + 12, H - 12)
        for dx, dy in ((0, 0), (8, 0), (4, -4)):
            bar = polygon([(x + dx - 3.5, y + dy), (x + dx + 3.5, y + dy), (x + dx + 2.5, y + dy - 3.6), (x + dx - 2.5, y + dy - 3.6)])
            if g.torment:
                _form(img, bar, shadow, iron, lit, depth=1)
            else:
                pts = _pixels(bar)
                for (a, c) in pts:
                    put(img, a, c, bright if (a, c - 1) not in pts else edge if (a, c + 1) not in pts else mid)
        if not g.torment:
            for dx in range(-5, 14):
                put(img, int(x) + dx, int(y) + 1, halo if dx % 3 else edge)
    # Lengths of chain lying in the ash.
    for _ in range(4):
        x, y = rng.uniform(0, W), rng.uniform(path_bot + 8, H - 6)
        ph = rng.uniform(0, 6)
        for k in range(rng.randint(24, 44)):
            cy = y + 2.2 * math.sin(k / 6.0 + ph)
            put(img, int(x + k), int(cy), lit if k % 4 < 2 else shadow)
            put(img, int(x + k), int(cy) + 1, shadow)
    # Clinker.
    for _ in range(12):
        x, y = rng.uniform(0, W), rng.uniform(path_bot + 6, H - 6)
        lump = polygon([(x - rng.uniform(2, 5), y + 2), (x - rng.uniform(0, 2), y - rng.uniform(2, 4)), (x + rng.uniform(1, 3), y - rng.uniform(1, 3)), (x + rng.uniform(3, 6), y + 2)])
        _form(img, lump, shadow, g.path[0], light_a, depth=1)


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Near-silhouettes sliding past below — an anvil on its stump with a hammer left on it, a great cog, a
    spill of slag, a heap of chain with a hook — and chains and a ladle hanging into the frame above."""
    img = blank(W, H)
    body, rim = g.fore
    base = H
    kinds = ("anvil", "slag", "cog", "chain", "slag")
    for i, kind in enumerate(kinds):
        x = i * W / len(kinds) + rng.uniform(20, 90)
        if kind == "anvil":
            shape = (rect(x - 11, base - 8, x + 11, base + 1) | rect(x - 7, base - 12, x + 7, base - 8) | rect(x - 4, base - 16, x + 4, base - 12)
                     | polygon([(x - 14, base - 23), (x + 10, base - 23), (x + 10, base - 16), (x - 8, base - 16)]) | polygon([(x + 10, base - 23), (x + 22, base - 20.5), (x + 10, base - 18)]))
        elif kind == "slag":
            shape = ellipse(x, base + 1, rng.uniform(16, 22), 6)
            for k in range(4):
                sx = x - 14 + k * 9 + rng.uniform(-2, 2)
                shape = shape | polygon([(sx - rng.uniform(4, 7), base + 1), (sx + rng.uniform(-2.5, 2.5), base - rng.uniform(10, 22)), (sx + rng.uniform(4, 7), base + 1)])
        elif kind == "cog":
            cy, r = base - 4, 16.0
            shape = ring(x, cy, r, r - 5.0) | circle(x, cy, 4.0)
            for k in range(10):
                a = math.tau * k / 10 + 0.15
                shape = shape | capsule(x + math.cos(a) * r, cy + math.sin(a) * r, x + math.cos(a) * (r + 3.6), cy + math.sin(a) * (r + 3.6), 2.2)
                if k % 2 == 0:
                    shape = shape | capsule(x, cy, x + math.cos(a) * (r - 3), cy + math.sin(a) * (r - 3), 1.3)
            shape = shape | ellipse(x, base + 1, 24, 4)
        else:
            shape = ellipse(x, base + 1, 19, 7) | ellipse(x - 3, base - 5, 10, 4.5) | ellipse(x + 4, base - 9, 6, 3.5)
            shape = shape | capsule(x + 7, base - 10, x + 14, base - 21, 1.3) | (ring(x + 14, base - 25, 4.6, 2.4) - rect(x + 6, base - 30, x + 13, base - 24))
        pts = _pixels(shape)
        for (a, c) in pts:
            put(img, a, c, rim if (a, c - 1) not in pts else body)
        if kind == "chain":
            for k in range(0, 34, 4):  # links catching the light
                put(img, int(x - 16 + k), int(base - 4 - 2.0 * math.sin(k / 5.0)), rim)
                put(img, int(x - 15 + k), int(base - 4 - 2.0 * math.sin(k / 5.0)), rim)
    # Chains with hooks hanging from above, and one ladle.
    for k in range(5):
        x = int(k * W / 5 + rng.uniform(10, 90))
        length = rng.randint(9, 20)
        for y in range(0, length):
            put(img, x + (1 if (y // 2) % 2 else 0), y, rim if y % 4 == 0 else body)
            put(img, x + (0 if (y // 2) % 2 else 1), y, body)
        if k == 3:
            ladle = polygon([(x - 6, length), (x + 8, length), (x + 6, length + 8), (x - 4, length + 8)]) | capsule(x - 6, length, x + 1, length - 5, 0.6) | capsule(x + 8, length, x + 1, length - 5, 0.6)
            pts = _pixels(ladle)
            for (a, c) in pts:
                put(img, a, c, rim if ((a, c + 1) not in pts or (a + 1, c) not in pts) else body)
        else:
            for dx, dy in ((0, 0), (0, 1), (0, 2), (1, 3), (2, 3), (3, 2), (3, 1)):
                put(img, x + dx, length + dy, body if dx < 3 else rim)
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("clouds", smoke, 0.04),
    ("far", far, 0.1),
    ("forges", forges, 0.28),
    ("mist", ash, 0.6),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


#: The weather, run in real time by the strip. Normal: embers climbing off the river and a little ash coming
#: down. Torment: the ash falls thick and grey, lightning moves inside the smoke lid (no bolt: a cold sheet of
#: light with the works black against it), the light stutters, and the cold seams breathe.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 34, "color": [hex_of(_c("brass", 6)), hex_of(_c("brass", 5)), hex_of(_c("crimson", 5))],
         "vx": 7, "vy": -24, "sway": 3, "alpha": 0.85, "ymax": 112, "front": False},
        {"fx": "particles", "count": 26, "color": [hex_of(_c("bone", 4)), hex_of(_c("bone", 2))], "vx": -9, "vy": 13, "sway": 4, "alpha": 0.5},
    ],
    "torment": [
        {"fx": "particles", "count": 84, "color": [hex_of(_c("bone", 5)), hex_of(_c("bone", 3)), hex_of(_c("ink", 6))],
         "vx": -13, "vy": 27, "sway": 5, "alpha": 0.55},
        {"fx": "lightning", "every": [3800, 9500], "flash": hex_of(_c("azure", 8)), "alpha": 0.32, "shake": 1},
        {"fx": "flicker", "every": [2800, 7500], "dur": 260, "color": hex_of(_c("ink", 0)), "alpha": 0.28},
        {"fx": "pulse", "color": hex_of(_c("azure", 3)), "period": 4400, "alpha": 0.1},
    ],
}


def build(grade: str, seed: int = 808) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
